import { z } from 'zod';

/** 单笔账单结构化提取结果 */
export const BillExtractionSchema = z.object({
  type: z
    .enum(['expense', 'income'])
    .nullable()
    .optional()
    .describe('支出或收入'),
  amount: z.number().nullable().optional().describe('金额，无法确定时省略不填'),
  category: z.string().nullable().optional().describe('匹配到的分类名称'),
  categoryId: z.string().nullable().optional().describe('匹配到的分类 ID'),
  paymentAccount: z.string().nullable().optional().describe('支付账户名称'),
  paymentAccountId: z.string().nullable().optional().describe('支付账户 ID'),
  billDate: z
    .string()
    .nullable()
    .optional()
    .describe('账单时间 YYYY-MM-DD HH:mm:ss 格式'),
  note: z.string().nullable().optional().describe('备注说明'),
});

/** 多笔结构化提取结果：一次输入可包含多笔账单 */
export const BillExtractionsSchema = z.object({
  bills: z
    .array(BillExtractionSchema)
    .describe('从用户输入中提取到的所有账单，每笔一条'),
});

export type BillExtractionResult = z.infer<typeof BillExtractionSchema>;
export type BillExtractionsResult = z.infer<typeof BillExtractionsSchema>;
