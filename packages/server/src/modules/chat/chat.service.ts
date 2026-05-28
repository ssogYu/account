import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { LlmService } from '../llm';
import { SendMessageDto, QueryChatDto } from './dto';
import { createBillGraph } from './bill-graph';
import type { BillItem } from './bill-graph';
import type { Request } from 'express';

export interface ParseResult {
  type: 'expense' | 'income';
  amount: number;
  categoryName: string;
  categoryIcon: string;
  categoryId: string;
  note: string;
  date: string;
  accountName: string;
  accountId: string;
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
  needsConfirm?: boolean;
}

interface AssistantMetadata {
  type: 'confirm_card' | 'guide' | 'confirmed' | 'rejected';
  parseResults?: ParseResult[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto, req?: Request) {
    const aborted = { value: false };
    const onAbort = () => {
      aborted.value = true;
    };
    req?.on('close', onAbort);

    try {
      const userMessage = await this.prisma.chatMessage.create({
        data: { userId, role: 'user', content: dto.content },
      });

      const categories = await this.prisma.category.findMany({
        where: {
          OR: [{ isSystem: true }, { userId }],
        },
        select: { id: true, name: true, icon: true, type: true },
        orderBy: [{ isSystem: 'desc' }, { type: 'asc' }, { name: 'asc' }],
      });

      const categoriesJson = JSON.stringify(
        categories.map((c) => ({
          name: c.name,
          type: c.type,
          icon: c.icon,
          id: c.id,
        })),
      );

      const accounts = await this.prisma.account.findMany({
        where: {
          OR: [{ isSystem: true }, { userId }],
        },
        select: { id: true, name: true },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });

      const accountsJson = JSON.stringify(
        accounts.map((a) => ({ name: a.name, id: a.id })),
      );

      if (aborted.value) {
        return { userMessage, assistantMessage: null, parseResults: null };
      }

      const parseResults = await this.runBillGraph(
        userId,
        dto.content,
        categoriesJson,
        accountsJson,
      );

      if (aborted.value) {
        return { userMessage, assistantMessage: null, parseResults: null };
      }

      let assistantContent: string;
      let metadata: AssistantMetadata;
      let billIds: string[] = [];

      if (parseResults && parseResults.length > 0) {
        const needsConfirm = parseResults.some(
          (r) =>
            r.confidence !== 'high' ||
            !!r.warning ||
            !r.amount ||
            !r.categoryId ||
            !r.accountName,
        );

        if (needsConfirm) {
          assistantContent = this.buildConfirmMessage(parseResults);
          metadata = { type: 'confirm_card', parseResults };
        } else {
          const created = await this.createBillsFromParse(userId, parseResults);
          billIds = created.map((b) => b.id);
          const summary = this.buildAutoConfirmedSummary(parseResults);
          assistantContent = summary;
          metadata = { type: 'confirmed', parseResults };
        }
      } else {
        assistantContent = this.buildGuideMessage(dto.content);
        metadata = { type: 'guide' };
      }

      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          userId,
          role: 'assistant',
          content: assistantContent,
          metadata: metadata as any,
          ...(billIds.length > 0 ? { billId: billIds[0] } : {}),
        },
      });

      return { userMessage, assistantMessage, parseResults };
    } finally {
      req?.off('close', onAbort);
    }
  }

  private async runBillGraph(
    userId: string,
    input: string,
    categoriesJson: string,
    accountsJson: string,
  ): Promise<ParseResult[] | null> {
    try {
      const chatModel = this.llmService.getModel();
      const graph = createBillGraph(chatModel);
      const today = new Date().toISOString().split('T')[0];

      const result = await graph.invoke({
        input,
        userId,
        categoriesJson,
        accountsJson,
        parsed: false,
        bills: [],
        needsConfirm: true,
        error: '',
      });

      if (!result.parsed || result.bills.length === 0) {
        this.logger.log(`LangGraph: 解析失败或非记账意图 - input="${input}"`);
        return null;
      }

      const parseResults: ParseResult[] = result.bills.map((b: BillItem) => ({
        type: b.type ?? 'expense',
        amount: b.amount ?? 0,
        categoryName: b.categoryName || '其他',
        categoryIcon: b.categoryIcon || '',
        categoryId: b.categoryId || '',
        note: b.note || input,
        date: b.date || today,
        accountName: b.accountName || '',
        accountId: b.accountId || '',
        confidence: b.confidence,
        warning: b.warning || undefined,
        needsConfirm: result.needsConfirm,
      }));

      if (parseResults.length === 0) {
        this.logger.warn('LangGraph: 所有账单均缺少必要字段');
        return null;
      }

      return parseResults;
    } catch (err) {
      this.logger.error(
        `LangGraph 执行失败: ${err instanceof Error ? err.message : err}`,
      );
      return this.localParse(userId, input);
    }
  }

  private async createBillsFromParse(
    userId: string,
    parseResults: ParseResult[],
  ) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const bills = await Promise.all(
      parseResults.map((parse) =>
        this.prisma.bill.create({
          data: {
            userId,
            familyId: membership?.familyId ?? null,
            categoryId: parse.categoryId,
            type: parse.type,
            amount: parse.amount,
            note: parse.note,
            account: parse.accountName || null,
            date: new Date(parse.date),
            source: 'ai',
          },
          include: { category: true },
        }),
      ),
    );

    return bills;
  }

  async getHistory(userId: string, query: QueryChatDto) {
    const { limit = 50, cursor } = query;

    const where: Record<string, unknown> = { userId };
    if (cursor) {
      const cursorMsg = await this.prisma.chatMessage.findUnique({
        where: { id: cursor },
      });
      if (cursorMsg) {
        where.createdAt = { lt: cursorMsg.createdAt };
      }
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextItem = messages.pop()!;
      nextCursor = nextItem.id;
    }

    return { items: messages.reverse(), nextCursor };
  }

  async confirmBill(
    userId: string,
    messageId: string,
    billIndex: number,
    edits?: Partial<
      Pick<ParseResult, 'categoryId' | 'amount' | 'note' | 'accountName'>
    >,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const aiMessage = await tx.chatMessage.findFirst({
        where: { id: messageId, userId, role: 'assistant' },
      });

      if (!aiMessage || !aiMessage.metadata) {
        return { confirmed: false, message: '消息不存在或无解析结果' };
      }

      const meta = aiMessage.metadata as unknown as AssistantMetadata;
      if (meta.type !== 'confirm_card' || !meta.parseResults) {
        return { confirmed: false, message: '该消息不是确认卡片' };
      }

      const parseResults = [...meta.parseResults];

      if (billIndex < 0 || billIndex >= parseResults.length) {
        return { confirmed: false, message: '账单索引越界' };
      }

      const parse = { ...parseResults[billIndex] };

      if (edits?.categoryId && edits.categoryId !== parse.categoryId) {
        const updatedCategory = await tx.category.findUnique({
          where: { id: edits.categoryId },
          select: { name: true, icon: true },
        });
        if (updatedCategory) {
          parse.categoryName = updatedCategory.name;
          parse.categoryIcon = updatedCategory.icon;
          parse.categoryId = edits.categoryId;
        }
      }

      if (edits?.amount) parse.amount = edits.amount;
      if (edits?.note) parse.note = edits.note;

      if (edits?.accountName && edits.accountName !== parse.accountName) {
        const updatedAccount = await tx.account.findFirst({
          where: {
            name: edits.accountName,
            OR: [{ isSystem: true }, { userId }],
          },
          select: { id: true, name: true },
        });
        if (updatedAccount) {
          parse.accountName = updatedAccount.name;
          parse.accountId = updatedAccount.id;
        } else {
          parse.accountName = edits.accountName;
          parse.accountId = '';
        }
      }

      parse.needsConfirm = false;
      parseResults[billIndex] = parse;

      const membership = await tx.familyMember.findFirst({
        where: { userId },
        select: { familyId: true },
      });

      const bill = await tx.bill.create({
        data: {
          userId,
          familyId: membership?.familyId ?? null,
          categoryId: parse.categoryId,
          type: parse.type,
          amount: parse.amount,
          note: parse.note,
          account: parse.accountName || null,
          date: new Date(parse.date),
          source: 'ai',
        },
        include: { category: true },
      });

      const allConfirmed = parseResults.every((r) => !r.needsConfirm);
      const newType = allConfirmed ? 'confirmed' : 'confirm_card';

      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          billId: bill.id,
          metadata: {
            type: newType,
            parseResults,
          } as any,
        },
      });

      await tx.chatMessage.create({
        data: {
          userId,
          role: 'user',
          content: `确认第${billIndex + 1}笔`,
          billId: bill.id,
        },
      });

      return { confirmed: true, billId: bill.id, bill };
    });
  }

  async confirmAllBills(
    userId: string,
    messageId: string,
    edits?: Record<
      number,
      Partial<
        Pick<ParseResult, 'categoryId' | 'amount' | 'note' | 'accountName'>
      >
    >,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const aiMessage = await tx.chatMessage.findFirst({
        where: { id: messageId, userId, role: 'assistant' },
      });

      if (!aiMessage || !aiMessage.metadata) {
        return { confirmed: false, message: '消息不存在或无解析结果' };
      }

      const meta = aiMessage.metadata as unknown as AssistantMetadata;
      if (meta.type !== 'confirm_card' || !meta.parseResults) {
        return { confirmed: false, message: '该消息不是确认卡片' };
      }

      const parseResults = meta.parseResults.map((pr, i) => {
        const billEdits = edits?.[i];
        if (!billEdits) return { ...pr };
        return {
          ...pr,
          ...(billEdits.amount !== undefined
            ? { amount: billEdits.amount }
            : {}),
          ...(billEdits.note !== undefined ? { note: billEdits.note } : {}),
          ...(billEdits.categoryId !== undefined
            ? { categoryId: billEdits.categoryId }
            : {}),
          ...(billEdits.accountName !== undefined
            ? { accountName: billEdits.accountName }
            : {}),
        };
      });

      for (let i = 0; i < parseResults.length; i++) {
        const billEdits = edits?.[i];
        if (!billEdits) continue;
        const parse = parseResults[i];

        if (
          billEdits.categoryId &&
          billEdits.categoryId !== meta.parseResults[i].categoryId
        ) {
          const updatedCategory = await tx.category.findUnique({
            where: { id: billEdits.categoryId },
            select: { name: true, icon: true },
          });
          if (updatedCategory) {
            parse.categoryName = updatedCategory.name;
            parse.categoryIcon = updatedCategory.icon;
            parse.categoryId = billEdits.categoryId;
          }
        }

        if (
          billEdits.accountName &&
          billEdits.accountName !== meta.parseResults[i].accountName
        ) {
          const updatedAccount = await tx.account.findFirst({
            where: {
              name: billEdits.accountName,
              OR: [{ isSystem: true }, { userId }],
            },
            select: { id: true, name: true },
          });
          if (updatedAccount) {
            parse.accountName = updatedAccount.name;
            parse.accountId = updatedAccount.id;
          } else {
            parse.accountName = billEdits.accountName;
            parse.accountId = '';
          }
        }
      }

      const unconfirmedResults = parseResults.filter(
        (pr) => pr.needsConfirm !== false,
      );

      if (unconfirmedResults.length === 0) {
        return { confirmed: false, message: '没有待确认的账单' };
      }

      const membership = await tx.familyMember.findFirst({
        where: { userId },
        select: { familyId: true },
      });

      const bills = await Promise.all(
        unconfirmedResults.map((parse) =>
          tx.bill.create({
            data: {
              userId,
              familyId: membership?.familyId ?? null,
              categoryId: parse.categoryId,
              type: parse.type,
              amount: parse.amount,
              note: parse.note,
              account: parse.accountName || null,
              date: new Date(parse.date),
              source: 'ai',
            },
            include: { category: true },
          }),
        ),
      );

      const updatedParseResults = parseResults.map((pr) => ({
        ...pr,
        needsConfirm: false,
      }));

      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          billId: bills[0]?.id ?? null,
          metadata: {
            type: 'confirmed',
            parseResults: updatedParseResults,
          } as any,
        },
      });

      await tx.chatMessage.create({
        data: {
          userId,
          role: 'user',
          content: '全部确认',
        },
      });

      return {
        confirmed: true,
        billIds: bills.map((b) => b.id),
        bills,
      };
    });
  }

  async rejectBill(userId: string, messageId: string) {
    return this.prisma.$transaction(async (tx) => {
      const aiMessage = await tx.chatMessage.findFirst({
        where: { id: messageId, userId, role: 'assistant' },
      });

      if (!aiMessage || !aiMessage.metadata) {
        return { rejected: false, message: '消息不存在' };
      }

      const meta = aiMessage.metadata as unknown as AssistantMetadata;
      if (meta.type !== 'confirm_card') {
        return { rejected: false, message: '该消息不是确认卡片' };
      }

      await tx.chatMessage.update({
        where: { id: messageId },
        data: { metadata: { ...meta, type: 'rejected' } as any },
      });

      await tx.chatMessage.create({
        data: { userId, role: 'user', content: '取消' },
      });

      await tx.chatMessage.create({
        data: {
          userId,
          role: 'assistant',
          content: '好的，已取消这些记录。有需要随时告诉我。',
        },
      });

      return { rejected: true };
    });
  }

  private async localParse(
    userId: string,
    content: string,
  ): Promise<ParseResult[] | null> {
    const segments = this.splitMultiExpense(content);
    const results: ParseResult[] = [];

    for (const segment of segments) {
      const result = await this.parseSingleExpense(userId, segment);
      if (result) results.push(result);
    }

    return results.length > 0 ? results : null;
  }

  private splitMultiExpense(content: string): string[] {
    const separators = /[,，;；、\n]+/;
    const parts = content
      .split(separators)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) return [content];

    const hasAmount = (s: string) => /\d+\.?\d*/.test(s);
    return parts.every(hasAmount) ? parts : [content];
  }

  private async parseSingleExpense(
    userId: string,
    content: string,
  ): Promise<ParseResult | null> {
    let amount: number | null = null;

    const unitMatch = content.match(/(\d+\.?\d*)\s*(元|块|rmb|¥)/i);
    if (unitMatch) amount = parseFloat(unitMatch[1]);

    if (!amount) {
      const verbMatch = content.match(
        /(花了|花费|支出|收入|赚了|收到|付了|给了)\s*(\d+\.?\d*)/,
      );
      if (verbMatch) amount = parseFloat(verbMatch[2]);
    }

    if (!amount) {
      const contextKeywords = [
        '午饭',
        '晚饭',
        '早餐',
        '打车',
        '地铁',
        '奶茶',
        '咖啡',
        '外卖',
        '饭',
        '餐',
      ];
      if (contextKeywords.some((k) => content.includes(k))) {
        const numMatch = content.match(/(\d+\.?\d*)/);
        if (numMatch) amount = parseFloat(numMatch[1]);
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) return null;

    const incomeKeywords = [
      '收入',
      '赚了',
      '收到',
      '工资',
      '红包',
      '退款',
      '到账',
      '兼职',
    ];
    const type = incomeKeywords.some((k) => content.includes(k))
      ? 'income'
      : 'expense';

    const categoryMap: Record<string, string[]> = {
      餐饮: [
        '午饭',
        '晚饭',
        '早餐',
        '吃饭',
        '外卖',
        '奶茶',
        '咖啡',
        '零食',
        '火锅',
        '烧烤',
        '饭',
        '餐',
        '星巴克',
        '瑞幸',
        '麦当劳',
        '肯德基',
        '面',
        '粉',
      ],
      交通: [
        '打车',
        '地铁',
        '公交',
        '出租',
        '滴滴',
        '高铁',
        '火车',
        '飞机',
        '油费',
        '停车',
        '骑车',
        '摩的',
      ],
      购物: ['买了', '购物', '淘宝', '京东', '超市', '商场', '网购', '下单'],
      娱乐: [
        '电影',
        '游戏',
        'KTV',
        '唱歌',
        '旅游',
        '门票',
        '演出',
        '剧本杀',
        '密室',
      ],
      居住: ['房租', '水电', '物业', '网费', '燃气', '水费', '电费'],
      医疗: ['看病', '药', '医院', '体检', '挂号', '诊所'],
      教育: ['课程', '培训', '书', '学费', '网课'],
      通讯: ['话费', '流量', '充值', '月租'],
      服饰: ['衣服', '鞋', '包', '裤子', '外套', '裙子'],
      美容: ['理发', '美甲', '护肤', '化妆'],
      运动: ['健身', '跑步', '游泳', '瑜伽', '球'],
      工资: ['工资', '薪资', '薪水', '发工资'],
      理财: ['利息', '收益', '分红', '基金'],
      红包: ['红包', '转账', '微信转'],
    };

    let categoryName = '其他';
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((k) => content.includes(k))) {
        categoryName = cat;
        break;
      }
    }

    const category = await this.prisma.category.findFirst({
      where: { name: categoryName, type, OR: [{ isSystem: true }, { userId }] },
    });

    let categoryId: string;
    let categoryIcon: string;
    if (category) {
      categoryId = category.id;
      categoryIcon = category.icon;
    } else {
      const fallback = await this.prisma.category.findFirst({
        where: { name: '其他', type, isSystem: true },
      });
      if (!fallback) return null;
      categoryId = fallback.id;
      categoryIcon = fallback.icon;
      categoryName = '其他';
    }

    const confidence = amount > 0 ? 'medium' : 'low';

    let date = new Date().toISOString().split('T')[0];
    if (content.includes('昨天')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    } else if (content.includes('前天')) {
      const d = new Date();
      d.setDate(d.getDate() - 2);
      date = d.toISOString().split('T')[0];
    }

    return {
      type,
      amount,
      categoryName,
      categoryIcon,
      categoryId,
      note: content,
      date,
      accountName: '',
      accountId: '',
      confidence,
      needsConfirm: true,
    };
  }

  private buildConfirmMessage(parseResults: ParseResult[]): string {
    if (parseResults.length === 1) {
      const parse = parseResults[0];
      const typeLabel = parse.type === 'expense' ? '支出' : '收入';
      const confidenceHint =
        parse.confidence === 'medium'
          ? '\n分类待确认，请检查。'
          : parse.confidence === 'low'
            ? '\n信息可能不完整，请确认。'
            : '';
      const warningHint = parse.warning ? `\n⚠️ ${parse.warning}` : '';
      return `${parse.categoryName}\n${typeLabel} ¥${parse.amount.toFixed(2)}${confidenceHint}${warningHint}`;
    }

    const lines = parseResults.map((parse, i) => {
      const typeLabel = parse.type === 'expense' ? '支出' : '收入';
      return `${i + 1}. ${parse.categoryName} ${typeLabel} ¥${parse.amount.toFixed(2)}`;
    });
    const total = parseResults.reduce((sum, p) => sum + p.amount, 0);
    return `识别到 ${parseResults.length} 笔消费：\n${lines.join('\n')}\n合计 ¥${total.toFixed(2)}`;
  }

  private buildAutoConfirmedSummary(parseResults: ParseResult[]): string {
    if (parseResults.length === 1) {
      const parse = parseResults[0];
      const typeLabel = parse.type === 'expense' ? '支出' : '收入';
      return `已记录 ✓ ${parse.categoryName} ${typeLabel} ¥${parse.amount.toFixed(2)}`;
    }

    const lines = parseResults.map(
      (p) => `${p.categoryName} ¥${p.amount.toFixed(2)}`,
    );
    const total = parseResults.reduce((sum, p) => sum + p.amount, 0);
    return `已记录 ✓ ${lines.join('、')}，合计 ¥${total.toFixed(2)}`;
  }

  private buildGuideMessage(_content: string): string {
    return `我还没理解你的记账意图？\n\n你可以这样告诉我：\n• "午饭花了25"\n• "打车15元"\n• "午饭25，打车15，奶茶8"\n• "收到工资8000"\n\n直接描述你的消费，我会帮你自动识别。`;
  }
}
