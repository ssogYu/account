import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import dayjs from 'dayjs';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import { extractorPrompt } from '../../prompts/extractor.prompt';
import { BillExtractionSchema } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';
import { resolveDate } from '../helpers/resolve-date';

/** 结构化提取节点：仅从当前输入提取账单字段，不注入历史 */
export function createExtractor(aiService: AiService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const result = await aiService.structuredInvoke(
        [
          new SystemMessage(extractorPrompt(today)),
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
