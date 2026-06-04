import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme";
import { spacing, radius, typography } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: string | null; // YYYY-MM-DD or null (month mode)
  currentMonth: string; // YYYY-MM
  onSelectDate: (date: string | null) => void;
  onClose: () => void;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = (SCREEN_WIDTH * 0.88 - 40) / 7;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarPicker({
  visible,
  selectedDate,
  currentMonth,
  onSelectDate,
  onClose,
}: CalendarPickerProps) {
  const { colors } = useTheme();

  const [viewYear, viewMonth] = currentMonth.split("-").map(Number);
  const [displayYear, setDisplayYear] = useState(viewYear);
  const [displayMonth, setDisplayMonth] = useState(viewMonth);

  // 同步外部月份
  const [prevMonth, setPrevMonth] = useState(currentMonth);
  if (currentMonth !== prevMonth) {
    const [y, m] = currentMonth.split("-").map(Number);
    setDisplayYear(y);
    setDisplayMonth(m);
    setPrevMonth(currentMonth);
  }

  const today = new Date();
  const todayStr = toDateString(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstDay = getFirstDayOfWeek(displayYear, displayMonth);

  const handlePrevMonth = useCallback(() => {
    if (displayMonth === 1) {
      setDisplayMonth(12);
      setDisplayYear((y) => y - 1);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  }, [displayMonth]);

  const handleNextMonth = useCallback(() => {
    if (displayMonth === 12) {
      setDisplayMonth(1);
      setDisplayYear((y) => y + 1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  }, [displayMonth]);

  const handleDayPress = useCallback(
    (day: number) => {
      const dateStr = toDateString(displayYear, displayMonth, day);
      // 点击已选中的日期则取消选择（回到月模式）
      if (selectedDate === dateStr) {
        onSelectDate(null);
      } else {
        onSelectDate(dateStr);
      }
    },
    [displayYear, displayMonth, selectedDate, onSelectDate],
  );

  const isFutureMonth =
    displayYear > today.getFullYear() ||
    (displayYear === today.getFullYear() &&
      displayMonth > today.getMonth() + 1);

  // 日历网格数据
  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // 补齐最后一行
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDay, daysInMonth]);

  // 按周分组
  const weeks = useMemo(() => {
    const result: (number | null)[][] = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      result.push(calendarCells.slice(i, i + 7));
    }
    return result;
  }, [calendarCells]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        },
        sheet: {
          backgroundColor: colors.bgElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingBottom: 34, // safe area
        },
        handleBar: {
          width: 36,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.fillSecondary,
          alignSelf: "center",
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        headerTitle: {
          ...typography.headline,
          color: colors.text,
          fontSize: 18,
        },
        arrowBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
        },
        arrowBtnActive: {
          backgroundColor: colors.fillTertiary,
        },
        weekdayRow: {
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          marginBottom: spacing.xs,
        },
        weekdayCell: {
          width: CELL_SIZE,
          alignItems: "center",
        },
        weekdayText: {
          ...typography.caption2,
          color: colors.textTertiary,
          fontWeight: "600",
          fontSize: 12,
        },
        weekRow: {
          flexDirection: "row",
          paddingHorizontal: spacing.md,
        },
        dayCell: {
          width: CELL_SIZE,
          height: CELL_SIZE,
          alignItems: "center",
          justifyContent: "center",
        },
        dayBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
        },
        dayBtnSelected: {
          backgroundColor: colors.accent,
        },
        dayBtnToday: {
          borderWidth: 1.5,
          borderColor: colors.accent,
        },
        dayText: {
          ...typography.footnote,
          color: colors.text,
        },
        dayTextSelected: {
          color: "#FFFFFF",
          fontWeight: "700",
        },
        dayTextMuted: {
          color: colors.textQuaternary,
        },
        dayTextToday: {
          color: colors.accent,
          fontWeight: "600",
        },
        footer: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.separator,
        },
        selectedInfo: {
          ...typography.footnote,
          color: colors.textSecondary,
        },
        footerActions: {
          flexDirection: "row",
          gap: spacing.sm,
        },
        footerBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm - 2,
          borderRadius: radius.md,
          backgroundColor: colors.fillTertiary,
        },
        footerBtnPrimary: {
          backgroundColor: colors.accent,
        },
        footerBtnText: {
          ...typography.footnote,
          color: colors.text,
          fontWeight: "600",
        },
        footerBtnTextPrimary: {
          color: "#FFFFFF",
        },
      }),
    [colors],
  );

  const formatSelectedInfo = () => {
    if (!selectedDate) return "查看整月数据";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${m}月${d}日 ${weekdays[date.getDay()]}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={s.sheet}>
            <View style={s.handleBar} />

            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                activeOpacity={0.6}
                style={[s.arrowBtn, s.arrowBtnActive]}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={s.headerTitle}>
                {displayYear}年{displayMonth}月
              </Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                activeOpacity={0.6}
                style={[
                  s.arrowBtn,
                  s.arrowBtnActive,
                  isFutureMonth && { opacity: 0.3 },
                ]}
                disabled={isFutureMonth}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={s.weekdayRow}>
              {WEEKDAYS.map((d) => (
                <View key={d} style={s.weekdayCell}>
                  <Text style={s.weekdayText}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {weeks.map((week, wi) => (
              <View key={wi} style={s.weekRow}>
                {week.map((day, di) => {
                  if (day === null) {
                    return <View key={`e-${wi}-${di}`} style={s.dayCell} />;
                  }
                  const dateStr = toDateString(displayYear, displayMonth, day);
                  const isToday = dateStr === todayStr;
                  const isSelected = selectedDate === dateStr;
                  const isFuture = dateStr > todayStr;

                  return (
                    <View key={day} style={s.dayCell}>
                      <TouchableOpacity
                        onPress={() => {
                          handleDayPress(day);
                          onClose();
                        }}
                        activeOpacity={0.6}
                        disabled={isFuture}
                        style={[
                          s.dayBtn,
                          isSelected && s.dayBtnSelected,
                          !isSelected && isToday && s.dayBtnToday,
                        ]}
                      >
                        <Text
                          style={[
                            s.dayText,
                            isSelected && s.dayTextSelected,
                            !isSelected && isFuture && s.dayTextMuted,
                            !isSelected &&
                              !isFuture &&
                              isToday &&
                              s.dayTextToday,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.selectedInfo}>{formatSelectedInfo()}</Text>
              <View style={s.footerActions}>
                <TouchableOpacity
                  style={s.footerBtn}
                  onPress={() => {
                    onSelectDate(null);
                    onClose();
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={s.footerBtnText}>整月</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.footerBtn, s.footerBtnPrimary]}
                  onPress={() => {
                    onSelectDate(todayStr);
                    onClose();
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[s.footerBtnText, s.footerBtnTextPrimary]}>
                    今天
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
