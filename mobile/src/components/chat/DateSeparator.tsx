import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { spacing, radius, typography } from "@/theme";
import { formatDate } from "./constants";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const { colors } = useTheme();

  return (
    <View style={s.container}>
      <View style={[s.line, { backgroundColor: colors.separator }]} />
      <View style={[s.badge, { backgroundColor: colors.bgElevated }]}>
        <Text style={[s.text, { color: colors.textTertiary }]}>
          {formatDate(date)}
        </Text>
      </View>
      <View style={[s.line, { backgroundColor: colors.separator }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs - 1,
    borderRadius: radius.full,
  },
  text: {
    ...typography.caption2,
    fontSize: 11,
    fontWeight: "500",
  },
});
