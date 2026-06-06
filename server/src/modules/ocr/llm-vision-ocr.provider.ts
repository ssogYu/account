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
      '',
      '## 核心原则',
      '- 只做 OCR 文本提取和字段提示，不要猜测分类、收支类型或账户。',
      '- 只提取图片中明确可见的信息，不要编造或推断任何内容。',
      '- 严格按照 JSON Schema 输出，不要在 JSON 外添加多余文字。',
      '',
      '## extractedText 规则',
      '1. 输出图片中的核心 OCR 文字全文，按阅读顺序组织，不要做记账结构化。',
      '2. 保留原始字段名称（如"实付金额""订单号""支付方式"），不要翻译或改写。',
      '3. 忽略纯装饰性文字（如广告语、免责声明、版权信息）和重复行。',
      '4. 多张图片时按图片顺序分段，段落前加"[图片1]""[图片2]"标记。',
      '5. 如果图片模糊或部分遮挡，提取可辨认部分，不可辨认的标注为"[无法识别]"。',
      '',
      '## matchedFields 规则',
      '1. 仅填写图片中明确可见的 merchant（商户名）、amount（金额）、date（日期）、account（支付方式/账户）。',
      '2. 金额提取最终实付金额，忽略原价、划线价、优惠金额。如有多个金额，取"实付""实收""合计"等最终金额。',
      '3. 日期格式统一为 YYYY-MM-DD。如只有"今天""昨天"等相对词，结合当前日期转换。',
      '4. 商户名取最简洁的名称，去掉"·""|""—"等分隔符后的副标题。',
      '5. 如果字段无法确认，不要填写，留空即可。',
      '',
      '## 特殊场景处理',
      '1. 退款/部分退款：如果识别到退款信息，正常提取金额和商户，不要因为退款而跳过。',
      '2. 多笔交易：同一张图上有多笔交易时，在 extractedText 中全部列出，matchedFields 取最突出的一笔。',
      '3. 手写收据：尽可能识别手写文字，无法辨认的标注为"[无法识别]"。',
      '4. 外币账单：提取原始金额和币种（如"USD 25.00"），不要自动换算。',
      '5. 截图含通知栏/状态栏：忽略系统通知栏、电池、时间等无关信息。',
      '',
      `当前日期：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    ].join('\n');

    try {
      const model = this.llmService.getModel();

      // DeepSeek 等模型可能不支持 withStructuredOutput，尝试后 fallback 到手动解析
      let result: z.infer<typeof OcrOutputSchema>;
      try {
        const structuredModel = model.withStructuredOutput(OcrOutputSchema);
        result = await this.invokeWithTimeout(
          structuredModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage({ content: blocks }),
          ]),
        );
      } catch {
        // withStructuredOutput 失败，fallback 到普通调用 + 手动 JSON 解析
        const response = await this.invokeWithTimeout(
          model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage({ content: blocks }),
          ]),
        );
        result = this.parseJsonResponse(response.content as string);
      }

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
    // DeepSeek V3+ 支持 vision；openai/gemini 原生支持；ollama 取决于模型
    return ['openai', 'gemini', 'deepseek'].includes(provider);
  }

  /** 从 LLM 原始文本回复中提取 JSON 并用 schema 校验 */
  private parseJsonResponse(content: string): z.infer<typeof OcrOutputSchema> {
    // 尝试提取 ```json ... ``` 或裸 JSON
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)```/) ?? content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new BadRequestException('视觉 OCR 返回格式异常，无法解析 JSON');
    }
    const raw = jsonMatch[1] ?? jsonMatch[0];
    try {
      return OcrOutputSchema.parse(JSON.parse(raw));
    } catch {
      throw new BadRequestException('视觉 OCR 返回的 JSON 格式不合法');
    }
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
