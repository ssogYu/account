import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCategoryStore } from '@/stores/category';
import { useAccountStore } from '@/stores/account';
import { CategoryIcon } from '@/components/icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddBillModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'expense' | 'income';
    amount: number;
    categoryId: string;
    note?: string;
    account?: string;
    date?: string;
  }) => Promise<unknown>;
  /** 传入已有账单进入编辑模式 */
  billToEdit?: {
    id: string;
    type: 'expense' | 'income';
    amount: number;
    categoryId: string;
    note?: string;
    account?: string;
    date?: string;
  } | null;
}

export function AddBillModal({ visible, onClose, onSubmit, billToEdit }: AddBillModalProps) {
  const categories = useCategoryStore((s) => s.categories);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  const [billType, setBillType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [account, setAccount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.6)).current;

  const filteredCategories = categories.filter((c) => c.type === billType);

  useEffect(() => {
    if (visible) {
      fetchCategories();
      fetchAccounts();
      if (billToEdit) {
        // 编辑模式：预填充数据
        setBillType(billToEdit.type);
        setAmount(String(billToEdit.amount));
        setSelectedCategoryId(billToEdit.categoryId);
        setNote(billToEdit.note ?? '');
        setAccount(billToEdit.account ?? '');
      } else {
        setBillType('expense');
        setAmount('');
        setSelectedCategoryId('');
        setNote('');
        setAccount('');
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      slideY.setValue(SCREEN_HEIGHT * 0.6);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT * 0.6,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleTypeSwitch = (type: 'expense' | 'income') => {
    setBillType(type);
    setSelectedCategoryId('');
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!selectedCategoryId) return;

    setIsSaving(true);
    try {
      await onSubmit({
        type: billType,
        amount: numAmount,
        categoryId: selectedCategoryId,
        note: note.trim() || undefined,
        account: account || undefined,
      });
      handleClose();
    } catch {
      // store 已处理
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = parseFloat(amount) > 0 && selectedCategoryId;

  return (
    <Modal visible={visible} animationType="none" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.backdrop, { opacity }]}>
          <Pressable style={s.backdropTouch} onPress={handleClose} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
            <View style={s.handleArea}>
              <View style={s.handle} />
            </View>

            <View style={s.header}>
              <Text style={s.headerTitle}>{billToEdit ? '编辑账单' : '记一笔'}</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.headerClose}>取消</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 类型切换 */}
              <View style={s.typeSwitch}>
                <TouchableOpacity
                  style={[s.typeBtn, billType === 'expense' && s.typeBtnActive]}
                  onPress={() => handleTypeSwitch('expense')}
                  activeOpacity={0.6}
                >
                  <Text style={[s.typeBtnText, billType === 'expense' && s.typeBtnTextActive]}>
                    支出
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, billType === 'income' && s.typeBtnIncomeActive]}
                  onPress={() => handleTypeSwitch('income')}
                  activeOpacity={0.6}
                >
                  <Text style={[s.typeBtnText, billType === 'income' && s.typeBtnTextIncomeActive]}>
                    收入
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 金额 */}
              <View style={s.amountSection}>
                <Text style={s.amountPrefix}>¥</Text>
                <TextInput
                  style={s.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  autoFocus
                  maxLength={12}
                />
              </View>

              {/* 分类 */}
              <View style={s.fieldSection}>
                <Text style={s.fieldLabel}>分类</Text>
                <View style={s.categoryGrid}>
                  {filteredCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        s.categoryItem,
                        selectedCategoryId === cat.id && s.categoryItemActive,
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      activeOpacity={0.6}
                    >
                      <CategoryIcon
                        iconKey={cat.icon}
                        size={22}
                        color={selectedCategoryId === cat.id ? colors.accent : colors.textSecondary}
                      />
                      <Text
                        style={[
                          s.categoryName,
                          selectedCategoryId === cat.id && s.categoryNameActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 账户 */}
              <View style={s.fieldSection}>
                <Text style={s.fieldLabel}>账户</Text>
                <View style={s.accountRow}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[s.accountItem, account === acc.name && s.accountItemActive]}
                      onPress={() => setAccount(acc.name === account ? '' : acc.name)}
                      activeOpacity={0.6}
                    >
                      <Text style={[s.accountText, account === acc.name && s.accountTextActive]}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 备注 */}
              <View style={s.fieldSection}>
                <Input
                  label="备注"
                  placeholder="添加备注（选填）"
                  value={note}
                  onChangeText={setNote}
                  maxLength={50}
                />
              </View>

              {/* 保存按钮 */}
              <Button
                title={isSaving ? '保存中...' : '保存'}
                onPress={handleSubmit}
                disabled={!canSubmit || isSaving}
                loading={isSaving}
                style={{ marginTop: spacing.sm }}
              />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: SCREEN_HEIGHT * 0.85,
    ...shadows.elevated,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textQuaternary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  headerClose: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 20,
  },

  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  typeBtnActive: {
    backgroundColor: colors.accent,
  },
  typeBtnIncomeActive: {
    backgroundColor: colors.success,
  },
  typeBtnText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  typeBtnTextIncomeActive: {
    color: '#FFFFFF',
  },

  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  amountPrefix: {
    ...typography.title1,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...typography.title1,
    color: colors.text,
    padding: 0,
  },

  fieldSection: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  categoryItemActive: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  categoryName: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  categoryNameActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  accountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accountItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.xs,
    backgroundColor: colors.bgElevated,
  },
  accountItemActive: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  accountText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  accountTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
});
