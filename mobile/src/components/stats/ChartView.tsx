import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import { useStatsStore } from '@/stores/stats';
import { CategoryRanking } from './CategoryRanking';
import { DailyBarChart } from './DailyBarChart';
import { ComparisonCard } from './ComparisonCard';
import { CHART_COLORS } from './chartColors';
import type { CategoryStatItem, DailyStatItem } from '@/services/bill/stats.types';

const PIE_SIZE = 180;

function CategoryPieChart({
  items,
  totalAmount,
  onType,
  onSlicePress,
}: {
  items: CategoryStatItem[];
  totalAmount: number;
  onType: 'expense' | 'income';
  onSlicePress: (item: CategoryStatItem, index: number) => void;
}) {
  const accentColor = onType === 'expense' ? colors.error : colors.success;

  let currentAngle = -90;
  const slices = items.map((item, i) => {
    const angle = totalAmount > 0 ? (item.amount / totalAmount) * 360 : 0;
    const start = currentAngle;
    currentAngle += angle;
    return {
      item,
      startAngle: start,
      sweepAngle: angle,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  return (
    <View style={pieStyles.container}>
      <View style={pieStyles.chartWrap}>
        <View style={pieStyles.pieOuter}>
          {slices.map((slice) => {
            if (slice.sweepAngle <= 0) return null;
            const rotation = slice.startAngle;
            return (
              <View
                key={slice.item.categoryId}
                style={[
                  pieStyles.slice,
                  {
                    transform: [{ rotate: `${rotation}deg` }],
                  },
                ]}
              >
                <View style={[pieStyles.sliceFill, { backgroundColor: slice.color }]} />
              </View>
            );
          })}
          <View style={pieStyles.pieHole}>
            <Text style={[pieStyles.centerAmount, { color: accentColor }]}>
              ¥{totalAmount.toFixed(0)}
            </Text>
            <Text style={pieStyles.centerLabel}>总{onType === 'expense' ? '支出' : '收入'}</Text>
          </View>
        </View>
      </View>

      <View style={pieStyles.legend}>
        {items.slice(0, 6).map((item, i) => (
          <TouchableOpacity
            key={item.categoryId}
            style={pieStyles.legendItem}
            activeOpacity={0.7}
            onPress={() => onSlicePress(item, i)}
          >
            <View
              style={[
                pieStyles.legendDot,
                { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] },
              ]}
            />
            <View style={[pieStyles.legendIconBg, { backgroundColor: `${accentColor}1F` }]}>
              <CategoryIcon iconKey={item.categoryIcon} size={14} color={accentColor} />
            </View>
            <Text style={pieStyles.legendName} numberOfLines={1}>
              {item.categoryName}
            </Text>
            <Text style={[pieStyles.legendPct, { color: CHART_COLORS[i % CHART_COLORS.length] }]}>
              {item.percentage.toFixed(1)}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pieStyles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chartWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pieOuter: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    borderRadius: PIE_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.fillTertiary,
  },
  slice: {
    position: 'absolute',
    width: PIE_SIZE,
    height: PIE_SIZE / 2,
    transformOrigin: '50% 100%',
    overflow: 'hidden',
  },
  sliceFill: {
    width: PIE_SIZE,
    height: PIE_SIZE / 2,
  },
  pieHole: {
    position: 'absolute',
    top: (PIE_SIZE - 110) / 2,
    left: (PIE_SIZE - 110) / 2,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  centerAmount: {
    ...typography.headline,
    fontWeight: '800',
    fontSize: 16,
  },
  centerLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  legend: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendIconBg: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendName: {
    ...typography.footnote,
    color: colors.text,
    flex: 1,
  },
  legendPct: {
    ...typography.caption1,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
  },
});

type TrendPeriod = 'day' | 'week' | 'month' | 'year';

function aggregateByWeek(items: DailyStatItem[]): DailyStatItem[] {
  const weeks: Map<string, { expense: number; income: number }> = new Map();
  for (const item of items) {
    const [yStr, mStr, dStr] = item.date.split('-');
    const d = new Date(parseInt(yStr!), parseInt(mStr!) - 1, parseInt(dStr!), 12, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    if (!weeks.has(key)) weeks.set(key, { expense: 0, income: 0 });
    const w = weeks.get(key)!;
    w.expense += item.expense;
    w.income += item.income;
  }
  return Array.from(weeks.entries()).map(([date, data]) => ({
    date,
    expense: Math.round(data.expense * 100) / 100,
    income: Math.round(data.income * 100) / 100,
  }));
}

function aggregateByMonth(items: DailyStatItem[]): DailyStatItem[] {
  const months: Map<string, { expense: number; income: number }> = new Map();
  for (const item of items) {
    const key = item.date.substring(0, 7);
    if (!months.has(key)) months.set(key, { expense: 0, income: 0 });
    const m = months.get(key)!;
    m.expense += item.expense;
    m.income += item.income;
  }
  return Array.from(months.entries()).map(([date, data]) => ({
    date: `${date}-01`,
    expense: Math.round(data.expense * 100) / 100,
    income: Math.round(data.income * 100) / 100,
  }));
}

function TrendChart() {
  const { dailyStats, selectedType } = useStatsStore();
  const [period, setPeriod] = useState<TrendPeriod>('day');

  const periods: { key: TrendPeriod; label: string }[] = [
    { key: 'day', label: '日' },
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  if (!dailyStats || dailyStats.items.length === 0) {
    return (
      <View style={chartStyles.emptySection}>
        <MaterialCommunityIcons name="chart-line" size={40} color={colors.textQuaternary} />
        <Text style={chartStyles.emptyText}>暂无趋势数据</Text>
      </View>
    );
  }

  const displayItems =
    period === 'day'
      ? dailyStats.items
      : period === 'week'
        ? aggregateByWeek(dailyStats.items)
        : period === 'month'
          ? aggregateByMonth(dailyStats.items)
          : aggregateByMonth(dailyStats.items);

  return (
    <View style={chartStyles.trendWrap}>
      <View style={chartStyles.periodBar}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[chartStyles.periodBtn, period === p.key && chartStyles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[chartStyles.periodText, period === p.key && chartStyles.periodTextActive]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <DailyBarChart items={displayItems} displayType={selectedType} />
    </View>
  );
}

export function ChartView() {
  const { categoryStats, monthlyComparison, selectedType, drillToFlow } = useStatsStore();

  const handleSlicePress = (item: CategoryStatItem) => {
    drillToFlow(item.categoryId, item.categoryName);
  };

  return (
    <ScrollView
      contentContainerStyle={chartStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {categoryStats && categoryStats.items.length > 0 && (
        <View style={chartStyles.section}>
          <View style={chartStyles.sectionHeader}>
            <Text style={chartStyles.sectionTitle}>
              {selectedType === 'expense' ? '支出' : '收入'}分类
            </Text>
            <Text style={chartStyles.sectionSub}>
              共{categoryStats.items.length}个分类
            </Text>
          </View>
          <View style={chartStyles.card}>
            <CategoryPieChart
              items={categoryStats.items}
              totalAmount={categoryStats.totalAmount}
              onType={selectedType}
              onSlicePress={handleSlicePress}
            />
          </View>
        </View>
      )}

      <View style={chartStyles.section}>
        <Text style={chartStyles.sectionTitle}>收支趋势</Text>
        <View style={chartStyles.card}>
          <TrendChart />
        </View>
      </View>

      {categoryStats && categoryStats.items.length > 0 && (
        <View style={chartStyles.section}>
          <Text style={chartStyles.sectionTitle}>
            {selectedType === 'expense' ? '支出' : '收入'}排行
          </Text>
          <View style={chartStyles.card}>
            <CategoryRanking items={categoryStats.items} onType={selectedType} />
          </View>
        </View>
      )}

      {monthlyComparison && (
        <View style={chartStyles.section}>
          <Text style={chartStyles.sectionTitle}>月度对比</Text>
          <ComparisonCard data={monthlyComparison} />
        </View>
      )}
    </ScrollView>
  );
}

const chartStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
  },
  sectionSub: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    ...shadows.card,
  },

  trendWrap: {
    gap: spacing.md,
  },
  periodBar: {
    flexDirection: 'row',
    backgroundColor: colors.fillTertiary,
    borderRadius: radius.sm,
    padding: 2,
    alignSelf: 'flex-start',
  },
  periodBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  periodBtnActive: {
    backgroundColor: colors.bg,
  },
  periodText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  periodTextActive: {
    color: colors.text,
    fontWeight: '600',
  },

  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
});
