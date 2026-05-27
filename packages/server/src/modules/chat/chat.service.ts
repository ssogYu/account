import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SendMessageDto, QueryChatDto } from './dto';

/**
 * 对话记账服务
 *
 * 流程：用户发消息 → 本地关键词解析 → AI回复确认卡片（解析结果存metadata）→ 用户确认 → 创建账单入库
 *
 * 后续接入 LLM 后，将替换本地解析为 LangGraph.js 编排
 */

/** 解析结果结构 */
export interface ParseResult {
  type: 'expense' | 'income';
  amount: number;
  categoryName: string;
  categoryIcon: string;
  categoryId: string;
  note: string;
  date: string;
  confidence: 'high' | 'medium' | 'low';
}

/** AI消息的metadata结构 */
interface AssistantMetadata {
  type: 'confirm_card' | 'guide' | 'confirmed';
  parseResult?: ParseResult;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** 发送消息并返回AI回复 */
  async sendMessage(userId: string, dto: SendMessageDto) {
    // 1. 保存用户消息
    const userMessage = await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content: dto.content },
    });

    // 2. 本地关键词解析
    const parseResult = await this.localParse(userId, dto.content);

    // 3. 生成AI回复
    let assistantContent: string;
    let metadata: AssistantMetadata;

    if (parseResult) {
      // 解析成功 → 展示确认卡片（不创建账单，等用户确认）
      assistantContent = this.buildConfirmMessage(parseResult);
      metadata = { type: 'confirm_card', parseResult };
    } else {
      // 解析失败 → 引导用户
      assistantContent = this.buildGuideMessage(dto.content);
      metadata = { type: 'guide' };
    }

    // 4. 保存AI消息（解析结果存metadata，前端据此渲染确认卡片）
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: assistantContent,
        metadata: metadata as any,
      },
    });

    return {
      userMessage,
      assistantMessage,
      parseResult,
    };
  }

  /** 获取对话历史 */
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

    return {
      items: messages.reverse(),
      nextCursor,
    };
  }

  /** 确认账单（用户确认AI解析结果后，创建账单入库） */
  async confirmBill(
    userId: string,
    messageId: string,
    edits?: Partial<Pick<ParseResult, 'categoryId' | 'amount' | 'note'>>,
  ) {
    // 1. 找到AI消息，取出metadata中的解析结果
    const aiMessage = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, userId, role: 'assistant' },
    });

    if (!aiMessage || !aiMessage.metadata) {
      return { confirmed: false, message: '消息不存在或无解析结果' };
    }

    const meta = aiMessage.metadata as unknown as AssistantMetadata;
    if (meta.type !== 'confirm_card' || !meta.parseResult) {
      return { confirmed: false, message: '该消息不是确认卡片' };
    }

    const parse = { ...meta.parseResult, ...edits };

    // 2. 创建账单
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const bill = await this.prisma.bill.create({
      data: {
        userId,
        familyId: membership?.familyId ?? null,
        categoryId: parse.categoryId,
        type: parse.type,
        amount: parse.amount,
        note: parse.note,
        date: new Date(parse.date),
        source: 'ai',
      },
      include: { category: true },
    });

    // 3. 更新AI消息metadata为已确认
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        billId: bill.id,
        metadata: { type: 'confirmed', parseResult: parse } as any,
      },
    });

    // 4. 保存确认对话
    await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content: '确认', billId: bill.id },
    });

    const typeLabel = parse.type === 'expense' ? '支出' : '收入';
    await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: `已记录 ✓ ${parse.categoryName} ${typeLabel} ¥${parse.amount.toFixed(2)}`,
        billId: bill.id,
        metadata: { type: 'confirmed' } as any,
      },
    });

    return { confirmed: true, billId: bill.id, bill };
  }

  /** 拒绝/取消确认卡片 */
  async rejectBill(userId: string, messageId: string) {
    const aiMessage = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, userId, role: 'assistant' },
    });

    if (!aiMessage || !aiMessage.metadata) {
      return { rejected: false, message: '消息不存在' };
    }

    const meta = aiMessage.metadata as unknown as AssistantMetadata;
    if (meta.type !== 'confirm_card') {
      return { rejected: false, message: '该消息不是确认卡片' };
    }

    // 更新metadata标记为已取消
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: { ...meta, type: 'rejected' } as any,
      },
    });

    // 保存取消对话
    await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content: '取消' },
    });

    await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: '好的，已取消这笔记录。有需要随时告诉我。',
      },
    });

    return { rejected: true };
  }

  // ── 私有方法 ──

  /** 本地关键词解析（简易版，后续替换为LLM） */
  private async localParse(
    userId: string,
    content: string,
  ): Promise<ParseResult | null> {
    // 匹配金额
    let amount: number | null = null;

    // 模式1: 数字 + 单位（元/块/rmb/¥）
    const unitMatch = content.match(/(\d+\.?\d*)\s*(元|块|rmb|¥)/i);
    if (unitMatch) {
      amount = parseFloat(unitMatch[1]);
    }

    // 模式2: 动词 + 数字
    if (!amount) {
      const verbMatch = content.match(
        /(花了|花费|支出|收入|赚了|收到|付了|给了)\s*(\d+\.?\d*)/,
      );
      if (verbMatch) {
        amount = parseFloat(verbMatch[2]);
      }
    }

    // 模式3: 纯数字（需有上下文关键词）
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
        if (numMatch) {
          amount = parseFloat(numMatch[1]);
        }
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) return null;

    // 判断收支类型
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

    // 匹配分类（从数据库查询用户可用的分类）
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
    let categoryIcon = 'other_exp';
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((k) => content.includes(k))) {
        categoryName = cat;
        break;
      }
    }

    // 从数据库查找分类ID和图标
    const category = await this.prisma.category.findFirst({
      where: {
        name: categoryName,
        type,
        OR: [{ isSystem: true }, { userId }],
      },
    });

    let categoryId: string;
    if (category) {
      categoryId = category.id;
      categoryIcon = category.icon;
    } else {
      // 回退到"其他"分类
      const fallback = await this.prisma.category.findFirst({
        where: { name: '其他', type, isSystem: true },
      });
      if (!fallback) return null;
      categoryId = fallback.id;
      categoryIcon = fallback.icon;
      categoryName = '其他';
    }

    // 判断置信度
    const confidence = this.assessConfidence(content, amount, categoryName);

    // 判断日期
    let date = new Date().toISOString();
    if (content.includes('昨天')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString();
    } else if (content.includes('前天')) {
      const d = new Date();
      d.setDate(d.getDate() - 2);
      date = d.toISOString();
    }

    return {
      type,
      amount,
      categoryName,
      categoryIcon,
      categoryId,
      note: content,
      date,
      confidence,
    };
  }

  /** 评估解析置信度 */
  private assessConfidence(
    content: string,
    amount: number,
    categoryName: string,
  ): 'high' | 'medium' | 'low' {
    // 高置信度：金额明确 + 分类明确
    if (categoryName !== '其他' && amount > 0) {
      return 'high';
    }
    // 中置信度：金额明确但分类模糊
    if (amount > 0 && categoryName === '其他') {
      return 'medium';
    }
    return 'low';
  }

  private buildConfirmMessage(parse: ParseResult): string {
    const typeLabel = parse.type === 'expense' ? '支出' : '收入';
    const confidenceHint =
      parse.confidence === 'high'
        ? ''
        : parse.confidence === 'medium'
          ? '\n分类不太确定，请确认或修改。'
          : '\n请确认信息是否正确。';

    return `${parse.categoryName}\n${typeLabel} ¥${parse.amount.toFixed(2)}${confidenceHint}`;
  }

  private buildGuideMessage(_content: string): string {
    return `我还没理解你的意思 😅\n\n你可以这样告诉我：\n• "午饭花了25"\n• "打车15元"\n• "收到工资8000"\n• "奶茶18块"\n\n或者点击下方手动记账按钮直接填写。`;
  }
}
