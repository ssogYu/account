import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import { CHAT_PROMPT } from '../../prompts/chat.prompt';
import type { GraphState, NodeUpdate } from '../state';

/** 闲聊处理节点：用 LLM 生成自然回复，注入历史消息上下文 */
export function createChatHandler(aiService: AiService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const history = state.messages ?? [];
      const reply = await aiService.invoke([
        new SystemMessage(CHAT_PROMPT),
        ...history,
        new HumanMessage(state.content),
      ]);

      const text =
        typeof reply.content === 'string'
          ? reply.content
          : JSON.stringify(reply.content);

      logger.info('闲聊回复完成');
      return { status: 'replied', reply: text };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.error({ error: message }, '闲聊回复失败');
      return {
        status: 'replied' as const,
        reply: 'AI 服务暂时不可用，请稍后重试',
        error: message,
      };
    }
  };
}
