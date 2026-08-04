import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import { INTENT_CLASSIFIER_PROMPT } from '../../prompts/intent-classifier.prompt';
import { IntentSchema } from '../../schemas/intent.schema';
import type { GraphState, NodeUpdate } from '../state';

/** 意图分类节点：调用 LLM 判断用户意图，注入历史上下文 */
export function createIntentClassifier(
  aiService: AiService,
  logger: PinoLogger,
) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const history = state.messages ?? [];
      const result = await aiService.structuredInvoke(
        [
          new SystemMessage(INTENT_CLASSIFIER_PROMPT),
          ...history,
          new HumanMessage(state.content),
        ],
        IntentSchema,
      );

      logger.info(
        { intent: result.intent, confidence: result.confidence },
        '意图分类完成',
      );

      return {
        intent: result.intent,
        intentConfidence: result.confidence,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.error({ error: message }, '意图分类失败');
      return {
        status: 'replied' as const,
        reply: 'AI 服务暂时不可用，请稍后重试',
        error: message,
      };
    }
  };
}
