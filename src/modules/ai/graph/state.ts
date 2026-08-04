import type { BaseMessage } from '@langchain/core/messages';
import type { BillExtractionResult } from '../schemas/extraction.schema';

/** LangGraph 全局状态 */
export interface GraphState {
  userId: string;
  messages: BaseMessage[];
  content: string;
  /** 对话历史记录 ID */
  conversationId?: string;
  /** 意图分类 */
  intent?: 'bookkeeping' | 'query' | 'chat';
  intentConfidence?: number;
  /** 结构化提取 */
  extractedBill?: BillExtractionResult;
  /** 置信度评估 */
  confidence?: number;
  missingFields?: string[];
  /** 输出 */
  status?: 'auto_created' | 'pending_confirm' | 'replied' | 'error';
  reply?: string;
  sessionId?: string;
  createdBill?: Record<string, unknown>;
  confirmationCard?: Record<string, unknown>;
  /** 错误 */
  error?: string;
}

/** 节点返回值：部分状态更新 */
export type NodeUpdate = Partial<GraphState>;
