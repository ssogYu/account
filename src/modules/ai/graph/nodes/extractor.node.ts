import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import { extractorPrompt } from '../../prompts/extractor.prompt';
import { BillExtractionSchema } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';

/** 结构化提取节点：仅从当前输入提取账单字段，不注入历史 */
export function createExtractor(aiService: AiService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await aiService.structuredInvoke(
        [
          new SystemMessage(extractorPrompt(today)),
          new HumanMessage(state.content),
        ],
        BillExtractionSchema,
      );

      logger.info(
        { type: result.type, amount: result.amount, result: result },
        '账单提取完成',
      );

      return { extractedBill: result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.error({ error: message }, '账单提取失败');
      return {
        status: 'replied' as const,
        reply: 'AI 服务暂时不可用，请稍后重试',
        error: message,
      };
    }
  };
}
