/** 解析结果结构（与后端一致） */
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
  needsConfirm?: boolean;
}

/** AI消息的metadata结构 */
export interface AssistantMetadata {
  type: 'confirm_card' | 'guide' | 'confirmed' | 'rejected';
  parseResult?: ParseResult;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  billId: string | null;
  metadata: AssistantMetadata | null;
  createdAt: string;
}

export interface SendMessageParams {
  content: string;
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  parseResult: ParseResult | null;
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

export interface RejectBillResult {
  rejected: boolean;
  message?: string;
}

export interface ConfirmBillParams {
  messageId: string;
  edits?: {
    categoryId?: string;
    amount?: number;
    note?: string;
    accountName?: string;
    accountId?: string;
  };
}
