import { create } from 'zustand';
import axios from 'axios';
import { chatService } from '@/services/chat';
import type {
  ChatMessage,
  SendMessageResult,
  ConfirmBillParams,
  ConfirmAllBillsParams,
} from '@/services/chat/types';
import { AppError } from '@/services/api';
import { useBillStore } from '@/stores/bill';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  abortController: AbortController | null;

  fetchHistory: () => Promise<void>;
  sendMessage: (content: string) => Promise<SendMessageResult | null>;
  cancelSend: () => void;
  confirmBill: (params: ConfirmBillParams) => Promise<boolean>;
  confirmAllBills: (params: ConfirmAllBillsParams) => Promise<boolean>;
  rejectBill: (messageId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  abortController: null,

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
    const controller = new AbortController();
    set({ isSending: true, error: null, abortController: controller });
    try {
      const result = await chatService.sendMessage({ content }, controller.signal);
      set((state) => ({
        messages: [...state.messages, result.userMessage, result.assistantMessage],
        isSending: false,
        abortController: null,
      }));
      return result;
    } catch (err) {
      if (axios.isCancel(err)) {
        set({ isSending: false, abortController: null });
        return null;
      }
      const message = err instanceof AppError ? err.message : '发送消息失败';
      set({ error: message, isSending: false, abortController: null });
      return null;
    }
  },

  cancelSend() {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isSending: false, abortController: null });
    }
  },

  async confirmBill(params: ConfirmBillParams) {
    try {
      const result = await chatService.confirmBill(params);
      if (result.confirmed) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === params.messageId
              ? {
                  ...msg,
                  billId: result.billId ?? null,
                  metadata: {
                    ...msg.metadata!,
                    type: 'confirmed' as const,
                    parseResults: msg.metadata!.parseResults!.map((pr, i) =>
                      i === params.billIndex
                        ? { ...pr, ...params.edits, needsConfirm: false }
                        : pr,
                    ),
                  },
                }
              : msg,
          ),
        }));
        useBillStore.getState().fetchTodaySummary();
      }
      return result.confirmed;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '确认账单失败';
      set({ error: message });
      return false;
    }
  },

  async confirmAllBills(params: ConfirmAllBillsParams) {
    try {
      const result = await chatService.confirmAllBills(params);
      if (result.confirmed) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === params.messageId
              ? {
                  ...msg,
                  billId: result.billIds?.[0] ?? null,
                  metadata: {
                    ...msg.metadata!,
                    type: 'confirmed' as const,
                    parseResults: msg.metadata!.parseResults!.map((pr) => ({
                      ...pr,
                      needsConfirm: false,
                    })),
                  },
                }
              : msg,
          ),
        }));
        useBillStore.getState().fetchTodaySummary();
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
        set((state) => {
          const updated = state.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, metadata: { ...msg.metadata!, type: 'rejected' as const } }
              : msg,
          );
          return { messages: updated };
        });
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
