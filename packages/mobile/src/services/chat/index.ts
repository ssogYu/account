import api from '../api';
import type { ApiResponse } from '@ai-account/shared';
import type {
  SendMessageParams,
  SendMessageResult,
  ChatHistoryResult,
  ConfirmBillResult,
  RejectBillResult,
  ConfirmBillParams,
} from './types';

export const chatService = {
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { data } = await api.post<ApiResponse<SendMessageResult>>('/chat/send', params);
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
      params.edits ?? {},
    );
    return data.data;
  },

  async rejectBill(messageId: string): Promise<RejectBillResult> {
    const { data } = await api.post<ApiResponse<RejectBillResult>>(`/chat/reject/${messageId}`);
    return data.data;
  },
};
