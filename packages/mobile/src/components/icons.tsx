import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '@/theme';

/** 图标标识符 → MaterialCommunityIcons 映射 */
export const CATEGORY_ICON_MAP: Record<
  string,
  {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
  }
> = {
  // ── 支出分类 ──
  meal: { icon: 'food', label: '餐饮' },
  transport: { icon: 'car', label: '交通' },
  shopping: { icon: 'shopping', label: '购物' },
  entertain: { icon: 'gamepad-variant', label: '娱乐' },
  housing: { icon: 'home', label: '居住' },
  medical: { icon: 'medical-bag', label: '医疗' },
  education: { icon: 'school', label: '教育' },
  telecom: { icon: 'cellphone', label: '通讯' },
  clothing: { icon: 'tshirt-crew', label: '服饰' },
  beauty: { icon: 'lipstick', label: '美容' },
  sport: { icon: 'soccer', label: '运动' },
  other_exp: { icon: 'dots-horizontal', label: '其他' },

  // ── 收入分类 ──
  salary: { icon: 'cash', label: '工资' },
  finance: { icon: 'chart-line', label: '理财' },
  parttime: { icon: 'briefcase-outline', label: '兼职' },
  redpacket: { icon: 'gift', label: '红包' },
  refund: { icon: 'keyboard-return', label: '退款' },
  other_inc: { icon: 'dots-horizontal', label: '其他' },

  // ── 额外可选图标 ──
  travel: { icon: 'airplane', label: '旅行' },
  movie: { icon: 'movie-open', label: '电影' },
  pet: { icon: 'dog', label: '宠物' },
  baby: { icon: 'baby-face-outline', label: '宝宝' },
  love: { icon: 'heart', label: '爱心' },
  repair: { icon: 'wrench', label: '维修' },
};

/** 可选图标标识符列表（用于分类管理弹窗） */
export const ICON_OPTIONS = [
  'meal',
  'transport',
  'shopping',
  'entertain',
  'housing',
  'medical',
  'education',
  'telecom',
  'clothing',
  'beauty',
  'sport',
  'other_exp',
  'salary',
  'finance',
  'parttime',
  'redpacket',
  'refund',
  'other_inc',
  'travel',
  'movie',
  'pet',
  'baby',
  'love',
  'repair',
];

/** 渲染分类图标 */
export function CategoryIcon({
  iconKey,
  size = 22,
  color = colors.text,
}: {
  iconKey: string;
  size?: number;
  color?: string;
}) {
  const mapping = CATEGORY_ICON_MAP[iconKey];
  if (mapping) {
    return <MaterialCommunityIcons name={mapping.icon} size={size} color={color} />;
  }
  // 兼容旧数据：如果 iconKey 是 emoji，回退显示默认图标
  return <MaterialCommunityIcons name="help-circle-outline" size={size} color={color} />;
}
