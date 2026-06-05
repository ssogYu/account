import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { OcrProvider, ParseBillImageInput, OcrResult } from './ocr.types';
import {
  OCR_PROVIDER_TOKEN,
  OCR_FALLBACK_PROVIDER_TOKEN,
} from './ocr.constants';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @Inject(OCR_PROVIDER_TOKEN)
    private readonly provider: OcrProvider,
    @Optional()
    @Inject(OCR_FALLBACK_PROVIDER_TOKEN)
    private readonly fallbackProvider: OcrProvider | null,
  ) {}

  async parseBillImages(input: ParseBillImageInput): Promise<OcrResult> {
    try {
      return await this.provider.parseBillImages(input);
    } catch (error) {
      if (!this.fallbackProvider) {
        throw error;
      }

      this.logger.warn(
        `主 OCR 提供商 ${this.provider.name} 失败，切换到备用提供商 ${this.fallbackProvider.name}: ${error instanceof Error ? error.message : error}`,
      );

      return this.fallbackProvider.parseBillImages(input);
    }
  }
}
