export interface ChatAttachment {
  type: "image";
  bucket: "private";
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
  type: "expense" | "income";
  amount: number;
  categoryName: string;
  categoryIcon: string;
  categoryId: string;
  note: string;
  date: string;
  accountName: string;
  accountId: string;
  confidence: "high" | "medium" | "low";
  needsConfirm?: boolean;
  warning?: string;
}

export interface BaseChatMetadata {
  attachments?: ChatAttachment[];
}

export interface AssistantMetadata extends BaseChatMetadata {
  type: "confirm_card" | "guide" | "confirmed" | "rejected";
  source?: "text" | "ocr";
  parseResults?: ParseResult[];
  ocrEvidence?: OcrEvidence;
}

export type ChatMessageMetadata = BaseChatMetadata | AssistantMetadata;

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  billId: string | null;
  metadata: ChatMessageMetadata | null;
  createdAt: string;
}

export interface SendMessageParams {
  content?: string;
  attachments?: ChatAttachment[];
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  parseResults: ParseResult[] | null;
}

export interface ChatHistoryResult {
  items: ChatMessage[];
  nextCursor: string | null;
}

export interface ConfirmBillResult {
  confirmed: boolean;
  billId?: string;
  bill?: unknown;
  message?: string;
}

export interface ConfirmAllBillsResult {
  confirmed: boolean;
  billIds?: string[];
  bills?: unknown[];
  message?: string;
}

export interface RejectBillResult {
  rejected: boolean;
  message?: string;
}

export interface ConfirmBillParams {
  messageId: string;
  billIndex: number;
  edits?: {
    categoryId?: string;
    amount?: number;
    note?: string;
    accountName?: string;
    accountId?: string;
  };
}

export interface ConfirmAllBillsParams {
  messageId: string;
  edits?: Record<
    number,
    {
      categoryId?: string;
      amount?: number;
      note?: string;
      accountName?: string;
    }
  >;
}
