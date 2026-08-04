import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DbService } from '../../infra/db/db.service';
import { AiService as InfraAiService } from '../../infra/ai/ai.service';
import { compileGraph } from './graph/bill-agent.graph';
import type { GraphState } from './graph/state';
import type { ChatDto } from './dto/chat.dto';
import type { ConfirmDto } from './dto/confirm.dto';
import { createBillRecord } from './graph/helpers/create-bill';
import { resolveCategoryId } from './graph/helpers/resolve-category';
import { resolvePaymentAccountId } from './graph/helpers/resolve-payment-account';

/** 注入 LLM 的历史消息条数上限（最近 10 轮对话） */
const HISTORY_LIMIT = 20;

interface PendingSession {
  extractedBill: GraphState['extractedBill'];
  assistantMessageId: string;
  userId: string;
  conversationId: string;
  createdAt: number;
}

@Injectable()
export class AiService {
  private readonly graph: ReturnType<typeof compileGraph>;
  private readonly sessions = new Map<string, PendingSession>();

  constructor(
    private readonly db: DbService,
    infraAiService: InfraAiService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('AiService');
    this.graph = compileGraph({ aiService: infraAiService, db, logger });
    this.logger.info('AI 记账图谱已编译');
  }

  // ---- 核心 ----

  async chat(userId: string, dto: ChatDto) {
    const conversationId = await this.resolveConversation(
      userId,
      dto.conversationId,
      dto.content,
    );

    const historyMessages = await this.loadHistory(conversationId);

    const startState: Partial<GraphState> = {
      userId,
      content: dto.content,
      conversationId,
      messages: historyMessages,
    };

    this.logger.info(
      { userId, conversationId, content: dto.content.slice(0, 50) },
      '开始 AI 对话',
    );

    const result = await this.graph.invoke(startState);

    // 存用户消息
    await this.db.message.create({
      data: { conversationId, role: 'user', content: dto.content },
    });

    // 存 AI 回复（所有状态统一存储）
    const assistantMsg = await this.db.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: result.reply ?? '',
        metadata: {
          status: result.status ?? null,
          ...(result.createdBill
            ? { createdBill: JSON.parse(JSON.stringify(result.createdBill)) }
            : {}),
        },
      },
    });

    // pending_confirm 时缓存，后续 confirm 会更新这条消息
    if (result.status === 'pending_confirm' && result.sessionId) {
      this.sessions.set(result.sessionId, {
        extractedBill: result.extractedBill,
        assistantMessageId: assistantMsg.id,
        userId,
        conversationId,
        createdAt: Date.now(),
      });
      this.cleanExpiredSessions();
    }

    const response: Record<string, unknown> = {
      status: result.status,
      reply: result.reply,
      conversationId,
    };
    if (result.sessionId) response.sessionId = result.sessionId;
    if (result.createdBill) response.createdBill = result.createdBill;
    if (result.confirmationCard)
      response.confirmationCard = result.confirmationCard;

    this.logger.info({ status: result.status, conversationId }, 'AI 对话完成');
    return response;
  }

  async confirm(userId: string, dto: ConfirmDto) {
    const session = this.sessions.get(dto.sessionId);

    if (!session) return { status: 'error', reply: '会话已过期，请重新记账' };
    if (session.userId !== userId)
      return { status: 'error', reply: '无权操作此会话' };

    if (!dto.confirm) {
      this.sessions.delete(dto.sessionId);
      this.logger.info({ sessionId: dto.sessionId }, '用户取消确认记账');
      return { status: 'cancelled', reply: '已取消，不记录该账单' };
    }

    const { extractedBill } = session;
    if (!extractedBill) {
      this.sessions.delete(dto.sessionId);
      return { status: 'error', reply: '账单数据丢失，请重新记账' };
    }
    if (typeof extractedBill.amount !== 'number' || extractedBill.amount <= 0) {
      this.sessions.delete(dto.sessionId);
      return { status: 'error', reply: '金额数据无效，请重新记账' };
    }

    const categoryId =
      dto.categoryId ??
      extractedBill.categoryId ??
      (await resolveCategoryId(this.db, userId, extractedBill.category));
    const paymentAccountId =
      dto.paymentAccountId ??
      extractedBill.paymentAccountId ??
      (await resolvePaymentAccountId(
        this.db,
        userId,
        extractedBill.paymentAccount,
      ));

    const bill = await createBillRecord(this.db, {
      userId,
      categoryId,
      paymentAccountId,
      type: extractedBill.type,
      amount: extractedBill.amount,
      billDate: extractedBill.billDate,
      note: extractedBill.note,
    });

    this.sessions.delete(dto.sessionId);
    this.logger.info({ billId: bill.id, amount: bill.amount }, '确认记账完成');

    const typeText = bill.type === 'expense' ? '支出' : '收入';
    const reply = `已记录：${typeText} ¥${String(bill.amount)}（${bill.category?.name ?? '其他'}）`;

    // 更新之前在 chat() 中存的 assistant 消息
    await this.db.message.update({
      where: { id: session.assistantMessageId },
      data: {
        content: reply,
        metadata: { status: 'created', createdBill: bill },
      },
    });

    return { status: 'created', reply, createdBill: bill };
  }

  // ---- 查询 ----

  async listConversations(userId: string) {
    return await this.db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: {
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });
  }

  async getMessages(userId: string, conversationId: string) {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('对话不存在');

    return this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new NotFoundException('对话不存在');

    await this.db.conversation.delete({ where: { id: conversationId } });
  }

  // ---- 私有 ----

  private async resolveConversation(
    userId: string,
    conversationId: string | undefined,
    firstMessage: string,
  ): Promise<string> {
    if (conversationId) {
      const c = await this.db.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!c) throw new NotFoundException('对话不存在');
      return conversationId;
    }
    const c = await this.db.conversation.create({
      data: { userId, title: firstMessage.slice(0, 100) },
    });
    return c.id;
  }

  private async loadHistory(conversationId: string): Promise<BaseMessage[]> {
    const recent = await this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    return recent
      .reverse()
      .map((m) =>
        m.role === 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      );
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    for (const [key, s] of this.sessions.entries()) {
      if (now - s.createdAt > 5 * 60 * 1000) this.sessions.delete(key);
    }
  }
}
