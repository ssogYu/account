import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import type { TodaySummary } from '@/services/bill/types';

interface TodaySummaryCardProps {
  summary: TodaySummary | null;
}

export function TodaySummaryCard({ summary }: TodaySummaryCardProps) {
  const expense = summary?.totalExpense ?? 0;
  const income = summary?.totalIncome ?? 0;
  const balance = summary?.balance ?? 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>今日收支</Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.itemLabel}>支出</Text>
          <Text style={[styles.itemValue, { color: colors.error }]}>
            ¥{expense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.itemLabel}>收入</Text>
          <Text style={[styles.itemValue, { color: colors.success }]}>
            ¥{income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.itemLabel}>结余</Text>
          <Text style={[styles.itemValue, { color: balance >= 0 ? colors.success : colors.error }]}>
            ¥{balance.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  label: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  itemLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  itemValue: {
    ...typography.title3,
    fontWeight: '700',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.separator,
  },
});
