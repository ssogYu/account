import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import { useCategoryStore } from '@/stores/category';
import { useAccountStore } from '@/stores/account';
import type { ParseResult } from '@/services/chat/types';
import { formatDate } from './constants';

interface BillEdits {
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  amount?: number;
  note?: string;
  accountName?: string;
  accountId?: string;
}

interface BillItemState {
  parse: ParseResult;
  edits: BillEdits;
  confirmed: boolean;
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
}

export function ConfirmCard({
  parseResults,
  messageId,
  confirmed,
  onConfirm,
  onConfirmAll,
  onReject,
}: {
  parseResults: ParseResult[];
  messageId: string;
  confirmed: boolean;
  onConfirm: (messageId: string, billIndex: number, edits?: BillEdits) => void;
  onConfirmAll: (messageId: string) => void;
  onReject: (messageId: string) => void;
}) {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const [billStates, setBillStates] = useState<BillItemState[]>(
    parseResults.map((parse) => ({
      parse,
      edits: {},
      confirmed: false,
      categoryPickerVisible: false,
      accountPickerVisible: false,
    })),
  );

  const isMulti = parseResults.length > 1;
  const allConfirmed = billStates.every((s) => s.confirmed);
  const totalAmount = parseResults.reduce((sum, p) => sum + p.amount, 0);

  const updateBillState = (index: number, updates: Partial<BillItemState>) => {
    setBillStates((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleCategorySelect = (
    billIndex: number,
    cat: { id: string; name: string; icon: string },
  ) => {
    updateBillState(billIndex, {
      edits: {
        ...billStates[billIndex].edits,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
      },
      categoryPickerVisible: false,
    });
  };

  const handleAccountSelect = (billIndex: number, acc: { id: string; name: string }) => {
    updateBillState(billIndex, {
      edits: {
        ...billStates[billIndex].edits,
        accountName: acc.name,
        accountId: acc.id,
      },
      accountPickerVisible: false,
    });
  };

  const handleConfirmSingle = (billIndex: number) => {
    const state = billStates[billIndex];
    const edits = state.edits;
    const hasEdits = edits.categoryId || edits.amount || edits.note || edits.accountName;
    onConfirm(messageId, billIndex, hasEdits ? edits : undefined);
    updateBillState(billIndex, { confirmed: true });
  };

  const handleConfirmAll = () => {
    onConfirmAll(messageId);
    setBillStates((prev) => prev.map((s) => ({ ...s, confirmed: true })));
  };

  if (confirmed || allConfirmed) {
    if (isMulti) {
      return (
        <View style={s.card}>
          <View style={s.confirmedInner}>
            <View style={[s.confirmedDot, { backgroundColor: colors.success }]} />
            <Text style={s.confirmedText}>
              {parseResults.length} 笔已记录 · 合计 ¥{totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      );
    }
    const parse = parseResults[0];
    return (
      <View style={s.card}>
        <View style={s.confirmedInner}>
          <View
            style={[
              s.confirmedDot,
              { backgroundColor: parse.type === 'expense' ? colors.error : colors.success },
            ]}
          />
          <Text style={s.confirmedText}>
            {parse.categoryName} · ¥{parse.amount.toFixed(2)} · 已记录
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {isMulti && (
        <View style={s.multiHeader}>
          <Text style={s.multiHeaderText}>识别到 {parseResults.length} 笔消费</Text>
          <Text style={s.multiHeaderTotal}>合计 ¥{totalAmount.toFixed(2)}</Text>
        </View>
      )}

      <ScrollView
        style={isMulti ? s.billsList : undefined}
        scrollEnabled={isMulti}
        nestedScrollEnabled
      >
        {billStates.map((state, index) => {
          const parse = state.parse;
          const edits = state.edits;
          const currentCategoryId = edits.categoryId ?? parse.categoryId;
          const currentCategoryName = edits.categoryName ?? parse.categoryName;
          const currentCategoryIcon = edits.categoryIcon ?? parse.categoryIcon;
          const currentAmount = edits.amount ?? parse.amount;
          const currentAccountName = edits.accountName ?? parse.accountName ?? '';
          const currentAccountId = edits.accountId ?? parse.accountId ?? '';
          const isExpense = parse.type === 'expense';
          const accentColor = isExpense ? colors.error : colors.success;
          const filteredCategories = categories.filter((c) => c.type === parse.type);

          return (
            <View key={index} style={isMulti ? s.billItemContainer : undefined}>
              {isMulti && index > 0 && <View style={s.billDivider} />}

              <View style={s.amountRow}>
                <Text style={[s.amountSign, { color: accentColor }]}>¥</Text>
                <Text style={[s.amountValue, { color: accentColor }]}>
                  {currentAmount.toFixed(2)}
                </Text>
                <View
                  style={[
                    s.typeTag,
                    {
                      backgroundColor: isExpense ? 'rgba(255,69,58,0.10)' : 'rgba(48,209,88,0.10)',
                    },
                  ]}
                >
                  <Text style={[s.typeTagText, { color: accentColor }]}>
                    {isExpense ? '支出' : '收入'}
                  </Text>
                </View>
                {isMulti && state.confirmed && (
                  <View style={s.confirmedBadge}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                  </View>
                )}
              </View>

              <View style={s.fields}>
                <TouchableOpacity
                  style={s.fieldRow}
                  onPress={() => {
                    updateBillState(index, {
                      categoryPickerVisible: !state.categoryPickerVisible,
                      accountPickerVisible: false,
                    });
                  }}
                  activeOpacity={0.5}
                >
                  <Text style={s.fieldLabel}>分类</Text>
                  <View style={s.fieldRight}>
                    <View
                      style={[
                        s.fieldIconBg,
                        {
                          backgroundColor: isExpense
                            ? 'rgba(255,69,58,0.08)'
                            : 'rgba(48,209,88,0.08)',
                        },
                      ]}
                    >
                      <CategoryIcon iconKey={currentCategoryIcon} size={14} color={accentColor} />
                    </View>
                    <Text style={s.fieldValue}>{currentCategoryName}</Text>
                    <MaterialCommunityIcons
                      name={state.categoryPickerVisible ? 'chevron-up' : 'chevron-right'}
                      size={16}
                      color={colors.textQuaternary}
                    />
                  </View>
                </TouchableOpacity>

                {state.categoryPickerVisible && (
                  <View style={s.pickerWrap}>
                    {filteredCategories.map((cat) => {
                      const active = cat.id === currentCategoryId;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[s.pickerChip, active && s.pickerChipActive]}
                          onPress={() => handleCategorySelect(index, cat)}
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
                    updateBillState(index, {
                      accountPickerVisible: !state.accountPickerVisible,
                      categoryPickerVisible: false,
                    });
                  }}
                  activeOpacity={0.5}
                >
                  <Text style={s.fieldLabel}>账户</Text>
                  <View style={s.fieldRight}>
                    <Text style={[s.fieldValue, !currentAccountName && s.fieldPlaceholder]}>
                      {currentAccountName || '未选择'}
                    </Text>
                    <MaterialCommunityIcons
                      name={state.accountPickerVisible ? 'chevron-up' : 'chevron-right'}
                      size={16}
                      color={colors.textQuaternary}
                    />
                  </View>
                </TouchableOpacity>

                {state.accountPickerVisible && (
                  <View style={s.pickerWrap}>
                    {accounts.map((acc) => {
                      const active = acc.id === currentAccountId;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[s.pickerChip, active && s.pickerChipActive]}
                          onPress={() => handleAccountSelect(index, acc)}
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
                  <MaterialCommunityIcons
                    name="calendar-outline"
                    size={11}
                    color={colors.textQuaternary}
                  />
                  <Text style={s.metaText}>{formatDate(parse.date)}</Text>
                </View>
                {parse.confidence !== 'high' && (
                  <View style={s.metaItem}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={11}
                      color={colors.warning}
                    />
                    <Text style={s.metaHint}>待确认</Text>
                  </View>
                )}
              </View>

              {isMulti && !state.confirmed && (
                <TouchableOpacity
                  style={[s.singleConfirmBtn, { borderColor: accentColor }]}
                  onPress={() => handleConfirmSingle(index)}
                  activeOpacity={0.6}
                >
                  <Text style={[s.singleConfirmText, { color: accentColor }]}>确认此笔</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={s.actions}>
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => onReject(messageId)}
          activeOpacity={0.6}
        >
          <Text style={s.cancelText}>取消</Text>
        </TouchableOpacity>
        {isMulti ? (
          <TouchableOpacity
            style={[s.confirmBtn, { backgroundColor: colors.accent }]}
            onPress={handleConfirmAll}
            activeOpacity={0.6}
          >
            <Text style={s.confirmText}>全部确认（{parseResults.length}笔）</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              s.confirmBtn,
              {
                backgroundColor: parseResults[0].type === 'expense' ? colors.error : colors.success,
              },
            ]}
            onPress={() => handleConfirmSingle(0)}
            activeOpacity={0.6}
          >
            <Text style={s.confirmText}>确认记账</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export type ConfirmBillEdits = BillEdits;

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },

  multiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  multiHeaderText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  multiHeaderTotal: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontWeight: '700',
  },

  billsList: {
    maxHeight: 400,
  },
  billItemContainer: {},
  billDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: 12,
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
  confirmedBadge: {
    marginLeft: 8,
    alignSelf: 'center',
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

  singleConfirmBtn: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  singleConfirmText: {
    fontSize: 12,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
