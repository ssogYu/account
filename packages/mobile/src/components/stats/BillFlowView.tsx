import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import { AddBillModal } from '@/components/AddBillModal';
import { useStatsStore, type DayGroup } from '@/stores/stats';
import { billService } from '@/services/bill';
import type { Bill } from '@/services/bill/types';

const SWIPE_THRESHOLD = -60; // 触发显示操作按钮的滑动阈值
const ACTION_WIDTH = 140; // 操作按钮总宽度（编辑70 + 删除70）

// ── 流水头部（结余 + 筛选） ──
function FlowHeader() {
  const {
    monthSummary,
    flowFilter,
    drillCategoryName,
    setFlowFilter,
    resetFlowFilter,
    categoryStats,
  } = useStatsStore();
  const [expanded, setExpanded] = useState(false);

  const balance = monthSummary?.balance ?? 0;
  const hasFilter = !!flowFilter.categoryId || !!drillCategoryName;

  const activeCategory = flowFilter.categoryId
    ? categoryStats?.items.find((c) => c.categoryId === flowFilter.categoryId)
    : null;

  const billCategories = categoryStats?.items ?? [];

  return (
    <View style={s.flowHeader}>
      <View style={s.flowHeaderTop}>
        <View style={s.balanceWrap}>
          <Text style={s.balanceLabel}>结余</Text>
          <Text style={[s.balanceValue, { color: balance >= 0 ? colors.success : colors.error }]}>
            {balance >= 0 ? '+' : ''}¥{balance.toFixed(2)}
          </Text>
        </View>
        <View style={s.filterActions}>
          <TouchableOpacity
            style={[s.filterBtn, hasFilter && s.filterBtnActive]}
            activeOpacity={0.7}
            onPress={() => setExpanded(!expanded)}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={14}
              color={hasFilter ? colors.accent : colors.textTertiary}
            />
            <Text style={[s.filterBtnText, hasFilter && s.filterBtnTextActive]}>
              {activeCategory ? activeCategory.categoryName : '筛选'}
            </Text>
          </TouchableOpacity>
          {hasFilter && (
            <TouchableOpacity style={s.resetBtn} onPress={resetFlowFilter} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {drillCategoryName && !expanded && (
        <View style={s.drillTag}>
          <Text style={s.drillTagText}>{drillCategoryName}</Text>
          <TouchableOpacity onPress={resetFlowFilter} activeOpacity={0.6}>
            <MaterialCommunityIcons name="close" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {expanded && (
        <View style={s.filterExpanded}>
          <Text style={s.filterSectionLabel}>分类</Text>
          <ScrollView
            style={s.categoryScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={s.filterChips}>
              {billCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.categoryId}
                  style={[s.chip, flowFilter.categoryId === cat.categoryId && s.chipActive]}
                  onPress={() =>
                    setFlowFilter({
                      categoryId:
                        flowFilter.categoryId === cat.categoryId ? undefined : cat.categoryId,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <CategoryIcon
                    iconKey={cat.categoryIcon}
                    size={12}
                    color={
                      flowFilter.categoryId === cat.categoryId ? colors.accent : colors.textTertiary
                    }
                  />
                  <Text
                    style={[
                      s.chipText,
                      flowFilter.categoryId === cat.categoryId && s.chipTextActive,
                    ]}
                  >
                    {cat.categoryName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── 可左滑的账单条目 ──
function BillItem({
  bill,
  onDelete,
  onEdit,
}: {
  bill: Bill;
  onDelete: (id: string) => void;
  onEdit: (bill: Bill) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipedOpen = useRef(false);
  const isExpense = bill.type === 'expense';
  const amount = Number(bill.amount);

  const animateTo = (toValue: number) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      friction: 9,
      tension: 80,
    }).start(() => {
      isSwipedOpen.current = toValue !== 0;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_: GestureResponderEvent, gestureState) => {
        // 只在水平滑动时响应，且水平位移大于垂直位移
        return (
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_: GestureResponderEvent, gestureState) => {
        // 限制滑动范围：0 ~ -ACTION_WIDTH
        const val = Math.max(-ACTION_WIDTH, Math.min(0, gestureState.dx));
        translateX.setValue(val);
      },
      onPanResponderRelease: (_: GestureResponderEvent, gestureState) => {
        if (isSwipedOpen.current) {
          // 已展开状态：向右滑回或向左滑更多
          if (gestureState.dx > 30 || gestureState.vx > 0.3) {
            animateTo(0); // 收回
          } else {
            animateTo(-ACTION_WIDTH); // 保持展开
          }
        } else {
          // 收起状态：向左滑够就展开
          if (gestureState.dx < SWIPE_THRESHOLD || gestureState.vx < -0.3) {
            animateTo(-ACTION_WIDTH); // 展开
          } else {
            animateTo(0); // 收回
          }
        }
      },
    }),
  ).current;

  const showDelete = () => {
    Alert.alert('确认删除', '删除后不可恢复，确定要删除这笔账单吗？', [
      {
        text: '取消',
        style: 'cancel',
        onPress: () => animateTo(0),
      },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          animateTo(0);
          onDelete(bill.id);
        },
      },
    ]);
  };

  return (
    <View style={s.billItemOuter}>
      {/* 操作按钮（底层，右侧露出） */}
      <View style={s.swipeActions}>
        <TouchableOpacity
          style={s.swipeEdit}
          activeOpacity={0.7}
          onPress={() => {
            animateTo(0);
            onEdit(bill);
          }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.text} />
          <Text style={[s.swipeText, { color: '#fff' }]}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.swipeDelete} activeOpacity={0.7} onPress={showDelete}>
          <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
          <Text style={[s.swipeText, { color: '#fff' }]}>删除</Text>
        </TouchableOpacity>
      </View>

      {/* 账单内容（上层，可滑动） */}
      <Animated.View
        style={[s.billItemWrap, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={s.billItem}>
          <View
            style={[
              s.billIconBg,
              { backgroundColor: isExpense ? `${colors.error}1F` : `${colors.success}1F` },
            ]}
          >
            <CategoryIcon
              iconKey={bill.category?.icon ?? 'other_exp'}
              size={18}
              color={isExpense ? colors.error : colors.success}
            />
          </View>
          <View style={s.billInfo}>
            <View style={s.billTitleRow}>
              <Text style={s.billNote} numberOfLines={1}>
                {bill.note || bill.category?.name || '未分类'}
              </Text>
              {bill.account ? (
                <View style={s.accountTag}>
                  <Text style={s.accountTagText}>{bill.account}</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.billSub} numberOfLines={1}>
              {bill.category?.name ?? '未分类'}
            </Text>
          </View>
          <Text style={[s.billAmount, { color: isExpense ? colors.error : colors.success }]}>
            {isExpense ? '-' : '+'}¥{amount.toFixed(2)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ── 日期分组头 ──
function DateHeader({ group }: { group: DayGroup }) {
  return (
    <View style={s.dateHeader}>
      <Text style={s.dateHeaderText}>{group.label}</Text>
      {group.dayExpense > 0 && (
        <Text style={[s.dateHeaderSub, { color: colors.error }]}>
          支出 ¥{group.dayExpense.toFixed(0)}
        </Text>
      )}
      {group.dayIncome > 0 && (
        <Text style={[s.dateHeaderSub, { color: colors.success }]}>
          {' '}
          收入 ¥{group.dayIncome.toFixed(0)}
        </Text>
      )}
    </View>
  );
}

// ── 流水视图主体 ──
export function BillFlowView() {
  const { flowGroups, flowHasMore, deleteBill, fetchFlowList, flowPage } = useStatsStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

  const handleEdit = useCallback((bill: Bill) => {
    setBillToEdit(bill);
    setEditModalVisible(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: {
      type: 'expense' | 'income';
      amount: number;
      categoryId: string;
      note?: string;
      account?: string;
      date?: string;
    }) => {
      if (!billToEdit) return;
      await billService.update(billToEdit.id, data);
      setEditModalVisible(false);
      setBillToEdit(null);
      // 刷新数据
      useStatsStore.setState({ flowPage: 1, flowGroups: [], flowHasMore: true });
      fetchFlowList();
      const { selectedMonth, selectedType } = useStatsStore.getState();
      useStatsStore.getState().fetchMonthSummary(selectedMonth);
      useStatsStore.getState().fetchCategoryStats(selectedMonth, selectedType);
      useStatsStore.getState().fetchDailyStats(selectedMonth);
      useStatsStore.getState().fetchMonthlyComparison(selectedMonth);
    },
    [billToEdit, fetchFlowList],
  );

  const handleEditClose = useCallback(() => {
    setEditModalVisible(false);
    setBillToEdit(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (flowHasMore) {
      useStatsStore.setState({ flowPage: flowPage + 1 });
      fetchFlowList(true);
    }
  }, [flowHasMore, flowPage, fetchFlowList]);

  const renderItem = useCallback(
    ({ item }: { item: DayGroup }) => (
      <View style={s.daySection}>
        <DateHeader group={item} />
        {item.bills.map((bill) => (
          <BillItem key={bill.id} bill={bill} onDelete={deleteBill} onEdit={handleEdit} />
        ))}
      </View>
    ),
    [deleteBill, handleEdit],
  );

  const listHeader = useCallback(() => <FlowHeader />, []);

  if (flowGroups.length === 0) {
    return (
      <View style={s.emptyWrap}>
        <FlowHeader />
        <View style={s.emptyState}>
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={48}
            color={colors.textQuaternary}
          />
          <Text style={s.emptyText}>暂无账单记录</Text>
        </View>
        <AddBillModal
          visible={editModalVisible}
          onClose={handleEditClose}
          onSubmit={handleEditSubmit}
          billToEdit={
            billToEdit
              ? {
                  id: billToEdit.id,
                  type: billToEdit.type as 'expense' | 'income',
                  amount: Number(billToEdit.amount),
                  categoryId: billToEdit.categoryId,
                  note: billToEdit.note ?? undefined,
                  account: billToEdit.account ?? undefined,
                }
              : null
          }
        />
      </View>
    );
  }

  return (
    <View style={s.flowContainer}>
      <FlatList
        data={flowGroups}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={s.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
      <AddBillModal
        visible={editModalVisible}
        onClose={handleEditClose}
        onSubmit={handleEditSubmit}
        billToEdit={
          billToEdit
            ? {
                id: billToEdit.id,
                type: billToEdit.type as 'expense' | 'income',
                amount: Number(billToEdit.amount),
                categoryId: billToEdit.categoryId,
                note: billToEdit.note ?? undefined,
                account: billToEdit.account ?? undefined,
              }
            : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  flowContainer: {
    flex: 1,
  },

  // 月度汇总卡片
  flowHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  flowHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceWrap: {
    gap: 2,
  },
  balanceLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  balanceValue: {
    ...typography.title3,
    fontWeight: '800',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // 筛选栏
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fillTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    gap: 3,
  },
  filterBtnActive: {
    backgroundColor: colors.accentSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
  },
  filterBtnText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  filterBtnTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  resetBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSubtle,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  drillTagText: {
    ...typography.caption1,
    color: colors.accent,
    fontWeight: '600',
  },
  filterExpanded: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  filterSectionLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  categoryScroll: {
    maxHeight: 120,
  },
  filterChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.xs,
    backgroundColor: colors.fillTertiary,
  },
  chipActive: {
    backgroundColor: colors.accentSubtle,
  },
  chipText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // 日期分组
  daySection: {
    marginBottom: spacing.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateHeaderText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateHeaderSub: {
    ...typography.caption1,
    color: colors.textTertiary,
  },

  // 账单条目 — 关键样式修复
  billItemOuter: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
  },
  swipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  swipeEdit: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSecondary,
    gap: 2,
  },
  swipeDelete: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    gap: 2,
  },
  swipeText: {
    ...typography.caption2,
    fontWeight: '600',
  },
  billItemWrap: {
    backgroundColor: colors.bgElevated,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  billIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {
    flex: 1,
    gap: 2,
  },
  billTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountTag: {
    backgroundColor: colors.accentSubtle,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  accountTagText: {
    ...typography.caption2,
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },
  billNote: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '500',
  },
  billSub: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  billAmount: {
    ...typography.footnote,
    fontWeight: '700',
  },

  // 列表内容
  listContent: {
    paddingBottom: 120,
  },

  // 空状态
  emptyWrap: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
});
