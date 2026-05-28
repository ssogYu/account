import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useStatsStore } from '@/stores/stats';
import { BillFlowView } from '@/components/stats/BillFlowView';
import { ChartView } from '@/components/stats/ChartView';

export default function StatsScreen() {
  const router = useRouter();
  const {
    selectedMonth,
    selectedType,
    isLoading,
    activeTab,
    fetchAll,
    setSelectedMonth,
    setSelectedType,
    setActiveTab,
  } = useStatsStore();

  useEffect(() => {
    fetchAll();
  }, []);

  // ── 月份切换 ──
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (newMonth > nowMonth) return;
    setSelectedMonth(newMonth);
  };

  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split('-');
    return `${year}年${parseInt(m!)}月`;
  };

  const isExpense = selectedType === 'expense';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* ── 顶部标题栏 ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.6}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>统计</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* ── 月份选择器 + 收支切换 ── */}
      <View style={styles.topBar}>
        {/* 月份选择 */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.6} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</Text>
          <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.6} style={styles.monthArrow}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 收支切换 */}
        <View style={styles.typeSwitch}>
          <TouchableOpacity
            style={[styles.typeBtn, isExpense && styles.typeBtnActive]}
            onPress={() => setSelectedType('expense')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeBtnText, isExpense && { color: colors.error }]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isExpense && styles.typeBtnActive]}
            onPress={() => setSelectedType('income')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeBtnText, !isExpense && { color: colors.success }]}>收入</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 流水/图表 Tab ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'flow' && styles.mainTabActive]}
          onPress={() => setActiveTab('flow')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={16}
            color={activeTab === 'flow' ? colors.text : colors.textTertiary}
          />
          <Text style={[styles.mainTabText, activeTab === 'flow' && styles.mainTabTextActive]}>
            流水
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'chart' && styles.mainTabActive]}
          onPress={() => setActiveTab('chart')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="chart-pie"
            size={16}
            color={activeTab === 'chart' ? colors.text : colors.textTertiary}
          />
          <Text style={[styles.mainTabText, activeTab === 'chart' && styles.mainTabTextActive]}>
            图表
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 内容区 ── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === 'flow' ? (
        <BillFlowView />
      ) : (
        <ChartView />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── 顶部标题栏 ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSecondary,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 17,
  },
  headerPlaceholder: {
    width: 36,
  },

  // ── 顶部栏 ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSecondary,
  },
  monthLabel: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'center',
  },

  // 收支切换
  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.fillTertiary,
    borderRadius: radius.sm,
    padding: 2,
  },
  typeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.xs,
  },
  typeBtnActive: {
    backgroundColor: colors.bgElevated,
    ...shadows.subtle,
  },
  typeBtnText: {
    ...typography.caption1,
    fontWeight: '700',
    color: colors.textTertiary,
    fontSize: 12,
  },

  // ── 流水/图表 Tab ──
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  mainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.md,
    backgroundColor: colors.fillTertiary,
  },
  mainTabActive: {
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    ...shadows.subtle,
  },
  mainTabText: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  mainTabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },

  // 加载
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
