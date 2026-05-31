import api from '../api';
import type { ApiResponse } from '../../shared';
import type {
  SendMessageParams,
  SendMessageResult,
  ChatHistoryResult,
  ConfirmBillResult,
  ConfirmAllBillsResult,
  RejectBillResult,
  ConfirmBillParams,
  ConfirmAllBillsParams,
} from './types';

export const chatService = {
  async sendMessage(params: SendMessageParams, signal?: AbortSignal): Promise<SendMessageResult> {
    const { data } = await api.post<ApiResponse<SendMessageResult>>('/chat/send', params, {
      signal,
    });
    return data.data;
  },

  async getHistory(limit?: number, cursor?: string): Promise<ChatHistoryResult> {
    const { data } = await api.get<ApiResponse<ChatHistoryResult>>('/chat/history', {
      params: { limit, cursor },
    });
    return data.data;
  },

  async confirmBill(params: ConfirmBillParams): Promise<ConfirmBillResult> {
    const { data } = await api.post<ApiResponse<ConfirmBillResult>>(
      `/chat/confirm/${params.messageId}`,
      {
        billIndex: params.billIndex,
        ...params.edits,
      },
    );
    return data.data;
  },

  async confirmAllBills(params: ConfirmAllBillsParams): Promise<ConfirmAllBillsResult> {
    const body: Record<string, unknown> = {};
    if (params.edits) {
      const editsObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(params.edits)) {
        editsObj[key] = val;
      }
      body.edits = editsObj;
    }
    const { data } = await api.post<ApiResponse<ConfirmAllBillsResult>>(
      `/chat/confirm-all/${params.messageId}`,
      body,
    );
    return data.data;
  },

  async rejectBill(messageId: string): Promise<RejectBillResult> {
    const { data } = await api.post<ApiResponse<RejectBillResult>>(`/chat/reject/${messageId}`);
    return data.data;
  },
};
