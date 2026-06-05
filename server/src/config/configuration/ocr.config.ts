import { registerAs } from '@nestjs/config';

export const ocrConfig = registerAs('ocr', () => ({
  provider: (process.env.OCR_PROVIDER ?? 'llm_vision').toLowerCase(),
  llmVision: {
    timeoutMs: parseInt(process.env.LLM_VISION_OCR_TIMEOUT_MS ?? '15000', 10),
    maxImages: parseInt(process.env.LLM_VISION_OCR_MAX_IMAGES ?? '3', 10),
    maxImageBytes: parseInt(
      process.env.LLM_VISION_OCR_MAX_IMAGE_BYTES ?? `${5 * 1024 * 1024}`,
      10,
    ),
  },
  baidu: {
    apiKey: process.env.BAIDU_OCR_API_KEY ?? '',
    secretKey: process.env.BAIDU_OCR_SECRET_KEY ?? '',
    timeoutMs: parseInt(process.env.BAIDU_OCR_TIMEOUT_MS ?? '12000', 10),
  },
}));
