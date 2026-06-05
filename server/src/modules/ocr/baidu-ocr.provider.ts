import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ocrConfig } from '../../config/configuration/ocr.config';
import { MinioService } from '../upload';
import { OcrProvider } from './ocr.types';
import type { OcrResult, ParseBillImageInput } from './ocr.types';

interface BaiduAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface BaiduWordsResultItem {
  words?: string;
}

interface BaiduOcrResponse {
  error_code?: number;
  error_msg?: string;
  words_result?: BaiduWordsResultItem[];
}

@Injectable()
export class BaiduOcrProvider extends OcrProvider {
  readonly name = 'baidu';
  private readonly logger = new Logger(BaiduOcrProvider.name);

  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    @Inject(ocrConfig.KEY)
    private readonly config: ConfigType<typeof ocrConfig>,
    private readonly minioService: MinioService,
  ) {
    super();
  }

  async parseBillImages(input: ParseBillImageInput): Promise<OcrResult> {
    if (input.attachments.length === 0) {
      throw new BadRequestException('请先上传账单图片');
    }

    if (!this.config.baidu.apiKey || !this.config.baidu.secretKey) {
      throw new BadRequestException(
        '百度 OCR 未配置，请设置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY',
      );
    }

    const accessToken = await this.getAccessToken();

    // 并行处理多张图片：MinIO 读取 + 百度 OCR 同时进行
    const results = await Promise.all(
      input.attachments.map(async (attachment) => {
        const buffer = await this.minioService.getObjectBuffer(
          attachment.objectKey,
        );
        const ocrResponse = await this.callAccurateBasic(accessToken, buffer);
        const words = (ocrResponse.words_result ?? [])
          .map((item) => item.words?.trim())
          .filter((item): item is string => !!item);
        return words;
      }),
    );

    const textBlocks = results.filter((words) => words.length > 0);
    const matchedFieldsCollection: Record<string, string> = {};
    for (const words of textBlocks) {
      const matchedFields = this.extractMatchedFields(words);
      Object.assign(matchedFieldsCollection, matchedFields);
    }

    const rawText = textBlocks.map((words) => words.join('\n')).join('\n\n');
    if (!rawText.trim()) {
      throw new BadRequestException(
        '百度 OCR 未识别到可用文字，请尝试上传更清晰的图片',
      );
    }

    return {
      provider: this.name,
      sceneType: this.detectSceneType(rawText),
      extractedText: rawText,
      matchedFields:
        Object.keys(matchedFieldsCollection).length > 0
          ? matchedFieldsCollection
          : undefined,
    };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    const url = new URL('https://aip.baidubce.com/oauth/2.0/token');
    url.searchParams.set('grant_type', 'client_credentials');
    url.searchParams.set('client_id', this.config.baidu.apiKey);
    url.searchParams.set('client_secret', this.config.baidu.secretKey);

    const response = await this.fetchWithTimeout(url.toString(), {
      method: 'POST',
    });
    const result = (await response.json()) as BaiduAccessTokenResponse;

    if (!response.ok || !result.access_token) {
      throw new BadRequestException(
        `百度 OCR 鉴权失败: ${result.error_description ?? result.error ?? response.statusText}`,
      );
    }

    this.accessToken = result.access_token;
    this.accessTokenExpiresAt =
      now + Math.max((result.expires_in ?? 2592000) - 300, 300) * 1000;
    return this.accessToken;
  }

  private async callAccurateBasic(
    accessToken: string,
    buffer: Buffer,
    retries = 1,
  ): Promise<BaiduOcrResponse> {
    const url = new URL(
      'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic',
    );
    url.searchParams.set('access_token', accessToken);

    const body = new URLSearchParams();
    body.set('image', buffer.toString('base64'));
    body.set('detect_direction', 'true');
    body.set('language_type', 'CHN_ENG');

    try {
      const response = await this.fetchWithTimeout(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const result = (await response.json()) as BaiduOcrResponse;
      if (!response.ok || result.error_code) {
        throw new BadRequestException(
          `百度 OCR 识别失败: ${result.error_msg ?? response.statusText}`,
        );
      }

      return result;
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        this.logger.warn(
          `百度 OCR 请求失败，正在重试（剩余 ${retries} 次）: ${error instanceof Error ? error.message : error}`,
        );
        return this.callAccurateBasic(accessToken, buffer, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof BadRequestException) {
      return false;
    }
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return (
        msg.includes('timeout') ||
        msg.includes('abort') ||
        msg.includes('econnreset') ||
        msg.includes('econnrefused') ||
        msg.includes('network')
      );
    }
    return true;
  }

  private extractMatchedFields(lines: string[]): Record<string, string> {
    const joined = lines.join('\n');
    const matchedFields: Record<string, string> = {};

    // 金额：优先从明确关键词行提取数值
    const amountMatch = joined.match(
      /(?:实付|支付金额|实际支付|合计|总计|金额|应付)[^\d]*(\d+\.?\d*)/,
    );
    if (amountMatch) {
      matchedFields.amount = amountMatch[1];
    } else {
      // 兜底：找第一个含小数的数字行
      const fallbackAmountLine = lines.find((line) => /\d+\.\d{2}/.test(line));
      if (fallbackAmountLine) {
        const fallbackMatch = fallbackAmountLine.match(/(\d+\.\d{2})/);
        if (fallbackMatch) {
          matchedFields.amount = fallbackMatch[1];
        }
      }
    }

    // 日期
    const dateLine = lines.find(
      (line) =>
        /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(line) ||
        /\d{1,2}:\d{2}/.test(line),
    );
    if (dateLine) {
      matchedFields.date = dateLine;
    }

    // 支付账户
    const accountLine = lines.find((line) =>
      /微信|支付宝|银行卡|建行|农行|招行|工行|云闪付|现金|储蓄卡|信用卡/.test(
        line,
      ),
    );
    if (accountLine) {
      matchedFields.account = accountLine;
    }

    // 商户：排除非商户行
    const nonMerchantPattern =
      /实付|支付金额|实际支付|合计|总计|金额|应付|订单号|交易单号|支付方式|付款方式|商品说明|收货地址|配送费|优惠|备注|退款|收货|配送|下单|付款时间|创建时间|编号/;
    const merchantLine = lines.find(
      (line) =>
        !nonMerchantPattern.test(line) &&
        /[A-Za-z0-9\u4e00-\u9fa5]{2,}/.test(line),
    );
    if (merchantLine) {
      matchedFields.merchant = merchantLine;
    }

    if (!matchedFields.merchant && joined.trim()) {
      matchedFields.merchant = lines[0] ?? '';
    }

    return matchedFields;
  }

  private detectSceneType(rawText: string): string {
    // 支付截图优先（最常见场景）
    if (/支付成功|付款成功|实付|微信支付|支付宝.*付款|云闪付/.test(rawText)) {
      return 'payment_screenshot';
    }

    // 收入需要更严格的上下文判断，避免"退款政策"等误判
    if (
      /工资.*到账|奖金.*到账|退款成功|转入.*余额|收款到账|已到账/.test(rawText)
    ) {
      return 'income_screenshot';
    }

    if (/收据|发票|小票/.test(rawText)) {
      return 'paper_receipt';
    }

    if (/订单|收货|配送|商品|下单/.test(rawText)) {
      return 'order_detail';
    }

    return 'unknown';
  }

  private async fetchWithTimeout(
    input: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.baidu.timeoutMs,
    );

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
