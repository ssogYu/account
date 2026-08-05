import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import { CHAT_PROMPT } from '../../prompts/chat.prompt';
import { MAX_HISTORY_TURNS } from '../constants';
import type { GraphState, NodeUpdate } from '../state';

/** 闲聊处理节点：用 LLM 生成自然回复，注入裁剪后的历史消息上下文 */
export function createChatHandler(aiService: AiService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const history = state.messages ?? [];

      // 裁剪历史：只保留最近 N 轮，避免 token 膨胀
      const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);

      const reply = await aiService.invoke([
        new SystemMessage(CHAT_PROMPT),
        ...recentHistory,
        new HumanMessage(state.content),
      ]);

      const text =
        typeof reply.content === 'string'
          ? reply.content
          : JSON.stringify(reply.content);

      logger.info('闲聊回复完成');
      return { status: 'replied' as const, reply: text };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      const name = error instanceof Error ? error.name : 'UnknownError';
      logger.error({ error: message, errorType: name }, '闲聊回复失败');
      return {
        status: 'replied' as const,
        reply: 'AI 服务暂时不可用，请稍后重试',
        error: message,
      };
    }
  };
}
