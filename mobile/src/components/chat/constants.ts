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

export function formatDate(dateStr: string): string {
  // 直接解析避免 new Date() 的 UTC 时区偏移
  const [yStr, mStr, dStr] = dateStr.split('T')[0]!.split('-');
  const year = parseInt(yStr!);
  const month = parseInt(mStr!);
  const day = parseInt(dStr!);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  const dateKey = `${year}-${month}-${day}`;

  if (dateKey === todayKey) return '今天';
  if (dateKey === yesterdayKey) return '昨天';
  return `${month}月${day}日`;
}
