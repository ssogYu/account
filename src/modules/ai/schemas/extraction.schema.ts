import { z } from 'zod';

/** 账单结构化提取结果 */
export const BillExtractionSchema = z.object({
  type: z.enum(['expense', 'income']).optional().describe('支出或收入'),
  amount: z.number().optional().describe('金额'),
  category: z.string().optional().describe('匹配到的分类名称'),
  categoryId: z.string().optional().describe('匹配到的分类 ID'),
  paymentAccount: z.string().optional().describe('支付账户名称'),
  paymentAccountId: z.string().optional().describe('支付账户 ID'),
  billDate: z.string().optional().describe('账单日期 YYYY-MM-DD 格式'),
  note: z.string().optional().describe('备注说明'),
});

export type BillExtractionResult = z.infer<typeof BillExtractionSchema>;
