import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { CategoryIcon } from '@/components/icons';
import type { CategoryStatItem } from '@/services/bill/stats.types';
import { CHART_COLORS } from './chartColors';

interface CategoryBreakdownProps {
  items: CategoryStatItem[];
  totalAmount: number;
  onType: 'expense' | 'income';
}

/**
 * 分类占比图 - 水平堆叠条 + 分类排行列表
 * 纯 View 实现，无需 SVG 依赖
 */
export function CategoryBreakdown({ items, totalAmount, onType }: CategoryBreakdownProps) {
  const accentColor = onType === 'expense' ? colors.error : colors.success;

  return (
    <View style={styles.container}>
      {/* 堆叠条 */}
      <View style={styles.stackedBar}>
        {items.map((item, i) => {
          const width = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
          if (width <= 0) return null;
          return (
            <View
              key={item.categoryId}
              style={[
                styles.barSegment,
                {
                  width: `${width}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                },
              ]}
            />
          );
        })}
      </View>

      {/* 分类排行列表 */}
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={item.categoryId} style={styles.listItem}>
            <View style={styles.listLeft}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] },
                ]}
              />
              <View style={[styles.iconBg, { backgroundColor: `${accentColor}1F` }]}>
                <CategoryIcon iconKey={item.categoryIcon} size={16} color={accentColor} />
              </View>
              <Text style={styles.categoryName}>{item.categoryName}</Text>
            </View>
            <View style={styles.listRight}>
              <Text style={[styles.amount, { color: accentColor }]}>¥{item.amount.toFixed(0)}</Text>
              <Text style={styles.percentage}>{item.percentage.toFixed(1)}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.fillTertiary,
  },
  barSegment: {
    height: '100%',
  },
  list: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '500',
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amount: {
    ...typography.footnote,
    fontWeight: '700',
  },
  percentage: {
    ...typography.caption1,
    color: colors.textTertiary,
    width: 48,
    textAlign: 'right',
  },
});
