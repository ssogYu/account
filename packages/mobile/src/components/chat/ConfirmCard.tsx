import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import { useCategoryStore } from '@/stores/category';
import { useAccountStore } from '@/stores/account';
import type { ParseResult } from '@/services/chat/types';
import { formatDate } from './constants';

interface ConfirmCardEdits {
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  amount?: number;
  note?: string;
  accountName?: string;
}

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
  onConfirm: (messageId: string, edits?: ConfirmBillEdits) => void;
  onReject: (messageId: string) => void;
}) {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const [edits, setEdits] = useState<ConfirmCardEdits>({});
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const currentCategoryId = edits.categoryId ?? parseResult.categoryId;
  const currentCategoryName = edits.categoryName ?? parseResult.categoryName;
  const currentCategoryIcon = edits.categoryIcon ?? parseResult.categoryIcon;
  const currentAmount = edits.amount ?? parseResult.amount;
  const currentAccountName = edits.accountName ?? parseResult.accountName ?? '';

  const isExpense = parseResult.type === 'expense';
  const accentColor = isExpense ? colors.error : colors.success;

  const filteredCategories = categories.filter((c) => c.type === parseResult.type);

  const handleCategorySelect = (cat: { id: string; name: string; icon: string }) => {
    setEdits((prev) => ({
      ...prev,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
    }));
    setCategoryPickerVisible(false);
  };

  const handleAccountSelect = (accName: string) => {
    setEdits((prev) => ({
      ...prev,
      accountName: accName,
    }));
    setAccountPickerVisible(false);
  };

  const handleConfirm = () => {
    const hasEdits = edits.categoryId || edits.amount || edits.note || edits.accountName;
    onConfirm(messageId, hasEdits ? edits : undefined);
  };

  if (confirmed) {
    return (
      <View style={s.card}>
        <View style={s.confirmedInner}>
          <View style={[s.confirmedDot, { backgroundColor: accentColor }]} />
          <Text style={s.confirmedText}>
            {currentCategoryName} · ¥{currentAmount.toFixed(2)} · 已记录
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.amountRow}>
        <Text style={[s.amountSign, { color: accentColor }]}>¥</Text>
        <Text style={[s.amountValue, { color: accentColor }]}>{currentAmount.toFixed(2)}</Text>
        <View
          style={[
            s.typeTag,
            { backgroundColor: isExpense ? 'rgba(255,69,58,0.10)' : 'rgba(48,209,88,0.10)' },
          ]}
        >
          <Text style={[s.typeTagText, { color: accentColor }]}>{isExpense ? '支出' : '收入'}</Text>
        </View>
      </View>

      <View style={s.fields}>
        <TouchableOpacity
          style={s.fieldRow}
          onPress={() => {
            setCategoryPickerVisible(!categoryPickerVisible);
            setAccountPickerVisible(false);
          }}
          activeOpacity={0.5}
        >
          <Text style={s.fieldLabel}>分类</Text>
          <View style={s.fieldRight}>
            <View
              style={[
                s.fieldIconBg,
                { backgroundColor: isExpense ? 'rgba(255,69,58,0.08)' : 'rgba(48,209,88,0.08)' },
              ]}
            >
              <CategoryIcon iconKey={currentCategoryIcon} size={14} color={accentColor} />
            </View>
            <Text style={s.fieldValue}>{currentCategoryName}</Text>
            <MaterialCommunityIcons
              name={categoryPickerVisible ? 'chevron-up' : 'chevron-right'}
              size={16}
              color={colors.textQuaternary}
            />
          </View>
        </TouchableOpacity>

        {categoryPickerVisible && (
          <View style={s.pickerWrap}>
            {filteredCategories.map((cat) => {
              const active = cat.id === currentCategoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.pickerChip, active && s.pickerChipActive]}
                  onPress={() => handleCategorySelect(cat)}
                  activeOpacity={0.6}
                >
                  <CategoryIcon
                    iconKey={cat.icon}
                    size={13}
                    color={active ? accentColor : colors.textTertiary}
                  />
                  <Text style={[s.pickerChipText, active && s.pickerChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={s.fieldDivider} />

        <TouchableOpacity
          style={s.fieldRow}
          onPress={() => {
            setAccountPickerVisible(!accountPickerVisible);
            setCategoryPickerVisible(false);
          }}
          activeOpacity={0.5}
        >
          <Text style={s.fieldLabel}>账户</Text>
          <View style={s.fieldRight}>
            <Text style={[s.fieldValue, !currentAccountName && s.fieldPlaceholder]}>
              {currentAccountName || '未选择'}
            </Text>
            <MaterialCommunityIcons
              name={accountPickerVisible ? 'chevron-up' : 'chevron-right'}
              size={16}
              color={colors.textQuaternary}
            />
          </View>
        </TouchableOpacity>

        {accountPickerVisible && (
          <View style={s.pickerWrap}>
            {accounts.map((acc) => {
              const active = acc.name === currentAccountName;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[s.pickerChip, active && s.pickerChipActive]}
                  onPress={() => handleAccountSelect(acc.name)}
                  activeOpacity={0.6}
                >
                  <Text style={[s.pickerChipText, active && s.pickerChipTextActive]}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <MaterialCommunityIcons name="calendar-outline" size={11} color={colors.textQuaternary} />
          <Text style={s.metaText}>{formatDate(parseResult.date)}</Text>
        </View>
        {parseResult.confidence !== 'high' && (
          <View style={s.metaItem}>
            <MaterialCommunityIcons name="information-outline" size={11} color={colors.warning} />
            <Text style={s.metaHint}>待确认</Text>
          </View>
        )}
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => onReject(messageId)}
          activeOpacity={0.6}
        >
          <Text style={s.cancelText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.confirmBtn, { backgroundColor: accentColor }]}
          onPress={handleConfirm}
          activeOpacity={0.6}
        >
          <Text style={s.confirmText}>确认记账</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export type ConfirmBillEdits = ConfirmCardEdits;

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  amountSign: {
    ...typography.title3,
    fontWeight: '600',
    marginRight: 2,
  },
  amountValue: {
    ...typography.largeTitle,
    fontWeight: '700',
    letterSpacing: -1,
  },
  typeTag: {
    marginLeft: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  fields: {
    backgroundColor: colors.fillTertiary,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldLabel: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontWeight: '500',
    fontSize: 13,
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldValue: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '500',
  },
  fieldPlaceholder: {
    color: colors.textQuaternary,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginHorizontal: 14,
  },

  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.bgElevated,
  },
  pickerChipActive: {
    backgroundColor: colors.accentSubtle,
  },
  pickerChipText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  pickerChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: colors.textQuaternary,
  },
  metaHint: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '500',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.fillSecondary,
  },
  cancelText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  confirmText: {
    ...typography.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  confirmedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confirmedText: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
});
