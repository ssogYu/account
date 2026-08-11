import type { PinoLogger } from 'nestjs-pino';
import type { GraphState, NodeUpdate } from '../state';

/** 输入预处理：标准化内容、清理多余空白、拦截空输入（有图片时不拦截空文本） */
export function createInputProcessor(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const content = state.content.trim().replace(/\s+/g, ' ');
    const hasImages =
      state.imageUrls !== undefined && state.imageUrls.length > 0;

    if (!content && !hasImages) {
      return {
        status: 'replied' as const,
        reply: '请输入记账内容，或上传账单图片让我帮你识别',
        error: 'EMPTY_INPUT',
      };
    }

    logger.debug(
      { content, imageCount: state.imageUrls?.length ?? 0 },
      '输入预处理完成',
    );
    return { content };
  };
}
