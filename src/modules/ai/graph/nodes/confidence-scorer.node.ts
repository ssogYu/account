import type { PinoLogger } from 'nestjs-pino';
import type { BillExtractionResult } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';

/**
 * 字段权重分配（总和 = 1.0）：
 *   - 分类、类型 —— 用户明确要求，权重最高
 *   - 支付账户 —— 重要但可缺省
 *   - 日期 —— AI 默认填"今天"，权重较低
 *   - 金额 —— 作为硬门槛单独判断，不参与权重累加
 *   - 备注 —— 不影响置信度
 */
const FIELD_CHECKS: {
  key: keyof BillExtractionResult;
  weight: number;
}[] = [
  { key: 'type', weight: 0.3 },
  { key: 'category', weight: 0.3 },
  { key: 'paymentAccount', weight: 0.25 },
  { key: 'billDate', weight: 0.15 },
];

/**
 * 置信度评分节点（逐笔）
 *
 * 评分规则：
 * 1. amount 为硬门槛——无效时直接 0 分
 * 2. 其余 4 个字段按权重累加
 * 3. 阈值 0.7 在路由函数中判断（单笔高置信才自动入库）
 */
export function createConfidenceScorer(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBills = [] } = state;

    const billEvaluations = extractedBills.map((bill) => evaluateBill(bill));

    // 路由依据：单笔时用该笔置信度，多笔时取最低（多笔始终走确认，此处仅供展示）
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

function evaluateBill(bill: BillExtractionResult): {
  confidence: number;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  // 硬门槛：金额必须有效
  if (typeof bill.amount !== 'number' || bill.amount <= 0) {
    missingFields.push('amount');
    for (const { key } of FIELD_CHECKS) {
      if (!isFieldValid(key, bill)) missingFields.push(key);
    }
    return { confidence: 0, missingFields };
  }

  let score = 0;
  for (const { key, weight } of FIELD_CHECKS) {
    if (isFieldValid(key, bill)) {
      score += weight;
    } else {
      missingFields.push(key);
    }
  }

  return { confidence: score, missingFields };
}

function isFieldValid(
  field: keyof BillExtractionResult,
  bill: BillExtractionResult,
): boolean {
  switch (field) {
    case 'amount':
      return typeof bill.amount === 'number' && bill.amount > 0;
    default:
      return (
        typeof bill[field] === 'string' && (bill[field] as string).length > 0
      );
  }
}
