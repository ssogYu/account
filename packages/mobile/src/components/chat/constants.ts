import type { ChatMessage } from '@/services/chat/types';

// ── 欢迎消息 ──

export const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    userId: '',
    role: 'assistant',
    content:
      '你好！我是你的智能记账助手\n\n直接告诉我你的消费，比如：\n• 午饭花了25\n• 打车15元\n• 收到工资8000\n\n我会帮你自动识别并记录。',
    billId: null,
    metadata: { type: 'guide' },
    createdAt: new Date().toISOString(),
  },
];

// ── 快捷输入 ──

export const QUICK_INPUTS = [
  { label: '午饭', text: '午饭花了' },
  { label: '打车', text: '打车' },
  { label: '奶茶', text: '奶茶' },
  { label: '工资', text: '收到工资' },
];

// ── 导航菜单项 ──

export const NAV_ITEMS = [
  { key: 'home', label: '首页', icon: 'message-text-outline', route: '/(tabs)' },
  { key: 'stats', label: '统计', icon: 'chart-bar', route: '/(tabs)/stats' },
  { key: 'profile', label: '我的', icon: 'account-outline', route: '/(tabs)/profile' },
] as const;

// ── 工具函数 ──

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return '今天';
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
