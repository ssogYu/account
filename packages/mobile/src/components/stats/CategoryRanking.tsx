import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { CategoryIcon } from '@/components/icons';
import type { CategoryStatItem } from '@/services/bill/stats.types';
import { CHART_COLORS } from './chartColors';

interface CategoryRankingProps {
  items: CategoryStatItem[];
  onType: 'expense' | 'income';
}

/**
 * 分类排行 - 水平进度条 + 排名
 * 纯 View 实现，直观展示各分类金额对比
 */
export function CategoryRanking({ items, onType }: CategoryRankingProps) {
  const accentColor = onType === 'expense' ? colors.error : colors.success;
  const maxAmount = items.length > 0 ? items[0].amount : 1;

  return (
    <View style={styles.container}>
      {items.slice(0, 8).map((item, i) => {
        const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;

        return (
          <View key={item.categoryId} style={styles.row}>
            {/* 排名 + 图标 */}
            <View style={styles.rankWrap}>
              <Text style={[styles.rank, i < 3 && { color: CHART_COLORS[i] }]}>{i + 1}</Text>
              <View style={[styles.iconBg, { backgroundColor: `${accentColor}1F` }]}>
                <CategoryIcon iconKey={item.categoryIcon} size={16} color={accentColor} />
              </View>
              <Text style={styles.name}>{item.categoryName}</Text>
            </View>

            {/* 进度条 + 金额 */}
            <View style={styles.barWrap}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.amount, { color: accentColor }]}>¥{item.amount.toFixed(0)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md + 2,
  },
  row: {
    gap: spacing.xs + 2,
  },
  rankWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rank: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '500',
  },
  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 16 + spacing.sm + 28 + spacing.sm, // 对齐 rank + icon + gap
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fillTertiary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  amount: {
    ...typography.caption1,
    fontWeight: '700',
    width: 60,
    textAlign: 'right',
  },
});
