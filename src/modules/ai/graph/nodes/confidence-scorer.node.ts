import type { PinoLogger } from 'nestjs-pino';
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
  key: keyof NonNullable<GraphState['extractedBill']>;
  weight: number;
}[] = [
  { key: 'type', weight: 0.3 },
  { key: 'category', weight: 0.3 },
  { key: 'paymentAccount', weight: 0.25 },
  { key: 'billDate', weight: 0.15 },
];

/**
 * 置信度评分节点
 *
 * 评分规则：
 * 1. amount 为硬门槛——无效时直接 0 分，走 confirmCard
 * 2. 其余 4 个字段按权重累加
 * 3. 阈值 0.7 在路由函数 routeConfidence 中判断
 */
export function createConfidenceScorer(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBill } = state;
    const missingFields: string[] = [];

    if (!extractedBill) {
      return {
        confidence: 0,
        missingFields: [
          'amount',
          'type',
          'category',
          'paymentAccount',
          'billDate',
        ],
      };
    }

    // 硬门槛：金额必须有效
    if (typeof extractedBill.amount !== 'number' || extractedBill.amount <= 0) {
      missingFields.push('amount');
      // 同时检查其他字段，让 confirmCard 知道缺了什么
      for (const { key } of FIELD_CHECKS) {
        if (!isFieldValid(key, extractedBill)) {
          missingFields.push(key);
        }
      }
      logger.info(
        { confidence: 0, missingFields },
        '置信度评估完成（金额无效）',
      );
      return { confidence: 0, missingFields };
    }

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
  field: keyof NonNullable<GraphState['extractedBill']>,
  bill: NonNullable<GraphState['extractedBill']>,
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
