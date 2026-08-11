import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import { INTENT_CLASSIFIER_PROMPT } from '../../prompts/intent-classifier.prompt';
import { IntentSchema } from '../../schemas/intent.schema';
import { MAX_HISTORY_TURNS } from '../constants';
import type { GraphState, NodeUpdate } from '../state';

/** 意图分类节点：调用 LLM 判断用户意图，注入裁剪后的历史上下文 */
export function createIntentClassifier(
  aiService: AiService,
  logger: PinoLogger,
) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      // 有图片即为记账意图，直接短路，不调用 LLM 意图分类
      const hasImages =
        state.imageUrls !== undefined && state.imageUrls.length > 0;
      if (hasImages) {
        logger.info(
          { imageCount: state.imageUrls?.length },
          '图片输入，强制记账意图',
        );
        return {
          intent: 'bookkeeping' as const,
          intentConfidence: 1,
        };
      }

      const history = state.messages ?? [];

      // 裁剪历史：只保留最近 N 轮对话，避免 token 膨胀
      const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);

      const result = await aiService.structuredInvoke(
        [
          new SystemMessage(INTENT_CLASSIFIER_PROMPT),
          ...recentHistory,
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
      const name = error instanceof Error ? error.name : 'UnknownError';
      logger.error({ error: message, errorType: name }, '意图分类失败');
      return {
        reply: 'AI 服务暂时不可用，请稍后重试',
        error: message,
      };
    }
  };
}
