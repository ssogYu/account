import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { spacing, typography } from "@/theme";
import type { DailyStatItem } from "@/services/bill/stats.types";

interface DailyBarChartProps {
  items: DailyStatItem[];
  displayType: "expense" | "income";
}

export function DailyBarChart({ items, displayType }: DailyBarChartProps) {
  const { colors } = useTheme();
  const accentColor = displayType === "expense" ? colors.error : colors.success;

  const displayItems = items.slice(-31);

  const maxValue =
    displayItems.length > 0
      ? Math.max(
          ...displayItems.map((d) =>
            displayType === "expense" ? d.expense : d.income,
          ),
          1,
        )
      : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: spacing.sm },
        chartArea: {
          flexDirection: "row",
          alignItems: "flex-end",
          height: 140,
          gap: 2,
          paddingLeft: spacing.xs,
        },
        barColumn: {
          flex: 1,
          alignItems: "center",
          gap: 4,
        },
        barTrack: {
          width: "100%",
          height: 110,
          justifyContent: "flex-end",
          alignItems: "center",
        },
        bar: {
          width: "70%",
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
          fontWeight: "700",
        },
        dayPlaceholder: { height: 10 },
        legend: {
          flexDirection: "row",
          alignItems: "center",
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
          marginLeft: "auto",
        },
        emptyChart: {
          alignItems: "center",
          justifyContent: "center",
          height: 140,
        },
        emptyText: {
          ...typography.footnote,
          color: colors.textTertiary,
        },
      }),
    [colors],
  );

  if (displayItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>暂无趋势数据</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        {displayItems.map((item) => {
          const value = displayType === "expense" ? item.expense : item.income;
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const day = item.date.split("-")[2];
          const isToday =
            item.date ===
            `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

          return (
            <View key={item.date} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(height, 0)}%`,
                      backgroundColor: isToday
                        ? accentColor
                        : `${accentColor}80`,
                    },
                  ]}
                />
              </View>
              {parseInt(day!) % 5 === 1 || parseInt(day!) === 1 ? (
                <Text
                  style={[styles.dayLabel, isToday && styles.dayLabelToday]}
                >
                  {parseInt(day!)}
                </Text>
              ) : (
                <View style={styles.dayPlaceholder} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
        <Text style={styles.legendText}>
          每日{displayType === "expense" ? "支出" : "收入"}
        </Text>
        <Text style={styles.legendMax}>最高 ¥{maxValue.toFixed(0)}</Text>
      </View>
    </View>
  );
}
