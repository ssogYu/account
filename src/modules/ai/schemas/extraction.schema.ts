import { z } from 'zod';

/** 单笔账单结构化提取结果 */
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

/** 多笔结构化提取结果：一次输入可包含多笔账单 */
export const BillExtractionsSchema = z.object({
  bills: z
    .array(BillExtractionSchema)
    .describe('从用户输入中提取到的所有账单，每笔一条'),
});

export type BillExtractionResult = z.infer<typeof BillExtractionSchema>;
export type BillExtractionsResult = z.infer<typeof BillExtractionsSchema>;
