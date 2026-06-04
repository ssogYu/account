import { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type WithSpringConfig,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { spacing, radius, typography } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CategoryIcon } from "@/components/icons";
import { AddBillModal } from "@/components/AddBillModal";
import { useStatsStore, type DayGroup } from "@/stores/stats";
import { useAuthStore } from "@/stores/auth";
import { billService } from "@/services/bill";
import type { Bill } from "@/services/bill/types";

const SWIPE_THRESHOLD = -60;
const ACTION_WIDTH = 140;

const SPRING_CONFIG: WithSpringConfig = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

function useBillFlowStyles() {
  const { colors } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        flowContainer: { flex: 1 },
        flowHeader: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.sm,
        },
        flowHeaderTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
        },
        filterActions: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        },
        filterBtn: {
          flexDirection: "row",
          alignItems: "center",
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
          fontWeight: "600",
        },
        resetBtn: {
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        },
        drillTag: {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
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
          fontWeight: "600",
        },
        filterExpanded: {
          marginTop: spacing.sm,
          gap: spacing.sm,
        },
        filterSectionLabel: {
          ...typography.caption1,
          color: colors.textTertiary,
          fontWeight: "600",
        },
        categoryScroll: { maxHeight: 120 },
        filterChips: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
        },
        chip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          borderRadius: radius.xs,
          backgroundColor: colors.fillTertiary,
        },
        chipActive: { backgroundColor: colors.accentSubtle },
        chipText: {
          ...typography.caption1,
          color: colors.textSecondary,
        },
        chipTextActive: {
          color: colors.accent,
          fontWeight: "600",
        },
        daySection: { marginBottom: spacing.sm },
        dateHeader: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg + spacing.xs,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        },
        dateHeaderText: {
          ...typography.footnote,
          color: colors.textSecondary,
          fontWeight: "600",
        },
        dateHeaderSub: {
          ...typography.caption1,
          color: colors.textTertiary,
        },
        billItemOuter: {
          position: "relative",
          overflow: "hidden",
          marginHorizontal: spacing.lg,
          marginBottom: spacing.xs,
          borderRadius: radius.md,
        },
        swipeActions: {
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          flexDirection: "row",
        },
        swipeEdit: {
          width: 70,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.fillSecondary,
          gap: 2,
        },
        swipeDelete: {
          width: 70,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.error,
          borderTopRightRadius: radius.md,
          borderBottomRightRadius: radius.md,
          gap: 2,
        },
        swipeText: {
          ...typography.caption2,
          fontWeight: "600",
        },
        billItemWrap: { backgroundColor: colors.bgElevated },
        billItem: {
          flexDirection: "row",
          alignItems: "center",
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
          alignItems: "center",
          justifyContent: "center",
        },
        billInfo: { flex: 1, gap: 2 },
        billTitleRow: {
          flexDirection: "row",
          alignItems: "center",
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
          fontWeight: "600",
        },
        memberTag: {
          backgroundColor: colors.fillSecondary,
          borderRadius: 3,
          paddingHorizontal: 4,
          paddingVertical: 1,
        },
        memberTagText: {
          ...typography.caption2,
          fontSize: 10,
          color: colors.textSecondary,
          fontWeight: "600",
        },
        billNote: {
          ...typography.footnote,
          color: colors.text,
          fontWeight: "500",
        },
        billSub: {
          ...typography.caption2,
          color: colors.textTertiary,
        },
        billAmount: {
          ...typography.footnote,
          fontWeight: "700",
        },
        listContent: { paddingBottom: 120 },
        emptyWrap: { flex: 1 },
        emptyState: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing.xxl * 2,
          gap: spacing.md,
        },
        emptyText: {
          ...typography.footnote,
          color: colors.textTertiary,
        },
      }),
    [colors],
  );
}

// ── 流水头部（筛选） ──
function FlowHeader() {
  const s = useBillFlowStyles();
  const { colors } = useTheme();
  const {
    flowFilter,
    drillCategoryName,
    setFlowFilter,
    resetFlowFilter,
    categoryStats,
  } = useStatsStore();
  const [expanded, setExpanded] = useState(false);

  const hasFilter = !!flowFilter.categoryId || !!drillCategoryName;

  const activeCategory = flowFilter.categoryId
    ? categoryStats?.items.find((c) => c.categoryId === flowFilter.categoryId)
    : null;

  const billCategories = categoryStats?.items ?? [];

  return (
    <View style={s.flowHeader}>
      <View style={s.flowHeaderTop}>
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
              {activeCategory ? activeCategory.categoryName : "筛选"}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={hasFilter ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
          {hasFilter && (
            <TouchableOpacity
              style={s.resetBtn}
              onPress={resetFlowFilter}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {drillCategoryName && !expanded && (
        <View style={s.drillTag}>
          <Text style={s.drillTagText}>{drillCategoryName}</Text>
          <TouchableOpacity onPress={resetFlowFilter} activeOpacity={0.6}>
            <MaterialCommunityIcons
              name="close"
              size={14}
              color={colors.accent}
            />
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
              <TouchableOpacity
                style={[s.chip, !flowFilter.categoryId && s.chipActive]}
                onPress={() => setFlowFilter({ categoryId: undefined })}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={12}
                  color={
                    !flowFilter.categoryId ? colors.accent : colors.textTertiary
                  }
                />
                <Text
                  style={[
                    s.chipText,
                    !flowFilter.categoryId && s.chipTextActive,
                  ]}
                >
                  全部
                </Text>
              </TouchableOpacity>
              {billCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.categoryId}
                  style={[
                    s.chip,
                    flowFilter.categoryId === cat.categoryId && s.chipActive,
                  ]}
                  onPress={() =>
                    setFlowFilter({
                      categoryId:
                        flowFilter.categoryId === cat.categoryId
                          ? undefined
                          : cat.categoryId,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <CategoryIcon
                    iconKey={cat.categoryIcon}
                    size={12}
                    color={
                      flowFilter.categoryId === cat.categoryId
                        ? colors.accent
                        : colors.textTertiary
                    }
                  />
                  <Text
                    style={[
                      s.chipText,
                      flowFilter.categoryId === cat.categoryId &&
                        s.chipTextActive,
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
  showMemberTag,
}: {
  bill: Bill;
  onDelete: (id: string) => void;
  onEdit: (bill: Bill) => void;
  showMemberTag: boolean;
}) {
  const s = useBillFlowStyles();
  const { colors } = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const translateX = useSharedValue(0);
  const isSwipedOpen = useSharedValue(false);
  const isExpense = bill.type === "expense";
  const amount = Number(bill.amount);
  const displayName = bill.note || bill.category?.name || "未分类";
  const truncatedName =
    displayName.length > 10 ? displayName.slice(0, 5) + "…" : displayName;

  const animateTo = useCallback(
    (toValue: number) => {
      translateX.value = withSpring(toValue, SPRING_CONFIG);
      isSwipedOpen.value = toValue !== 0;
    },
    [translateX, isSwipedOpen],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const base = isSwipedOpen.value ? -ACTION_WIDTH : 0;
      const raw = base + event.translationX;
      translateX.value = Math.max(-ACTION_WIDTH, Math.min(0, raw));
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;

      if (isSwipedOpen.value) {
        if (translation > 30 || velocity > 300) {
          translateX.value = withSpring(0, SPRING_CONFIG);
          isSwipedOpen.value = false;
        } else {
          translateX.value = withSpring(-ACTION_WIDTH, SPRING_CONFIG);
        }
      } else {
        if (translation < SWIPE_THRESHOLD || velocity < -300) {
          translateX.value = withSpring(-ACTION_WIDTH, SPRING_CONFIG);
          isSwipedOpen.value = true;
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const showDelete = useCallback(() => {
    Alert.alert("确认删除", "删除后不可恢复，确定要删除这笔账单吗？", [
      {
        text: "取消",
        style: "cancel",
        onPress: () => animateTo(0),
      },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          animateTo(0);
          onDelete(bill.id);
        },
      },
    ]);
  }, [animateTo, onDelete, bill.id]);

  const handleEdit = useCallback(() => {
    animateTo(0);
    onEdit(bill);
  }, [animateTo, onEdit, bill]);

  return (
    <View style={s.billItemOuter}>
      <View style={s.swipeActions}>
        <TouchableOpacity
          style={s.swipeEdit}
          activeOpacity={0.7}
          onPress={handleEdit}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={18}
            color={colors.text}
          />
          <Text style={[s.swipeText, { color: "#fff" }]}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.swipeDelete}
          activeOpacity={0.7}
          onPress={showDelete}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={18}
            color="#fff"
          />
          <Text style={[s.swipeText, { color: "#fff" }]}>删除</Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[s.billItemWrap, animatedStyle]}>
          <View style={s.billItem}>
            <View
              style={[
                s.billIconBg,
                {
                  backgroundColor: isExpense
                    ? `${colors.error}1F`
                    : `${colors.success}1F`,
                },
              ]}
            >
              <CategoryIcon
                iconKey={bill.category?.icon ?? "other_exp"}
                size={18}
                color={isExpense ? colors.error : colors.success}
              />
            </View>
            <View style={s.billInfo}>
              <View style={s.billTitleRow}>
                <Text style={s.billNote} numberOfLines={1}>
                  {truncatedName}
                </Text>
                {showMemberTag &&
                  bill.user &&
                  bill.userId !== currentUserId && (
                    <View style={s.memberTag}>
                      <Text style={s.memberTagText}>
                        {(bill.user.nickname && bill.user.nickname.length > 5
                          ? bill.user.nickname.slice(0, 5) + "…"
                          : bill.user.nickname) || "?"}
                      </Text>
                    </View>
                  )}
                {bill.account ? (
                  <View style={s.accountTag}>
                    <Text style={s.accountTagText}>{bill.account}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.billSub} numberOfLines={1}>
                {bill.category?.name ?? "未分类"}
              </Text>
            </View>
            <Text
              style={[
                s.billAmount,
                { color: isExpense ? colors.error : colors.success },
              ]}
            >
              {isExpense ? "-" : "+"}¥{amount.toFixed(2)}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ── 日期分组头 ──
function DateHeader({ group }: { group: DayGroup }) {
  const s = useBillFlowStyles();
  const { colors } = useTheme();
  return (
    <View style={s.dateHeader}>
      <Text style={s.dateHeaderText}>{group.label}</Text>
      {group.dayExpense > 0 && (
        <Text style={[s.dateHeaderSub, { color: colors.error }]}>
          支出 ¥{group.dayExpense.toFixed(2)}
        </Text>
      )}
      {group.dayIncome > 0 && (
        <Text style={[s.dateHeaderSub, { color: colors.success }]}>
          {" "}
          收入 ¥{group.dayIncome.toFixed(2)}
        </Text>
      )}
    </View>
  );
}

// ── 流水视图主体 ──
export function BillFlowView() {
  const s = useBillFlowStyles();
  const { colors } = useTheme();
  const {
    flowGroups,
    flowHasMore,
    deleteBill,
    fetchFlowList,
    flowPage,
    familyInfo,
  } = useStatsStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);
  const showMemberTag = !!familyInfo && familyInfo.members.length > 1;

  const handleEdit = useCallback((bill: Bill) => {
    setBillToEdit(bill);
    setEditModalVisible(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (data: {
      type: "expense" | "income";
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
      useStatsStore.setState({
        flowPage: 1,
        flowGroups: [],
        flowHasMore: true,
      });
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
          <BillItem
            key={bill.id}
            bill={bill}
            onDelete={deleteBill}
            onEdit={handleEdit}
            showMemberTag={showMemberTag}
          />
        ))}
      </View>
    ),
    [deleteBill, handleEdit, showMemberTag, s],
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
                  type: billToEdit.type as "expense" | "income",
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
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={10}
      />
      <AddBillModal
        visible={editModalVisible}
        onClose={handleEditClose}
        onSubmit={handleEditSubmit}
        billToEdit={
          billToEdit
            ? {
                id: billToEdit.id,
                type: billToEdit.type as "expense" | "income",
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
