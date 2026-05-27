import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import type { ParseResult } from '@/services/chat/types';
import { formatDate } from './constants';

export function ConfirmCard({
  parseResult,
  messageId,
  confirmed,
  onConfirm,
  onReject,
}: {
  parseResult: ParseResult;
  messageId: string;
  confirmed: boolean;
  onConfirm: (messageId: string) => void;
  onReject: (messageId: string) => void;
}) {
  const typeLabel = parseResult.type === 'expense' ? '支出' : '收入';
  const isExpense = parseResult.type === 'expense';
  const accentColor = isExpense ? colors.error : colors.success;
  const accentBg = isExpense ? 'rgba(255, 69, 58, 0.12)' : 'rgba(48, 209, 88, 0.12)';

  if (confirmed) {
    return (
      <View style={styles.card}>
        <View style={styles.confirmedRow}>
          <View style={[styles.confirmedBadge, { backgroundColor: accentBg }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color={accentColor} />
          </View>
          <View style={styles.confirmedInfo}>
            <Text style={styles.confirmedTitle}>
              {parseResult.categoryName} {typeLabel} ¥{parseResult.amount.toFixed(2)}
            </Text>
            <Text style={styles.confirmedSub}>已记录</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.categoryWrap}>
          <View style={[styles.categoryIconBg, { backgroundColor: accentBg }]}>
            <CategoryIcon iconKey={parseResult.categoryIcon} size={22} color={accentColor} />
          </View>
          <View style={styles.categoryTextWrap}>
            <Text style={styles.categoryName}>{parseResult.categoryName}</Text>
            <Text style={[styles.typeLabel, { color: accentColor }]}>{typeLabel}</Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: accentColor }]}>
          ¥{parseResult.amount.toFixed(2)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.detailText}>{formatDate(parseResult.date)}</Text>
        </View>
        {parseResult.confidence !== 'high' && (
          <View style={styles.hintWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={styles.hintText}>
              {parseResult.confidence === 'medium' ? '分类待确认' : '请确认信息'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(messageId)}
          activeOpacity={0.6}
        >
          <Text style={styles.rejectText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: accentColor }]}
          onPress={() => onConfirm(messageId)}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
          <Text style={styles.confirmText}>确认记账</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.separator,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextWrap: { gap: 2 },
  categoryName: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
  },
  typeLabel: {
    ...typography.caption1,
    fontWeight: '600',
  },
  amount: {
    ...typography.title2,
    fontWeight: '800',
    letterSpacing: -1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: spacing.sm + 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    ...typography.caption1,
    color: colors.warning,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.fillSecondary,
  },
  rejectText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
  },
  confirmText: {
    ...typography.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedInfo: { gap: 1 },
  confirmedTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
  confirmedSub: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
});
