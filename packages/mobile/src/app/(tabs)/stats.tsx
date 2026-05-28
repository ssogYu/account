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
import { useRouter, useIsFocused } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useStatsStore } from '@/stores/stats';
import { useAuthStore } from '@/stores/auth';
import { BillFlowView } from '@/components/stats/BillFlowView';
import { ChartView } from '@/components/stats/ChartView';

export default function StatsScreen() {
  const router = useRouter();
  const {
    selectedMonth,
    selectedType,
    isLoading,
    activeTab,
    monthSummary,
    familyInfo,
    selectedMemberId,
    fetchAll,
    setSelectedMonth,
    setSelectedType,
    setActiveTab,
    setSelectedMemberId,
  } = useStatsStore();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchAll();
    }
  }, [isFocused]);

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
  const expense = monthSummary?.totalExpense ?? 0;
  const income = monthSummary?.totalIncome ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              activeOpacity={0.6}
              style={styles.monthArrow}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              activeOpacity={0.6}
              style={styles.monthArrow}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.typeSwitch}>
          <TouchableOpacity
            style={[styles.typeBtn, isExpense && styles.typeBtnActive]}
            onPress={() => setSelectedType('expense')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeBtnText, isExpense && { color: colors.error }]}>支出</Text>
            {isExpense && (
              <Text style={[styles.typeBtnAmount, { color: colors.error }]}>
                ¥{expense.toFixed(0)}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isExpense && styles.typeBtnActive]}
            onPress={() => setSelectedType('income')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeBtnText, !isExpense && { color: colors.success }]}>收入</Text>
            {!isExpense && (
              <Text style={[styles.typeBtnAmount, { color: colors.success }]}>
                ¥{income.toFixed(0)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('flow')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'flow' && styles.tabTextActive]}>流水</Text>
          {activeTab === 'flow' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('chart')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'chart' && styles.tabTextActive]}>图表</Text>
          {activeTab === 'chart' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === 'flow' ? (
        <BillFlowView />
      ) : (
        <ChartView />
      )}

      {familyInfo && familyInfo.members.length > 1 && (
        <View style={styles.floatingMemberBar} pointerEvents="box-none">
          <View style={styles.floatingMemberPill}>
            <TouchableOpacity
              style={[styles.floatingChip, !selectedMemberId && styles.floatingChipActive]}
              onPress={() => setSelectedMemberId(null)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={16}
                color={!selectedMemberId ? '#fff' : colors.textSecondary}
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
                ? '我'
                : member.user.nickname && member.user.nickname.length > 3
                  ? member.user.nickname.slice(0, 3) + '…'
                  : member.user.nickname || '成员';
              return (
                <TouchableOpacity
                  key={member.userId}
                  style={[styles.floatingChip, isActive && styles.floatingChipActive]}
                  onPress={() => setSelectedMemberId(isActive ? null : member.userId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.floatingAvatar, isActive && styles.floatingAvatarActive]}>
                    <Text
                      style={[
                        styles.floatingAvatarChar,
                        isActive && styles.floatingAvatarCharActive,
                      ]}
                    >
                      {member.user.nickname?.[0] ?? '?'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.floatingChipText, isActive && styles.floatingChipTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSecondary,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
    minWidth: 90,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 34,
  },

  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.fillTertiary,
    borderRadius: radius.md,
    padding: 3,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  typeBtnActive: {
    backgroundColor: colors.bgElevated,
    ...shadows.subtle,
  },
  typeBtnText: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  typeBtnAmount: {
    ...typography.caption1,
    fontWeight: '700',
  },

  floatingMemberBar: {
    position: 'absolute',
    bottom: spacing.xl + 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  floatingMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#fff',
    fontWeight: '600',
  },
  floatingAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.fillSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAvatarActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  floatingAvatarChar: {
    ...typography.caption2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  floatingAvatarCharActive: {
    color: '#fff',
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  tabText: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '30%',
    right: '30%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
