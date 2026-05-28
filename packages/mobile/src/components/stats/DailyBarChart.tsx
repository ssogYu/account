import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import type { DailyStatItem } from '@/services/bill/stats.types';

interface DailyBarChartProps {
  items: DailyStatItem[];
  displayType: 'expense' | 'income';
}

/**
 * 每日趋势柱状图 - 纯 View 实现
 * 显示当月每天的收支金额，柱高按最大值等比缩放
 */
export function DailyBarChart({ items, displayType }: DailyBarChartProps) {
  const accentColor = displayType === 'expense' ? colors.error : colors.success;

  // 计算最大值用于缩放
  const maxValue = Math.max(
    ...items.map((d) => (displayType === 'expense' ? d.expense : d.income)),
    1,
  );

  // 只显示有数据的日期范围，最多显示 31 天
  const displayItems = items.slice(-31);

  return (
    <View style={styles.container}>
      {/* 柱状图区域 */}
      <View style={styles.chartArea}>
        {displayItems.map((item) => {
          const value = displayType === 'expense' ? item.expense : item.income;
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const day = item.date.split('-')[2];
          const isToday = item.date ===
            `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

          return (
            <View key={item.date} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(height, 0)}%`,
                      backgroundColor: isToday ? accentColor : `${accentColor}80`,
                    },
                  ]}
                />
              </View>
              {/* 日期标签 - 每隔几天显示一次避免拥挤 */}
              {parseInt(day!) % 5 === 1 || parseInt(day!) === 1 ? (
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {parseInt(day!)}
                </Text>
              ) : (
                <View style={styles.dayPlaceholder} />
              )}
            </View>
          );
        })}
      </View>

      {/* 图例 */}
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
        <Text style={styles.legendText}>每日{displayType === 'expense' ? '支出' : '收入'}</Text>
        <Text style={styles.legendMax}>最高 ¥{maxValue.toFixed(0)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 2,
    paddingLeft: spacing.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: '100%',
    height: 110,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    minHeight: 2,
    borderRadius: 2,
  },
  dayLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
    fontSize: 9,
  },
  dayLabelToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayPlaceholder: {
    height: 10,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  legendMax: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },
});
