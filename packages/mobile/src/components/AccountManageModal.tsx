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
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useAccountStore } from '@/stores/account';
import type { Account } from '@/services/account/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ACCOUNT_ICON_OPTIONS = [
  'wechat',
  'alipay',
  'cash',
  'bank-card',
  'credit-card',
  'wallet',
  'apple',
  'google',
] as const;

interface AccountManageModalProps {
  visible: boolean;
  onClose: () => void;
}

function AccountIcon({
  iconKey,
  size = 22,
  color,
}: {
  iconKey: string;
  size?: number;
  color: string;
}) {
  const iconMap: Record<string, string> = {
    wechat: 'wechat',
    alipay: 'alipay',
    cash: 'cash',
    bank_card: 'bank-card-outline',
    credit_card: 'credit-card-outline',
    wallet: 'wallet-outline',
    apple: 'apple',
    google: 'google',
  };
  return (
    <MaterialCommunityIcons
      name={(iconMap[iconKey] as keyof typeof MaterialCommunityIcons.glyphMap) || 'wallet-outline'}
      size={size}
      color={color}
    />
  );
}

export function AccountManageModal({ visible, onClose }: AccountManageModalProps) {
  const accounts = useAccountStore((s) => s.accounts);
  const isLoading = useAccountStore((s) => s.isLoading);
  const storeError = useAccountStore((s) => s.error);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const createAccount = useAccountStore((s) => s.createAccount);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);
  const clearError = useAccountStore((s) => s.clearError);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('wallet');

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.6)).current;

  const systemAccounts = accounts.filter((a) => a.isSystem);
  const customAccounts = accounts.filter((a) => !a.isSystem);

  useEffect(() => {
    if (visible) {
      fetchAccounts();
      resetForm();
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
    setShowAddForm(false);
    resetForm();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT * 0.6,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const resetForm = () => {
    setFormName('');
    setFormIcon('wallet');
    setEditingId(null);
    setShowAddForm(false);
    clearError();
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormIcon('wallet');
    setShowAddForm(true);
  };

  const handleEdit = (acc: Account) => {
    setEditingId(acc.id);
    setFormName(acc.name);
    setFormIcon(acc.icon);
    setShowAddForm(true);
  };

  const handleDelete = (acc: Account) => {
    Alert.alert('删除账户', `确定删除"${acc.name}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(acc.id);
          } catch {
            // store 已处理
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) return;

    try {
      if (editingId) {
        await updateAccount(editingId, { name, icon: formIcon });
      } else {
        await createAccount({ name, icon: formIcon });
      }
      resetForm();
    } catch {
      // store 已处理
    }
  };

  const isFormValid = formName.trim().length > 0;

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
              <Text style={s.headerTitle}>账户管理</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.headerClose}>完成</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 系统默认 */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>系统默认</Text>
                <View style={s.accountList}>
                  {systemAccounts.map((acc) => (
                    <View key={acc.id} style={s.accountItem}>
                      <View style={s.accountIconWrap}>
                        <AccountIcon iconKey={acc.icon} size={20} color={colors.textSecondary} />
                      </View>
                      <Text style={s.accountName}>{acc.name}</Text>
                      <View style={s.systemBadge}>
                        <Text style={s.systemBadgeText}>默认</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* 自定义 */}
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>自定义账户</Text>
                  <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.6}>
                    <Text style={s.addBtnText}>+ 添加</Text>
                  </TouchableOpacity>
                </View>

                {customAccounts.length === 0 && !showAddForm ? (
                  <Text style={s.emptyText}>暂无自定义账户，点击上方添加</Text>
                ) : (
                  <View style={s.accountList}>
                    {customAccounts.map((acc) => (
                      <View key={acc.id} style={s.accountItem}>
                        <View style={s.accountIconWrap}>
                          <AccountIcon iconKey={acc.icon} size={20} color={colors.textSecondary} />
                        </View>
                        <Text style={s.accountName}>{acc.name}</Text>
                        <View style={s.itemActions}>
                          <TouchableOpacity
                            onPress={() => handleEdit(acc)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 3 }}
                          >
                            <Text style={s.editText}>编辑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(acc)}
                            hitSlop={{ top: 6, bottom: 6, left: 3, right: 6 }}
                          >
                            <Text style={s.deleteText}>删除</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {showAddForm && (
                  <View style={s.form}>
                    <Text style={s.formTitle}>{editingId ? '编辑账户' : '新建账户'}</Text>

                    <Text style={s.formLabel}>图标</Text>
                    <View style={s.iconGrid}>
                      {ACCOUNT_ICON_OPTIONS.map((iconKey) => (
                        <TouchableOpacity
                          key={iconKey}
                          style={[s.iconOption, formIcon === iconKey && s.iconOptionActive]}
                          onPress={() => setFormIcon(iconKey)}
                          activeOpacity={0.6}
                        >
                          <AccountIcon
                            iconKey={iconKey}
                            size={18}
                            color={formIcon === iconKey ? colors.accent : colors.textSecondary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={s.formLabel}>名称</Text>
                    <TextInput
                      style={s.nameInput}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="输入账户名称"
                      placeholderTextColor={colors.textTertiary}
                      maxLength={8}
                      autoFocus
                    />

                    <View style={s.formActions}>
                      <TouchableOpacity
                        style={s.formCancelBtn}
                        onPress={resetForm}
                        activeOpacity={0.6}
                      >
                        <Text style={s.formCancelText}>取消</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.formSaveBtn,
                          (!isFormValid || isLoading) && s.formSaveBtnDisabled,
                        ]}
                        onPress={handleSave}
                        disabled={!isFormValid || isLoading}
                        activeOpacity={0.6}
                      >
                        <Text style={s.formSaveText}>{isLoading ? '保存中...' : '保存'}</Text>
                      </TouchableOpacity>
                    </View>

                    {!!storeError && <Text style={s.errorText}>{storeError}</Text>}
                  </View>
                )}
              </View>
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
    maxHeight: SCREEN_HEIGHT * 0.75,
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
    color: colors.accent,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  addBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accentSubtle,
    borderRadius: radius.xs,
  },
  addBtnText: {
    ...typography.caption1,
    color: colors.accent,
    fontWeight: '600',
  },

  accountList: {
    gap: spacing.xs,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  accountIconWrap: {
    marginRight: spacing.sm,
  },
  accountName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  systemBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: colors.fillTertiary,
    borderRadius: 3,
  },
  systemBadgeText: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editText: {
    ...typography.caption2,
    color: colors.accent,
    fontWeight: '600',
  },
  deleteText: {
    ...typography.caption2,
    color: colors.error,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.footnote,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  form: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  formTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.md,
  },
  formLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  iconOption: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.fillTertiary,
  },
  iconOptionActive: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  nameInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.fillTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.fillTertiary,
  },
  formCancelText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  formSaveBtn: {
    flex: 2,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  formSaveBtnDisabled: {
    backgroundColor: colors.textQuaternary,
  },
  formSaveText: {
    ...typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    ...typography.footnote,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
