import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { LlmModule } from '../llm';
import { UploadModule } from '../upload';
import { OcrService } from './ocr.service';
import { LlmVisionOcrProvider } from './llm-vision-ocr.provider';
import { BaiduOcrProvider } from './baidu-ocr.provider';
import { OCR_PROVIDER_TOKEN } from './ocr.constants';
import { ocrConfig } from '../../config/configuration/ocr.config';
import { OcrProvider } from './ocr.types';

@Module({
  imports: [LlmModule, UploadModule],
  providers: [
    LlmVisionOcrProvider,
    BaiduOcrProvider,
    {
      provide: OCR_PROVIDER_TOKEN,
      inject: [ocrConfig.KEY, LlmVisionOcrProvider, BaiduOcrProvider],
      useFactory: (
        config: ConfigType<typeof ocrConfig>,
        llmVisionProvider: LlmVisionOcrProvider,
        baiduOcrProvider: BaiduOcrProvider,
      ): OcrProvider => {
        switch (config.provider) {
          case 'baidu':
            return baiduOcrProvider;
          case 'llm_vision':
          default:
            return llmVisionProvider;
        }
      },
    },
    OcrService,
  ],
  exports: [OcrService],
})
export class OcrModule {}
