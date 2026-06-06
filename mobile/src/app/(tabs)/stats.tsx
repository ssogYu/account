import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import { useTheme } from "@/theme";
import { spacing, radius, typography, shadows } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useStatsStore } from "@/stores/stats";
import { useAuthStore } from "@/stores/auth";
import { BillFlowView } from "@/components/stats/BillFlowView";
import { ChartView } from "@/components/stats/ChartView";
import { CalendarPicker } from "@/components/stats/CalendarPicker";

export default function StatsScreen() {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const {
    selectedMonth,
    selectedDate,
    selectedType,
    isLoading,
    activeTab,
    monthSummary,
    familyInfo,
    selectedMemberId,
    fetchAll,
    setSelectedMonth,
    setSelectedDate,
    setSelectedType,
    setActiveTab,
    setSelectedMemberId,
  } = useStatsStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { colors, resolvedScheme } = useTheme();

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchAll();
    }
  }, [isFocused]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const now = new Date();
    const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (newMonth > nowMonth) return;
    setSelectedMonth(newMonth);
  };

  const handleMonthArrow = (direction: "prev" | "next") => {
    // 切月份时清除日期选择，回到月模式
    if (selectedDate) {
      setSelectedDate(null);
    }
    if (direction === "prev") handlePrevMonth();
    else handleNextMonth();
  };

  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split("-");
    return `${year}年${parseInt(m!)}月`;
  };

  const formatDateLabel = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${m}月${d}日 ${weekdays[dt.getDay()]}`;
  };

  const isAll = selectedType === "all";
  const isExpense = selectedType === "expense";
  const isIncome = selectedType === "income";
  const expense = monthSummary?.totalExpense ?? 0;
  const income = monthSummary?.totalIncome ?? 0;
  const balance = monthSummary?.balance ?? 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bg,
        },

        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          gap: spacing.md,
        },
        headerTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        },
        monthSelector: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        },
        monthArrow: {
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
        },
        monthLabel: {
          ...typography.headline,
          color: colors.text,
          fontSize: 16,
          textAlign: "center",
        },
        monthLabelBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.md,
        },

        summaryCard: {
          backgroundColor: colors.bgElevated,
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          ...shadows.subtle,
        },
        summaryTopRow: {
          flexDirection: "row",
        },
        summaryItem: {
          flex: 1,
          alignItems: "center",
        },
        summaryItemDivider: {
          width: StyleSheet.hairlineWidth,
          backgroundColor: colors.separator,
        },
        summaryItemLabel: {
          ...typography.caption2,
          color: colors.textTertiary,
          marginBottom: 2,
        },
        summaryItemAmount: {
          ...typography.footnote,
          fontWeight: "700",
        },
        summaryDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.separator,
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
        },
        balanceWrap: {
          alignItems: "center",
        },
        balanceLabel: {
          ...typography.caption2,
          color: colors.textTertiary,
        },
        balanceAmount: {
          ...typography.title3,
          fontWeight: "700",
          marginTop: 2,
        },

        tabBarRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
        tabsWrap: {
          flexDirection: "row",
          gap: spacing.lg,
        },
        tab: {
          paddingVertical: spacing.sm,
          position: "relative",
        },
        tabText: {
          ...typography.footnote,
          color: colors.textTertiary,
          fontWeight: "500",
        },
        tabTextActive: {
          color: colors.text,
          fontWeight: "700",
        },
        tabIndicator: {
          position: "absolute",
          bottom: 0,
          left: "20%",
          right: "20%",
          height: 2,
          borderRadius: 1,
          backgroundColor: colors.accent,
        },
        typePills: {
          flexDirection: "row",
          gap: spacing.xs,
        },
        typePill: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 1,
          borderRadius: radius.lg,
          backgroundColor: colors.fillTertiary,
        },
        typePillActive: {
          ...shadows.subtle,
        },
        typePillText: {
          ...typography.caption1,
          fontWeight: "600",
          color: colors.textTertiary,
        },

        floatingMemberBar: {
          position: "absolute",
          bottom: spacing.xl,
          left: 0,
          right: 0,
          alignItems: "center",
          zIndex: 10,
        },
        floatingMemberPill: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.bgElevated,
          borderRadius: radius.xl,
          paddingVertical: spacing.sm - 2,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.separatorOpaque,
          ...shadows.elevated,
        },
        floatingDivider: {
          width: 1,
          height: 20,
          backgroundColor: colors.separator,
          marginHorizontal: spacing.xs,
        },
        floatingChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs + 1,
          borderRadius: radius.lg,
        },
        floatingChipActive: {
          backgroundColor: colors.accent,
        },
        floatingChipText: {
          ...typography.caption1,
          color: colors.textSecondary,
          fontSize: 13,
        },
        floatingChipTextActive: {
          color: "#fff",
          fontWeight: "600",
        },
        floatingAvatar: {
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.fillSecondary,
          alignItems: "center",
          justifyContent: "center",
        },
        floatingAvatarActive: {
          backgroundColor: "rgba(255,255,255,0.25)",
        },
        floatingAvatarChar: {
          ...typography.caption2,
          fontSize: 11,
          fontWeight: "700",
          color: colors.textSecondary,
        },
        floatingAvatarCharActive: {
          color: "#fff",
        },

        loadingWrap: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={resolvedScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => handleMonthArrow("prev")}
              activeOpacity={0.6}
              style={styles.monthArrow}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.6}
              style={styles.monthLabelBtn}
            >
              <Text style={styles.monthLabel}>
                {selectedDate
                  ? formatDateLabel(selectedDate)
                  : formatMonthLabel(selectedMonth)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMonthArrow("next")}
              activeOpacity={0.6}
              style={styles.monthArrow}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>支出</Text>
              <Text style={[styles.summaryItemAmount, { color: colors.error }]}>
                ¥{expense.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItemDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>收入</Text>
              <Text
                style={[styles.summaryItemAmount, { color: colors.success }]}
              >
                ¥{income.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.balanceWrap}>
            <Text style={styles.balanceLabel}>结余</Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: balance >= 0 ? colors.success : colors.error },
              ]}
            >
              ¥{balance.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabBarRow}>
        <View style={styles.tabsWrap}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab("flow")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "flow" && styles.tabTextActive,
              ]}
            >
              流水
            </Text>
            {activeTab === "flow" && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab("chart")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "chart" && styles.tabTextActive,
              ]}
            >
              图表
            </Text>
            {activeTab === "chart" && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
        <View style={styles.typePills}>
          {activeTab === "flow" && (
            <TouchableOpacity
              style={[
                styles.typePill,
                isAll && styles.typePillActive,
                isAll && { backgroundColor: `${colors.accent}1A` },
              ]}
              onPress={() => setSelectedType("all")}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.typePillText, isAll && { color: colors.accent }]}
              >
                全部
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.typePill,
              isExpense && styles.typePillActive,
              isExpense && { backgroundColor: `${colors.error}1A` },
            ]}
            onPress={() => setSelectedType("expense")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typePillText,
                isExpense && { color: colors.error },
              ]}
            >
              支出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typePill,
              isIncome && styles.typePillActive,
              isIncome && { backgroundColor: `${colors.success}1A` },
            ]}
            onPress={() => setSelectedType("income")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typePillText,
                isIncome && { color: colors.success },
              ]}
            >
              收入
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === "flow" ? (
        <BillFlowView />
      ) : (
        <ChartView />
      )}

      {familyInfo && familyInfo.members.length > 1 && (
        <View style={styles.floatingMemberBar} pointerEvents="box-none">
          <View style={styles.floatingMemberPill}>
            <TouchableOpacity
              style={[
                styles.floatingChip,
                !selectedMemberId && styles.floatingChipActive,
              ]}
              onPress={() => setSelectedMemberId(null)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={16}
                color={!selectedMemberId ? "#fff" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.floatingChipText,
                  !selectedMemberId && styles.floatingChipTextActive,
                ]}
              >
                全部
              </Text>
            </TouchableOpacity>
            <View style={styles.floatingDivider} />
            {familyInfo.members.map((member) => {
              const isActive = selectedMemberId === member.userId;
              const isMe = member.userId === currentUserId;
              const label = isMe
                ? "我"
                : member.user.nickname && member.user.nickname.length > 3
                  ? member.user.nickname.slice(0, 3) + "…"
                  : member.user.nickname || "成员";
              return (
                <TouchableOpacity
                  key={member.userId}
                  style={[
                    styles.floatingChip,
                    isActive && styles.floatingChipActive,
                  ]}
                  onPress={() =>
                    setSelectedMemberId(isActive ? null : member.userId)
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.floatingAvatar,
                      isActive && styles.floatingAvatarActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.floatingAvatarChar,
                        isActive && styles.floatingAvatarCharActive,
                      ]}
                    >
                      {member.user.nickname?.[0] ?? "?"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.floatingChipText,
                      isActive && styles.floatingChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <CalendarPicker
        visible={calendarVisible}
        selectedDate={selectedDate}
        currentMonth={selectedMonth}
        onSelectDate={setSelectedDate}
        onClose={() => setCalendarVisible(false)}
      />
    </SafeAreaView>
  );
}
