import { Inject, Injectable } from '@nestjs/common';
import type { OcrProvider, ParseBillImageInput, OcrResult } from './ocr.types';
import { OCR_PROVIDER_TOKEN } from './ocr.constants';

@Injectable()
export class OcrService {
  constructor(
    @Inject(OCR_PROVIDER_TOKEN)
    private readonly provider: OcrProvider,
  ) {}

  parseBillImages(input: ParseBillImageInput): Promise<OcrResult> {
    const provider = this.provider;
    return provider.parseBillImages(input);
  }
}
