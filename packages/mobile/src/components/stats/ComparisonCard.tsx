import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { MonthlyComparison } from '@/services/bill/stats.types';

interface ComparisonCardProps {
  data: MonthlyComparison;
}

/**
 * 月度对比卡片 - 展示本月 vs 上月收支变化
 */
export function ComparisonCard({ data }: ComparisonCardProps) {
  const { current, previous, expenseChange, incomeChange } = data;

  const renderChange = (change: number, label: string) => {
    const isUp = change > 0;
    const isDown = change < 0;
    const color = label === '支出'
      ? (isUp ? colors.error : isDown ? colors.success : colors.textSecondary)
      : (isUp ? colors.success : isDown ? colors.error : colors.textSecondary);

    return (
      <View style={compStyles.changeWrap}>
        <MaterialCommunityIcons
          name={isUp ? 'trending-up' : isDown ? 'trending-down' : 'trending-neutral'}
          size={14}
          color={color}
        />
        <Text style={[compStyles.changeText, { color }]}>
          {isUp ? '+' : ''}{change.toFixed(1)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={compStyles.card}>
      {/* 支出对比 */}
      <View style={compStyles.row}>
        <View style={compStyles.labelWrap}>
          <View style={[compStyles.dot, { backgroundColor: colors.error }]} />
          <Text style={compStyles.label}>支出</Text>
        </View>
        <View style={compStyles.values}>
          <Text style={compStyles.prevValue}>¥{previous.totalExpense.toFixed(0)}</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textTertiary} />
          <Text style={[compStyles.currentValue, { color: colors.error }]}>
            ¥{current.totalExpense.toFixed(0)}
          </Text>
        </View>
        {renderChange(expenseChange, '支出')}
      </View>

      <View style={compStyles.divider} />

      {/* 收入对比 */}
      <View style={compStyles.row}>
        <View style={compStyles.labelWrap}>
          <View style={[compStyles.dot, { backgroundColor: colors.success }]} />
          <Text style={compStyles.label}>收入</Text>
        </View>
        <View style={compStyles.values}>
          <Text style={compStyles.prevValue}>¥{previous.totalIncome.toFixed(0)}</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textTertiary} />
          <Text style={[compStyles.currentValue, { color: colors.success }]}>
            ¥{current.totalIncome.toFixed(0)}
          </Text>
        </View>
        {renderChange(incomeChange, '收入')}
      </View>
    </View>
  );
}

const compStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    ...shadows.card,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  values: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'center',
  },
  prevValue: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
  currentValue: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  changeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 72,
    justifyContent: 'flex-end',
  },
  changeText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
