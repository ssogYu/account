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
        const parseResults = get().messages.find((m) => m.id === params.messageId)?.metadata
          ?.parseResults;
        const isSingle = parseResults?.length === 1;
        const confirmContent = isSingle ? '确认' : `确认第${params.billIndex + 1}笔`;
        set((state) => ({
          messages: [
            ...state.messages.map((msg) =>
              msg.id === params.messageId
                ? {
                    ...msg,
                    billId: result.billId ?? null,
                    metadata: {
                      ...msg.metadata!,
                      type: msg.metadata!.parseResults!.every(
                        (pr, i) => i === params.billIndex || pr.needsConfirm === false,
                      )
                        ? ('confirmed' as const)
                        : ('confirm_card' as const),
                      parseResults: msg.metadata!.parseResults!.map((pr, i) =>
                        i === params.billIndex
                          ? { ...pr, ...params.edits, needsConfirm: false }
                          : pr,
                      ),
                    },
                  }
                : msg,
            ),
            {
              id: `confirm-${params.messageId}-${params.billIndex}`,
              userId: '',
              role: 'user' as const,
              content: confirmContent,
              billId: result.billId ?? null,
              metadata: null,
              createdAt: new Date().toISOString(),
            },
          ],
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
          messages: [
            ...state.messages.map((msg) =>
              msg.id === params.messageId
                ? {
                    ...msg,
                    billId: result.billIds?.[0] ?? null,
                    metadata: {
                      ...msg.metadata!,
                      type: 'confirmed' as const,
                      parseResults: msg.metadata!.parseResults!.map((pr, i) => {
                        const billEdits = params.edits?.[i];
                        return {
                          ...pr,
                          ...(billEdits || {}),
                          needsConfirm: false,
                        };
                      }),
                    },
                  }
                : msg,
            ),
            {
              id: `confirm-all-${params.messageId}`,
              userId: '',
              role: 'user' as const,
              content: '全部确认',
              billId: result.billIds?.[0] ?? null,
              metadata: null,
              createdAt: new Date().toISOString(),
            },
          ],
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
          return {
            messages: [
              ...updated,
              {
                id: `reject-${messageId}`,
                userId: '',
                role: 'user' as const,
                content: '取消',
                billId: null,
                metadata: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: `reject-reply-${messageId}`,
                userId: '',
                role: 'assistant' as const,
                content: '好的，已取消这些记录。有需要随时告诉我。',
                billId: null,
                metadata: null,
                createdAt: new Date().toISOString(),
              },
            ],
          };
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
