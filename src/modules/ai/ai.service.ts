import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DbService } from '../../infra/db/db.service';
import { AiService as InfraAiService } from '../../infra/ai/ai.service';
import { FamilyService } from '../family/family.service';
import { compileGraph } from './graph/bill-agent.graph';
import type { GraphState } from './graph/state';
import type { BillExtractionResult } from './schemas/extraction.schema';
import type { ChatDto } from './dto/chat.dto';
import type { ConfirmDto } from './dto/confirm.dto';
import { createBillRecord } from './graph/helpers/create-bill';
import { resolveCategoryId } from './graph/helpers/resolve-category';
import { resolvePaymentAccountId } from './graph/helpers/resolve-payment-account';
import { buildBillReply } from './graph/helpers/format-bill-reply';
import { parseDateTime, now } from '../../common/utils/date';

/** 注入 LLM 的历史消息条数上限（最近 10 轮对话） */
const HISTORY_LIMIT = 20;

@Injectable()
export class AiService {
  private readonly graph: ReturnType<typeof compileGraph>;

  constructor(
    private readonly db: DbService,
    infraAiService: InfraAiService,
    private readonly familyService: FamilyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('AiService');
    this.graph = compileGraph({
      aiService: infraAiService,
      db,
      familyService,
      logger,
    });
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
    await this.db.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: result.reply ?? '',
        metadata: {
          status: result.status ?? null,
          ...(result.createdBill
            ? { createdBill: JSON.parse(JSON.stringify(result.createdBill)) }
            : {}),
          ...(result.createdBills?.length
            ? {
                createdBills: JSON.parse(JSON.stringify(result.createdBills)),
              }
            : {}),
        },
      },
    });

    const response: Record<string, unknown> = {
      status: result.status,
      reply: result.reply,
      conversationId,
    };
    if (result.sessionId) response.sessionId = result.sessionId;
    if (result.createdBill) response.createdBill = result.createdBill;
    if (result.createdBills) response.createdBills = result.createdBills;
    if (result.confirmationCards)
      response.confirmationCards = result.confirmationCards;

    this.logger.info({ status: result.status, conversationId }, 'AI 对话完成');
    return response;
  }

  /**
   * 确认记账（无状态设计）：
   * 前端从 confirmationCard 中取内嵌的 bill 数据回传，
   * 服务端用编辑值覆盖原始提取值后直接创建账单，不依赖任何会话缓存。
   */
  async confirm(userId: string, dto: ConfirmDto) {
    if (!dto.confirm) {
      this.logger.info({ userId }, '用户取消确认记账');
      if (dto.conversationId) {
        await this.db.message.create({
          data: {
            conversationId: dto.conversationId,
            role: 'assistant',
            content: '已取消，不记录该账单',
            metadata: { status: 'cancelled' },
          },
        });
      }
      return { status: 'cancelled', reply: '已取消，不记录该账单' };
    }

    const bill = dto.bill as BillExtractionResult | undefined;
    if (!bill) {
      return { status: 'error', reply: '账单数据丢失，请重新记账' };
    }

    // 前端编辑值覆盖 AI 提取值
    const amount = dto.amount ?? bill.amount;
    const type = ['expense', 'income'].includes(dto.type ?? '')
      ? (dto.type as 'expense' | 'income')
      : (bill.type ?? 'expense');
    const nowStr = now();
    const billDate = dto.billDate
      ? (parseDateTime(dto.billDate) ?? nowStr)
      : (bill.billDate ?? nowStr);

    if (typeof amount !== 'number' || amount <= 0) {
      return { status: 'error', reply: '金额数据无效，请重新记账' };
    }

    const categoryId =
      dto.categoryId ??
      bill.categoryId ??
      (await resolveCategoryId(this.db, userId, bill.category ?? undefined, this.familyService));
    const paymentAccountId =
      dto.paymentAccountId ??
      bill.paymentAccountId ??
      (await resolvePaymentAccountId(
        this.db,
        userId,
        bill.paymentAccount ?? undefined,
        this.familyService,
      ));

    const created = await createBillRecord(
      this.db,
      {
        userId,
        categoryId,
        paymentAccountId,
        type,
        amount,
        billDate,
        note: dto.note ?? bill.note,
      },
      this.familyService,
    );

    this.logger.info(
      { billId: created.id, amount: created.amount },
      '确认记账完成',
    );

    const reply = buildBillReply([created as Record<string, unknown>]);

    // 存入对话消息记录，保证历史对话中能看到确认结果
    if (dto.conversationId) {
      await this.db.message.create({
        data: {
          conversationId: dto.conversationId,
          role: 'assistant',
          content: reply,
          metadata: { status: 'created', createdBill: created },
        },
      });
    }

    return { status: 'created', reply, createdBill: created };
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
}
