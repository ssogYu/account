import type { PinoLogger } from 'nestjs-pino';
import type { BillExtractionResult } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';

type FieldKey = keyof BillExtractionResult;

interface FieldMeta {
  key: FieldKey;
  /** 硬门槛：缺失直接 0 分 */
  critical?: boolean;
  /** 非硬门槛字段的权重 */
  weight?: number;
}

const ALL_FIELDS: FieldMeta[] = [
  { key: 'amount', critical: true },
  { key: 'type', critical: true },
  { key: 'category', critical: true },
  { key: 'paymentAccount', weight: 0.4 },
  { key: 'billDate', weight: 0.6 },
];

/**
 * 置信度评分节点（逐笔）
 *
 * 评分规则：
 * 1. amount / type / category 为硬门槛——任一缺失直接 0 分
 * 2. paymentAccount、billDate 按权重累加
 * 3. 阈值 0.7 在路由函数中判断（单笔高置信才自动入库）
 */
export function createConfidenceScorer(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBills = [], billOptions } = state;

    const billEvaluations = extractedBills.map((bill) =>
      evaluateBill(bill, billOptions),
    );

    const minConfidence = billEvaluations.reduce(
      (min, e) => Math.min(min, e.confidence),
      1,
    );

    logger.info(
      { count: billEvaluations.length, minConfidence },
      '置信度评估完成',
    );

    return {
      billEvaluations,
      confidence: minConfidence,
    };
  };
}

function evaluateBill(
  bill: BillExtractionResult,
  options?: GraphState['billOptions'],
): {
  confidence: number;
  missingFields: string[];
} {
  // 收集所有字段缺失情况
  const missingFields = ALL_FIELDS.filter(({ key }) => !isValid(bill, key)).map(
    ({ key }) => key,
  );

  // 校验 category 值是否在允许列表中（有值但不在列表内 → 视为无效）
  if (
    bill.category &&
    options?.categories?.length &&
    !options.categories.includes(bill.category)
  ) {
    missingFields.push('category');
  }

  // 校验 paymentAccount 值是否在允许列表中
  if (
    bill.paymentAccount &&
    options?.paymentAccounts?.length &&
    !options.paymentAccounts.includes(bill.paymentAccount)
  ) {
    missingFields.push('paymentAccount');
  }

  // 任一硬门槛缺失 → 0 分
  const hasCriticalMissing = ALL_FIELDS.some(
    ({ key, critical }) => critical && missingFields.includes(key),
  );

  if (hasCriticalMissing) {
    return { confidence: 0, missingFields };
  }

  // 仅加权字段参与计分
  const score = ALL_FIELDS.filter(
    (f): f is Required<FieldMeta> => f.weight !== undefined,
  ).reduce(
    (sum, { key, weight }) =>
      missingFields.includes(key) ? sum : sum + weight,
    0,
  );

  return { confidence: score, missingFields };
}

function isValid(bill: BillExtractionResult, field: FieldKey): boolean {
  if (field === 'amount') {
    return typeof bill.amount === 'number' && bill.amount > 0;
  }
  return typeof bill[field] === 'string' && (bill[field] as string).length > 0;
}
