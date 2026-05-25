// 账单类型
export type BillType = 'income' | 'expense';

// 账单来源
export type BillSource = 'manual' | 'ai';

// 账单可见性
export type BillVisibility = 'private' | 'family';

// AI置信度
export type AIConfidence = 'high' | 'mid' | 'low';

// 家庭组角色
export type FamilyRole = 'owner' | 'member';

// 账户类型
export type AccountType = 'wechat' | 'alipay' | 'cash' | 'bank_card' | 'other';
