import { create } from 'zustand';
import { chatService } from '@/services/chat';
import type { ChatMessage, SendMessageResult, ConfirmBillParams } from '@/services/chat/types';
import { AppError } from '@/services/api';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchHistory: () => Promise<void>;
  sendMessage: (content: string) => Promise<SendMessageResult | null>;
  confirmBill: (params: ConfirmBillParams) => Promise<boolean>;
  rejectBill: (messageId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  async fetchHistory() {
    set({ isLoading: true, error: null });
    try {
      const result = await chatService.getHistory(50);
      set({ messages: result.items, isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '获取对话历史失败';
      set({ error: message, isLoading: false });
    }
  },

  async sendMessage(content: string) {
    set({ isSending: true, error: null });
    try {
      const result = await chatService.sendMessage({ content });
      set((state) => ({
        messages: [...state.messages, result.userMessage, result.assistantMessage],
        isSending: false,
      }));
      return result;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '发送消息失败';
      set({ error: message, isSending: false });
      return null;
    }
  },

  async confirmBill(params: ConfirmBillParams) {
    try {
      const result = await chatService.confirmBill(params);
      if (result.confirmed) {
        // 确认成功后刷新历史（后端会新增确认和已记录两条消息）
        const history = await chatService.getHistory(50);
        set({ messages: history.items });
      }
      return result.confirmed;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '确认账单失败';
      set({ error: message });
      return false;
    }
  },

  async rejectBill(messageId: string) {
    try {
      const result = await chatService.rejectBill(messageId);
      if (result.rejected) {
        // 取消后刷新历史
        const history = await chatService.getHistory(50);
        set({ messages: history.items });
      }
      return result.rejected;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '取消失败';
      set({ error: message });
      return false;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
