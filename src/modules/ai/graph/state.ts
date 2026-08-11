import type { BaseMessage } from '@langchain/core/messages';
import type { BillExtractionResult } from '../schemas/extraction.schema';
import type { BillOptions } from './helpers/load-bill-options';

/** 单笔账单的评分结果 */
export interface BillEvaluation {
  confidence: number;
  missingFields: string[];
}

/** 确认卡片条目：一笔账单对应一张卡片，内嵌原始提取数据供 confirm 使用 */
export interface ConfirmationCardItem {
  id: string;
  type?: string;
  amount?: number;
  category?: string;
  paymentAccount?: string;
  billDate?: string;
  note?: string;
  missingFields: string[];
  /** 原始提取数据，供 confirm 逐笔确认时使用 */
  bill: BillExtractionResult;
}

/** LangGraph 全局状态 */
export interface GraphState {
  userId: string;
  messages: BaseMessage[];
  content: string;
  /** 账单图片 URL 列表（多模态输入，先通过 /upload 上传获取） */
  imageUrls?: string[];
  /** 对话历史记录 ID */
  conversationId?: string;
  /** 意图分类 */
  intent?: 'bookkeeping' | 'query' | 'chat';
  intentConfidence?: number;
  /** 结构化提取（多笔） */
  extractedBills?: BillExtractionResult[];
  /** 逐笔置信度评估（与 extractedBills 等长） */
  billEvaluations?: BillEvaluation[];
  /** 单笔置信度（兼容单笔自动入库路由判断） */
  confidence?: number;
  /** 输出 */
  status?: 'auto_created' | 'pending_confirm' | 'mixed' | 'replied' | 'error';
  reply?: string;
  sessionId?: string;
  createdBill?: Record<string, unknown>;
  createdBills?: Record<string, unknown>[];
  /** 多张确认卡片 */
  confirmationCards?: ConfirmationCardItem[];
  /** 错误 */
  error?: string;
  /** 用户可用的分类和支付账户列表（extractor 加载后传递给下游节点） */
  billOptions?: BillOptions;
}

/** 节点返回值：部分状态更新 */
export type NodeUpdate = Partial<GraphState>;
