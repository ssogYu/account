import type { PinoLogger } from 'nestjs-pino';
import type { DbService } from '../../../../infra/db/db.service';
import type { GraphState, NodeUpdate } from '../state';

/**
 * 查询处理节点：根据用户查询意图分查询范围，支持今日/本月汇总与明细。
 */
export function createQueryHandler(db: DbService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    const { userId, content } = state;
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const lowerContent = content.toLowerCase();

    // 区分支出/收入关键词
    const wantExpense =
      lowerContent.includes('花') || lowerContent.includes('支出');
    const wantIncome =
      lowerContent.includes('收入') || lowerContent.includes('赚');

    if (lowerContent.includes('今天') || lowerContent.includes('今日')) {
      const whereForToday: Record<string, unknown> = {
        userId,
        billDate: { gte: startOfDay, lt: endOfDay },
        familyId: null,
      };
      if (wantExpense) whereForToday.type = 'expense';
      if (wantIncome) whereForToday.type = 'income';

      const bills = await db.bill.findMany({
        where: whereForToday,
        orderBy: { billDate: 'desc' },
        include: {
          category: { select: { name: true } },
        },
        take: 20,
      });

      const total = bills.reduce((sum, b) => sum + Number(b.amount), 0);
      const listText = bills
        .map(
          (b: {
            amount: unknown;
            type: string;
            category: { name: string };
          }) => {
            const prefix = b.type === 'expense' ? '支' : '收';
            return `[${prefix}] ${b.category.name} ¥${b.amount}`;
          },
        )
        .join('\n');

      const scopeLabel = wantExpense ? '支出' : wantIncome ? '收入' : '';
      return {
        status: 'replied',
        reply: `今日${scopeLabel}共 ${bills.length} 笔，合计 ¥${total}\n${listText || '暂无记录'}`,
      };
    }

    if (lowerContent.includes('月') || lowerContent.includes('本月')) {
      const whereForMonth: Record<string, unknown> = {
        userId,
        billDate: { gte: startOfMonth, lt: endOfMonth },
        familyId: null,
      };
      if (wantExpense) whereForMonth.type = 'expense';
      if (wantIncome) whereForMonth.type = 'income';

      const bills = await db.bill.findMany({
        where: whereForMonth,
        orderBy: { billDate: 'desc' },
        include: {
          category: { select: { name: true } },
        },
      });

      const total = bills.reduce((sum, b) => sum + Number(b.amount), 0);

      const scopeLabel = wantExpense ? '支出' : wantIncome ? '收入' : '';
      return {
        status: 'replied',
        reply: `本月${scopeLabel}共 ${bills.length} 笔账单，合计 ¥${total}`,
      };
    }

    // 默认：最近 10 条
    const bills = await db.bill.findMany({
      where: { userId, familyId: null },
      orderBy: { billDate: 'desc' },
      include: {
        category: { select: { name: true } },
      },
      take: 10,
    });

    const listText = bills
      .map(
        (b: {
          amount: unknown;
          billDate: Date;
          type: string;
          category: { name: string };
        }) => {
          const prefix = b.type === 'expense' ? '支' : '收';
          const d = new Date(b.billDate);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          return `[${prefix}] ${dateStr} ${b.category.name} ¥${b.amount}`;
        },
      )
      .join('\n');

    logger.info({ count: bills.length }, '查询处理完成');

    return {
      status: 'replied',
      reply: `最近账单：\n${listText || '暂无记录'}`,
    };
  };
}
