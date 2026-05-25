import type { BillType, AccountType } from '../types';

// 系统默认支出分类
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: 'food' },
  { name: '交通', icon: 'transport' },
  { name: '购物', icon: 'shopping' },
  { name: '娱乐', icon: 'entertainment' },
  { name: '居住', icon: 'housing' },
  { name: '医疗', icon: 'medical' },
  { name: '教育', icon: 'education' },
  { name: '通讯', icon: 'telecom' },
  { name: '人情', icon: 'gift' },
  { name: '其他', icon: 'other' },
] as const;

// 系统默认收入分类
export const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: 'salary' },
  { name: '理财', icon: 'investment' },
  { name: '兼职', icon: 'parttime' },
  { name: '红包', icon: 'bonus' },
  { name: '其他', icon: 'other' },
] as const;

// 默认账户类型
export const DEFAULT_ACCOUNT_TYPES: { label: string; type: AccountType }[] = [
  { label: '微信', type: 'wechat' },
  { label: '支付宝', type: 'alipay' },
  { label: '现金', type: 'cash' },
  { label: '银行卡', type: 'bank_card' },
];

// 预算提醒阈值
export const BUDGET_ALERT_THRESHOLDS = {
  WARNING: 0.8,
  EXCEEDED: 1.0,
} as const;

// AI置信度阈值
export const AI_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MID: 0.5,
} as const;

// 记账提醒 - 连续未记账天数
export const REMINDER_INACTIVE_DAYS = 3;
