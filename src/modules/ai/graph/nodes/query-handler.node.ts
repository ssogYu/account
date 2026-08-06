import type { PinoLogger } from 'nestjs-pino';
import type { DbService } from '../../../../infra/db/db.service';
import type { GraphState, NodeUpdate } from '../state';
import {
  formatDateTime,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from '../../../../common/utils/date';

interface BillRow {
  amount: number;
  type: string;
  billDate: Date;
  category: { name: string } | null;
}

/**
 * 查询处理节点：根据用户查询意图分查询范围，支持今日/本月汇总与明细。
 */
export function createQueryHandler(db: DbService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const { userId, content } = state;
      const today = new Date();
      const lowerContent = content.toLowerCase();

      const scope = resolveScope(lowerContent, today);
      const typeFilter = resolveTypeFilter(lowerContent);
      const scopeLabel =
        typeFilter === 'expense'
          ? '支出'
          : typeFilter === 'income'
            ? '收入'
            : '';

      const rawBills = await db.bill.findMany({
        where: {
          userId,
          familyId: null,
          ...scope.where,
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        orderBy: { billDate: 'desc' as const },
        include: { category: { select: { name: true } } },
        ...(scope.take > 0 ? { take: scope.take } : {}),
      });

      const bills: BillRow[] = rawBills.map((b) => ({
        amount: Number(b.amount),
        type: b.type,
        billDate: b.billDate,
        category: b.category,
      }));

      const total = bills.reduce((sum, b) => sum + b.amount, 0);

      logger.info({ count: bills.length, scope: scope.label }, '查询处理完成');

      return {
        status: 'replied' as const,
        reply: scope.formatReply(bills, total, scopeLabel),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      const name = error instanceof Error ? error.name : 'UnknownError';
      logger.error({ error: message, errorType: name }, '查询处理失败');
      return {
        status: 'replied' as const,
        reply: '查询账单时出现问题，请稍后重试',
        error: message,
      };
    }
  };
}

// ---- 时间范围解析 ----

interface QueryScope {
  label: string;
  where: { billDate?: { gte: Date; lt: Date } };
  take: number;
  formatReply: (bills: BillRow[], total: number, scopeLabel: string) => string;
}

function resolveScope(content: string, today: Date): QueryScope {
  if (content.includes('今天') || content.includes('今日')) {
    return {
      label: 'today',
      where: { billDate: { gte: startOfDay(today), lt: endOfDay(today) } },
      take: 20,
      formatReply: (bills, total, scopeLabel) => {
        const listText = bills
          .map((b) => {
            const prefix = b.type === 'expense' ? '支' : '收';
            const catName = b.category?.name ?? '未分类';
            return `[${prefix}] ${catName} ¥${b.amount}`;
          })
          .join('\n');
        const label = scopeLabel ? `今日${scopeLabel}` : '今日';
        return `${label}共 ${bills.length} 笔，合计 ¥${total}\n${listText || '暂无记录'}`;
      },
    };
  }

  if (
    content.includes('本月') ||
    (!content.includes('上') && content.includes('月'))
  ) {
    return {
      label: 'month',
      where: {
        billDate: { gte: startOfMonth(today), lt: endOfMonth(today) },
      },
      take: 0,
      formatReply: (bills, total, scopeLabel) => {
        const label = scopeLabel ? `本月${scopeLabel}` : '本月';
        return `${label}共 ${bills.length} 笔账单，合计 ¥${total}`;
      },
    };
  }

  // 默认：最近 10 条
  return {
    label: 'recent',
    where: {},
    take: 10,
    formatReply: (bills, _total, _scopeLabel) => {
      const listText = bills
        .map((b) => {
          const prefix = b.type === 'expense' ? '支' : '收';
          const dateStr = formatDateTime(b.billDate);
          const catName = b.category?.name ?? '未分类';
          return `[${prefix}] ${dateStr} ${catName} ¥${b.amount}`;
        })
        .join('\n');
      return `最近账单：\n${listText || '暂无记录'}`;
    },
  };
}

// ---- 类型过滤解析 ----

function resolveTypeFilter(content: string): 'expense' | 'income' | null {
  const wantExpense = content.includes('花') || content.includes('支出');
  const wantIncome = content.includes('收入') || content.includes('赚');

  if (wantExpense && wantIncome) return null;
  if (wantExpense) return 'expense';
  if (wantIncome) return 'income';
  return null;
}
