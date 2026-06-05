import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { ocrConfig } from '../../config/configuration/ocr.config';
import { LlmService } from '../llm';
import { MinioService } from '../upload';
import { OcrProvider } from './ocr.types';
import type { OcrResult, ParseBillImageInput } from './ocr.types';

const OcrOutputSchema = z.object({
  sceneType: z
    .enum([
      'payment_screenshot',
      'order_detail',
      'paper_receipt',
      'income_screenshot',
      'unknown',
    ])
    .describe('图片场景'),
  extractedText: z
    .string()
    .describe('从图片中按阅读顺序提取出的 OCR 文字全文，尽量保留原始字段'),
  matchedFields: z
    .object({
      merchant: z.string().optional(),
      amount: z.string().optional(),
      date: z.string().optional(),
      account: z.string().optional(),
    })
    .optional(),
});

@Injectable()
export class LlmVisionOcrProvider extends OcrProvider {
  readonly name = 'llm_vision';

  constructor(
    @Inject(ocrConfig.KEY)
    private readonly config: ConfigType<typeof ocrConfig>,
    private readonly llmService: LlmService,
    private readonly minioService: MinioService,
  ) {
    super();
  }

  async parseBillImages(input: ParseBillImageInput): Promise<OcrResult> {
    if (input.attachments.length === 0) {
      throw new BadRequestException('请先上传账单图片');
    }
    if (input.attachments.length > this.config.llmVision.maxImages) {
      throw new BadRequestException(
        `视觉 OCR 最多支持 ${this.config.llmVision.maxImages} 张图片，请减少后再试`,
      );
    }

    const llmProvider = this.llmService.getProvider();
    if (!this.isVisionCapableProvider(llmProvider)) {
      throw new BadRequestException(
        `当前 LLM 提供商 ${llmProvider} 未启用图片识别能力，请切换到支持视觉的模型`,
      );
    }

    const blocks: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [];

    const contextText = (input.content ?? '').trim();
    blocks.push({
      type: 'text',
      text: [
        '请识别这些账单图片，并输出 OCR 抽文结果。',
        contextText ? `用户补充说明：${contextText}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    for (const [index, attachment] of input.attachments.entries()) {
      const buffer = await this.minioService.getObjectBuffer(
        attachment.objectKey,
      );
      if (buffer.length > this.config.llmVision.maxImageBytes) {
        throw new BadRequestException(
          `图片过大，视觉 OCR 单张图片最大支持 ${Math.floor(this.config.llmVision.maxImageBytes / 1024 / 1024)}MB`,
        );
      }
      const dataUrl = `data:${attachment.mimeType};base64,${buffer.toString('base64')}`;
      blocks.push({
        type: 'text',
        text: `以下是第 ${index + 1} 张图片，请按图片顺序提取文字内容。`,
      });
      blocks.push({ type: 'image_url', image_url: { url: dataUrl } });
    }

    const now = new Date();
    const systemPrompt = [
      '你是一个严格的 OCR 抽文助手，要从账单截图、支付截图、收据照片中提取可阅读文字。',
      '必须遵循以下规则：',
      '1. extractedText 必须输出图片中的核心 OCR 文字全文，按阅读顺序组织，不要直接做记账结构化。',
      '2. 不要猜测分类、收支类型或账户；只做 OCR 文本提取和字段提示。',
      '3. matchedFields 仅填写你能从图片中明确看到的 merchant、amount、date、account。',
      '4. 如果图片里没有明确字段，不要编造。',
      '5. 如果有多张图片，请在 extractedText 中按图片顺序分段输出，段落前加上“[图片1]”“[图片2]”这类标记。',
      `6. 当前日期仅用于理解上下文：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    ].join('\n');

    try {
      const model = this.llmService
        .getModel()
        .withStructuredOutput(OcrOutputSchema);
      const result = await this.invokeWithTimeout(
        model.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage({ content: blocks }),
        ]),
      );

      return {
        provider: this.name,
        sceneType: result.sceneType,
        extractedText: result.extractedText.trim(),
        matchedFields: result.matchedFields,
      };
    } catch (error) {
      throw this.normalizeVisionError(error);
    }
  }

  private isVisionCapableProvider(provider: string): boolean {
    return provider === 'openai' || provider === 'gemini';
  }

  private async invokeWithTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new BadRequestException(
            '视觉 OCR 请求超时，请稍后重试或切换百度 OCR',
          ),
        );
      }, this.config.llmVision.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private normalizeVisionError(error: unknown): BadRequestException {
    if (error instanceof BadRequestException) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new BadRequestException(
      `视觉 OCR 识别失败: ${message || '请稍后重试或切换百度 OCR'}`,
    );
  }
}
