import type { PinoLogger } from 'nestjs-pino';
import type { GraphState, NodeUpdate } from '../state';

/** 输入预处理：标准化内容、清理多余空白、拦截空输入 */
export function createInputProcessor(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const content = state.content.trim().replace(/\s+/g, ' ');

    if (!content) {
      return {
        status: 'replied' as const,
        reply: '请输入记账内容，例如：花了50块吃饭',
      };
    }

    logger.debug({ content }, '输入预处理完成');
    return { content };
  };
}
