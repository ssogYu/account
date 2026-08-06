import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import dayjs from 'dayjs';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import type { DbService } from '../../../../infra/db/db.service';
import { extractorPrompt } from '../../prompts/extractor.prompt';
import { BillExtractionSchema } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';
import { resolveDate } from '../helpers/resolve-date';
import { loadBillOptions } from '../helpers/load-bill-options';

/** 结构化提取节点：仅从当前输入提取账单字段，不注入历史 */
export function createExtractor(
  db: DbService,
  aiService: AiService,
  logger: PinoLogger,
) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      // 预加载用户可见的分类与支付账户，约束 AI 仅限列表内匹配
      const options = await loadBillOptions(db, state.userId);
      const result = await aiService.structuredInvoke(
        [
          new SystemMessage(extractorPrompt(today, options)),
          new HumanMessage(state.content),
        ],
        BillExtractionSchema,
      );

      // 日期后处理：用代码解析 LLM 提取的原始日期文本
      const resolved = resolveDate(result.billDate, today);
      result.billDate = resolved ?? today;

      logger.info(
        { type: result.type, amount: result.amount, billDate: result.billDate },
        '账单提取完成',
      );

      return { extractedBill: result };
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
