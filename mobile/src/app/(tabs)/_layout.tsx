import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@/theme";
import { spacing, typography } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function TabLayout() {
  const { colors, resolvedScheme } = useTheme();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.bgSecondary,
      borderTopColor: colors.separator,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 80,
      paddingBottom: spacing.sm,
      paddingTop: spacing.xs,
    }),
    [colors],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          ...typography.caption1,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "记账",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "统计",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-bar"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "我的",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
