export interface ChatAttachment {
  type: 'image';
  bucket: 'private';
  objectKey: string;
  mimeType: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  previewUrl?: string;
}

export interface OcrEvidence {
  provider: string;
  sceneType: string;
  extractedText: string;
  matchedFields?: Record<string, string>;
}

export interface ParseResult {
  type: 'expense' | 'income';
  amount: number;
  categoryName: string;
  categoryIcon: string;
  categoryId: string;
  note: string;
  date: string;
  accountName: string;
  accountId: string;
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
  needsConfirm?: boolean;
}

export interface BaseChatMetadata {
  attachments?: ChatAttachment[];
}

export interface AssistantMetadata extends BaseChatMetadata {
  type: 'confirm_card' | 'guide' | 'confirmed' | 'rejected';
  source?: 'text' | 'ocr';
  parseResults?: ParseResult[];
  ocrEvidence?: OcrEvidence;
}

export type ChatMessageMetadata = BaseChatMetadata | AssistantMetadata;
