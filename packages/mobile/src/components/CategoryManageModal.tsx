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
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useCategoryStore } from '@/stores/category';
import { CategoryIcon, ICON_OPTIONS } from '@/components/icons';
import type { Category } from '@/services/category/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CategoryManageModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CategoryManageModal({ visible, onClose }: CategoryManageModalProps) {
  const categories = useCategoryStore((s) => s.categories);
  const isLoading = useCategoryStore((s) => s.isLoading);
  const storeError = useCategoryStore((s) => s.error);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const createCategory = useCategoryStore((s) => s.createCategory);
  const updateCategory = useCategoryStore((s) => s.updateCategory);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const clearError = useCategoryStore((s) => s.clearError);

  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 新建/编辑表单
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('other_exp');

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.6)).current;

  const filteredCategories = categories.filter((c) => c.type === tab);
  const systemCategories = filteredCategories.filter((c) => c.isSystem);
  const customCategories = filteredCategories.filter((c) => !c.isSystem);

  useEffect(() => {
    if (visible) {
      fetchCategories();
      setTab('expense');
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
    setFormIcon('other_exp');
    setEditingId(null);
    setShowAddForm(false);
    clearError();
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormIcon('other_exp');
    setShowAddForm(true);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setShowAddForm(true);
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('删除分类', `确定删除"${cat.name}"吗？删除后不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
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
        await updateCategory(editingId, { name, icon: formIcon });
      } else {
        await createCategory({ name, type: tab, icon: formIcon });
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

            {/* 标题栏 */}
            <View style={s.header}>
              <Text style={s.headerTitle}>分类管理</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.headerClose}>完成</Text>
              </TouchableOpacity>
            </View>

            {/* 类型切换 */}
            <View style={s.tabSwitch}>
              <TouchableOpacity
                style={[s.tabBtn, tab === 'expense' && s.tabBtnActive]}
                onPress={() => {
                  setTab('expense');
                  resetForm();
                }}
                activeOpacity={0.6}
              >
                <Text style={[s.tabBtnText, tab === 'expense' && s.tabBtnTextActive]}>支出</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tabBtn, tab === 'income' && s.tabBtnIncomeActive]}
                onPress={() => {
                  setTab('income');
                  resetForm();
                }}
                activeOpacity={0.6}
              >
                <Text style={[s.tabBtnText, tab === 'income' && s.tabBtnTextIncomeActive]}>
                  收入
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 系统默认分类 */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>系统默认</Text>
                <View style={s.categoryGrid}>
                  {systemCategories.map((cat) => (
                    <View key={cat.id} style={s.categoryItem}>
                      <View style={s.categoryIconWrap}>
                        <CategoryIcon iconKey={cat.icon} size={22} color={colors.text} />
                      </View>
                      <Text style={s.categoryName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <View style={s.systemBadge}>
                        <Text style={s.systemBadgeText}>默认</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* 自定义分类 */}
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>自定义分类</Text>
                  <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.6}>
                    <Text style={s.addBtnText}>+ 添加</Text>
                  </TouchableOpacity>
                </View>

                {customCategories.length === 0 && !showAddForm ? (
                  <Text style={s.emptyText}>暂无自定义分类，点击上方添加</Text>
                ) : (
                  <View style={s.categoryGrid}>
                    {customCategories.map((cat) => (
                      <View key={cat.id} style={s.categoryItem}>
                        <View style={s.categoryIconWrap}>
                          <CategoryIcon iconKey={cat.icon} size={22} color={colors.text} />
                        </View>
                        <Text style={s.categoryName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <View style={s.itemActions}>
                          <TouchableOpacity
                            onPress={() => handleEdit(cat)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 3 }}
                          >
                            <Text style={s.editText}>编辑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(cat)}
                            hitSlop={{ top: 6, bottom: 6, left: 3, right: 6 }}
                          >
                            <Text style={s.deleteText}>删除</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 新建/编辑表单 */}
                {showAddForm && (
                  <View style={s.form}>
                    <Text style={s.formTitle}>{editingId ? '编辑分类' : '新建分类'}</Text>

                    {/* 图标选择 */}
                    <Text style={s.formLabel}>图标</Text>
                    <View style={s.iconGrid}>
                      {ICON_OPTIONS.map((iconKey) => (
                        <TouchableOpacity
                          key={iconKey}
                          style={[s.iconOption, formIcon === iconKey && s.iconOptionActive]}
                          onPress={() => setFormIcon(iconKey)}
                          activeOpacity={0.6}
                        >
                          <CategoryIcon
                            iconKey={iconKey}
                            size={20}
                            color={formIcon === iconKey ? colors.accent : colors.textSecondary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 名称输入 */}
                    <Text style={s.formLabel}>名称</Text>
                    <TextInput
                      style={s.nameInput}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="输入分类名称"
                      placeholderTextColor={colors.textTertiary}
                      maxLength={10}
                    />

                    {/* 操作按钮 */}
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

                    {/* 错误提示 */}
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
    color: colors.accent,
  },

  // ── Tab 切换 ──
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.accent,
  },
  tabBtnIncomeActive: {
    backgroundColor: colors.success,
  },
  tabBtnText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabBtnTextIncomeActive: {
    color: '#FFFFFF',
  },

  // ── 内容 ──
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 20,
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

  // ── 分类网格 ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  categoryIconWrap: {
    marginBottom: 2,
  },
  categoryName: {
    ...typography.caption1,
    color: colors.text,
    fontSize: 11,
  },
  systemBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: colors.fillTertiary,
    borderRadius: 3,
  },
  systemBadgeText: {
    fontSize: 8,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
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

  // ── 新建/编辑表单 ──
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
    width: 36,
    height: 36,
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
