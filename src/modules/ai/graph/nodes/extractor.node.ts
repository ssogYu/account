import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';
import { extractorPrompt } from '../../prompts/extractor.prompt';
import { BillExtractionsSchema } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';
import { parseDateTime, now } from '../../../../common/utils/date';
import { loadBillOptions } from '../helpers/load-bill-options';

/** 结构化提取节点：仅从当前输入提取账单字段，支持多笔，不注入历史 */
export function createExtractor(
  db: DbService,
  aiService: AiService,
  familyService: FamilyService,
  logger: PinoLogger,
) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const nowStr = now();
      const options = await loadBillOptions(db, state.userId, familyService);
      const result = await aiService.structuredInvoke(
        [
          new SystemMessage(extractorPrompt(nowStr, options)),
          new HumanMessage(state.content),
        ],
        BillExtractionsSchema,
      );

      // 日期后处理：逐笔用代码解析 LLM 提取的原始日期文本
      const bills = (result.bills ?? []).map((bill) => {
        const resolved = parseDateTime(bill.billDate);
        return { ...bill, billDate: resolved ?? nowStr };
      });

      logger.info(
        { count: bills.length, amounts: bills.map((b) => b.amount) },
        '账单提取完成',
      );

      return { extractedBills: bills };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      const name = error instanceof Error ? error.name : 'UnknownError';
      logger.error({ error: message, errorType: name }, '账单提取失败');
      return {
        reply: 'AI 服务暂时不可用，请稍后重试',
        error: message,
      };
    }
  };
}
