import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../../infra/ai/ai.service';
import type { VisionService } from '../../../../infra/ai/vision.service';
import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';
import { extractorPrompt } from '../../prompts/extractor.prompt';
import { BillExtractionsSchema } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';
import { now } from '../../../../common/utils/date';
import { loadBillOptions } from '../helpers/load-bill-options';

/** 结构化提取节点：支持纯文本和多模态（图片+文字）输入，不注入历史 */
export function createExtractor(
  db: DbService,
  aiService: AiService,
  familyService: FamilyService,
  logger: PinoLogger,
  visionService?: VisionService,
) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    try {
      const nowStr = now();
      const options = await loadBillOptions(db, state.userId, familyService);
      const hasImages =
        state.imageUrls !== undefined && state.imageUrls.length > 0;

      // 有图片且视觉服务就绪 → 走视觉识别；否则走文本 AI
      const useVision = hasImages && visionService?.isReady === true;

      const systemMsg = new SystemMessage(
        extractorPrompt(nowStr, options, hasImages),
      );
      const userMsgs = hasImages
        ? await buildMultimodalMessages(state.imageUrls!, state.content)
        : [new HumanMessage(state.content)];
      const result = useVision
        ? await visionService!.structuredInvoke(
            [systemMsg, ...userMsgs],
            BillExtractionsSchema,
          )
        : await aiService.structuredInvoke(
            [systemMsg, ...userMsgs],
            BillExtractionsSchema,
          );

      logger.info(
        { billCount: result.bills?.length, hasImages },
        '账单提取完成',
      );

      return { extractedBills: result.bills as any, billOptions: options };
    } catch (error: unknown) {
      logger.error({ error }, '账单提取失败');
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

/**
 * 构建多模态 HumanMessage：每张图片一个 image_url 块 + 可选文字块。
 * 格式遵循 OpenAI Vision API content parts 规范。
 *
 * 公网 URL 直接传给大模型下载；本地地址（127.0.0.1/localhost）大模型无法访问，
 * 自动通过 HTTP 下载并内联为 Base64 Data URL。
 */
async function buildMultimodalMessages(
  imageUrls: string[],
  text?: string,
): Promise<HumanMessage[]> {
  const contentParts: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'auto' } }
  > = [];

  for (const url of imageUrls) {
    const resolved = await resolveImageUrl(url);
    contentParts.push({
      type: 'image_url',
      image_url: { url: resolved },
    });
  }

  if (text && text.trim()) {
    contentParts.push({ type: 'text', text: text.trim() });
  } else {
    contentParts.push({
      type: 'text',
      text: '请识别图片中的账单信息包含名称即为备注，金额，账单日期，账单分类，支付方式，收入/支出等',
    });
  }

  return [new HumanMessage({ content: contentParts as any })];
}

/** 本地地址 → 下载转 Base64；公网地址 → 原样返回 */
async function resolveImageUrl(url: string): Promise<string> {
  if (isLocalUrl(url)) {
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }
  return url;
}

function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === '127.0.0.1' ||
      hostname === '172.20.10.3' ||
      hostname === '172.20.10.4' ||
      hostname === '192.168.18.198' ||
      hostname === 'localhost' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}
