import { z } from 'zod';

/** 用户意图分类 */
export const IntentSchema = z.object({
  intent: z
    .enum(['bookkeeping', 'query', 'chat'])
    .describe('用户意图：记账、查询或闲聊'),
  confidence: z.number().min(0).max(1).describe('分类置信度 0-1'),
});

export type IntentResult = z.infer<typeof IntentSchema>;
