/** 账单分类与账户常量 */

export interface CategoryItem {
  key: string;
  icon: string;
}

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { key: '餐饮', icon: '🍜' },
  { key: '交通', icon: '🚗' },
  { key: '购物', icon: '🛒' },
  { key: '娱乐', icon: '🎮' },
  { key: '居住', icon: '🏠' },
  { key: '医疗', icon: '💊' },
  { key: '教育', icon: '📚' },
  { key: '通讯', icon: '📱' },
  { key: '服饰', icon: '👔' },
  { key: '美容', icon: '💄' },
  { key: '运动', icon: '⚽' },
  { key: '其他', icon: '📝' },
];

export const INCOME_CATEGORIES: CategoryItem[] = [
  { key: '工资', icon: '💰' },
  { key: '理财', icon: '📈' },
  { key: '兼职', icon: '💼' },
  { key: '红包', icon: '🧧' },
  { key: '退款', icon: '↩️' },
  { key: '其他', icon: '📝' },
];

export const ACCOUNTS = ['微信', '支付宝', '现金', '银行卡'] as const;

/** 分类 → 图标映射（用于列表展示） */
const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
export const CATEGORY_ICON_MAP: Record<string, string> = {};
for (const cat of allCategories) {
  if (!(cat.key in CATEGORY_ICON_MAP)) {
    CATEGORY_ICON_MAP[cat.key] = cat.icon;
  }
}
