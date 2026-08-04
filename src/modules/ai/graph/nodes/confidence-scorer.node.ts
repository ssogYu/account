import type { PinoLogger } from 'nestjs-pino';
import type { GraphState, NodeUpdate } from '../state';

/**
 * 字段权重分配：
 *   - 分类、类型、支付账户 —— 用户明确要求权重大
 *   - 日期 —— 重要但 AI 默认填"今天"，权重次之
 *   - 金额 —— 仅做 >0 校验，权重次之
 *   - 备注 —— 不影响置信度
 */
const FIELD_CHECKS = [
  { key: 'type' as const, weight: 0.25 },
  { key: 'category' as const, weight: 0.25 },
  { key: 'paymentAccount' as const, weight: 0.2 },
  { key: 'billDate' as const, weight: 0.15 },
  { key: 'amount' as const, weight: 0.15 },
];

/**
 * 置信度评分节点
 *
 * 纯字段完整性评分，不再引入 AI 意图自评置信度。
 * amount 必须 >0 才算有效，note（备注）不参与评分。
 */
export function createConfidenceScorer(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBill } = state;
    const missingFields: string[] = [];
    let score = 0;

    for (const { key, weight } of FIELD_CHECKS) {
      if (isFieldValid(key, extractedBill)) {
        score += weight;
      } else {
        missingFields.push(key);
      }
    }

    logger.info({ confidence: score, missingFields }, '置信度评估完成');

    return { confidence: score, missingFields };
  };
}

function isFieldValid(
  field: string,
  bill: GraphState['extractedBill'],
): boolean {
  if (!bill) return false;

  switch (field) {
    case 'amount':
      return typeof bill.amount === 'number' && bill.amount > 0;
    default:
      return (
        typeof bill[field as keyof typeof bill] === 'string' &&
        (bill[field as keyof typeof bill] as string).length > 0
      );
  }
}
