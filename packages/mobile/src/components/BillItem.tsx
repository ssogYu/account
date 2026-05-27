import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';
import type { Bill } from '@/services/bill/types';

interface BillItemProps {
  bill: Bill;
  onLongPress?: (id: string) => void;
}

function formatAmount(amount: string | number, type: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const prefix = type === 'expense' ? '-' : '+';
  return `${prefix}¥${num.toFixed(2)}`;
}

export function BillItem({ bill, onLongPress }: BillItemProps) {
  const icon = bill.category?.icon ?? '📝';
  const categoryName = bill.category?.name ?? '其他';

  return (
    <TouchableOpacity
      style={styles.item}
      onLongPress={onLongPress ? () => onLongPress(bill.id) : undefined}
      activeOpacity={0.6}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.category}>{categoryName}</Text>
        {bill.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {bill.note}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.amount,
          bill.type === 'expense' ? styles.amountExpense : styles.amountIncome,
        ]}
      >
        {formatAmount(bill.amount, bill.type)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.fillTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  category: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    marginBottom: 1,
  },
  note: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  amount: {
    ...typography.headline,
    fontSize: 16,
  },
  amountExpense: {
    color: colors.text,
  },
  amountIncome: {
    color: colors.success,
  },
});
