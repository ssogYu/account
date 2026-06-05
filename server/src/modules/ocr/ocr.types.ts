import type { ChatAttachment } from '../chat/chat.types';

export interface OcrResult {
  provider: string;
  sceneType: string;
  extractedText: string;
  matchedFields?: Record<string, string>;
}

export interface ParseBillImageInput {
  content?: string;
  attachments: ChatAttachment[];
}

export abstract class OcrProvider {
  abstract readonly name: string;
  abstract parseBillImages(input: ParseBillImageInput): Promise<OcrResult>;
}
