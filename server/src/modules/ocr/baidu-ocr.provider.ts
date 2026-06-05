import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
    const textBlocks: string[] = [];
    const matchedFieldsCollection: Record<string, string> = {};

    for (const attachment of input.attachments) {
      const buffer = await this.minioService.getObjectBuffer(
        attachment.objectKey,
      );
      const ocrResponse = await this.callAccurateBasic(accessToken, buffer);
      const words = (ocrResponse.words_result ?? [])
        .map((item) => item.words?.trim())
        .filter((item): item is string => !!item);

      if (words.length === 0) {
        continue;
      }

      const rawText = words.join('\n');
      textBlocks.push(rawText);

      const matchedFields = this.extractMatchedFields(words);
      Object.assign(matchedFieldsCollection, matchedFields);
    }

    const rawText = textBlocks.join('\n\n');
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
    return result.access_token;
  }

  private async callAccurateBasic(
    accessToken: string,
    buffer: Buffer,
  ): Promise<BaiduOcrResponse> {
    const url = new URL(
      'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic',
    );
    url.searchParams.set('access_token', accessToken);

    const body = new URLSearchParams();
    body.set('image', buffer.toString('base64'));
    body.set('detect_direction', 'true');
    body.set('language_type', 'CHN_ENG');

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
  }

  private extractMatchedFields(lines: string[]): Record<string, string> {
    const joined = lines.join('\n');
    const matchedFields: Record<string, string> = {};

    const amountLine =
      lines.find((line) =>
        /实付|支付金额|实际支付|合计|总计|金额/.test(line),
      ) ?? lines.find((line) => /\d+\.\d{2}/.test(line));
    if (amountLine) {
      matchedFields.amount = amountLine;
    }

    const dateLine = lines.find(
      (line) =>
        /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(line) ||
        /\d{1,2}:\d{2}/.test(line),
    );
    if (dateLine) {
      matchedFields.date = dateLine;
    }

    const accountLine = lines.find((line) =>
      /微信|支付宝|银行卡|建行|农行|招行|工行|云闪付|现金/.test(line),
    );
    if (accountLine) {
      matchedFields.account = accountLine;
    }

    const merchantLine = lines.find(
      (line) =>
        !/实付|支付金额|合计|总计|订单号|交易单号|支付方式|付款方式/.test(
          line,
        ) && /[A-Za-z0-9\u4e00-\u9fa5]{2,}/.test(line),
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
    if (/工资|奖金|退款|转入|收入|收款/.test(rawText)) {
      return 'income_screenshot';
    }

    if (/收据|发票|小票/.test(rawText)) {
      return 'paper_receipt';
    }

    if (/订单|收货|配送|商品|下单/.test(rawText)) {
      return 'order_detail';
    }

    if (/支付|付款|微信支付|支付宝|云闪付|实付/.test(rawText)) {
      return 'payment_screenshot';
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
