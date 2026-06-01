import { useState, useMemo } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { useThemeStore, type ThemeMode } from "@/stores/theme";
import { spacing, radius, typography } from "@/theme";

const THEME_OPTIONS: { key: ThemeMode; title: string }[] = [
  { key: "light", title: "浅色" },
  { key: "dark", title: "深色" },
  { key: "system", title: "跟随系统" },
];

export default function SettingScreen() {
  const router = useRouter();
  const { colors, resolvedScheme } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const themeLabel = useMemo(() => {
    return THEME_OPTIONS.find((o) => o.key === mode)?.title ?? "跟随系统";
  }, [mode]);

  const sections = [
    {
      title: "通用",
      items: [
        { title: "语言", value: "简体中文", action: "none" as const },
        { title: "外观", value: themeLabel, action: "theme" as const },
      ],
    },
    // {
    //   title: "记账",
    //   items: [
    //     { title: "默认账户", value: "微信支付", action: "none" as const },
    //     { title: "记账提醒", value: "每天 21:00", action: "none" as const },
    //     { title: "智能分类", value: "已开启", action: "none" as const },
    //   ],
    // },
    // {
    //   title: "数据",
    //   items: [
    //     { title: "云同步", value: "已开启", action: "none" as const },
    //     { title: "导出数据", value: "", action: "none" as const },
    //     { title: "清除缓存", value: "12.3 MB", action: "none" as const },
    //   ],
    // },
    // {
    //   title: "关于",
    //   items: [
    //     { title: "版本", value: "1.0.0", action: "none" as const },
    //     { title: "用户协议", value: "", action: "none" as const },
    //     { title: "隐私政策", value: "", action: "none" as const },
    //   ],
    // },
  ];

  const handleItemPress = (action: string) => {
    if (action === "theme") {
      setThemeModalVisible(true);
    }
  };

  const handleThemeSelect = async (key: ThemeMode) => {
    await setMode(key);
    setThemeModalVisible(false);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        navBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        navBack: {
          ...typography.headline,
          color: colors.accent,
          fontSize: 18,
        },
        navTitle: {
          ...typography.headline,
          color: colors.text,
        },
        navRight: {
          width: 48,
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        section: {
          marginBottom: spacing.xl,
        },
        sectionTitle: {
          ...typography.caption1,
          color: colors.textSecondary,
          fontWeight: "500",
          textTransform: "uppercase",
          paddingLeft: spacing.lg,
          marginBottom: spacing.sm,
        },
        sectionCard: {
          backgroundColor: colors.bgElevated,
          borderRadius: radius.lg,
          paddingVertical: 4,
          paddingHorizontal: spacing.lg,
        },
        settingItem: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: spacing.md,
        },
        settingItemBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
        settingTitle: {
          ...typography.body,
          color: colors.text,
          fontSize: 16,
        },
        settingRight: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        },
        settingValue: {
          ...typography.subheadline,
          color: colors.textSecondary,
        },
        settingChevron: {
          ...typography.title1,
          color: colors.textTertiary,
          fontSize: 20,
          fontWeight: "300",
        },

        modalOverlay: {
          flex: 1,
          backgroundColor: colors.overlayProminent,
          justifyContent: "flex-end",
        },
        modalContent: {
          backgroundColor: colors.bgElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingBottom: spacing.xxl,
        },
        modalHandle: {
          width: 36,
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.textQuaternary,
          alignSelf: "center",
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        },
        modalTitle: {
          ...typography.headline,
          color: colors.text,
          textAlign: "center",
          marginBottom: spacing.md,
        },
        modalOption: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md + 2,
        },
        modalOptionBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
        modalOptionText: {
          ...typography.body,
          color: colors.text,
          fontSize: 16,
        },
        modalOptionActive: {
          color: colors.accent,
          fontWeight: "600",
        },
        modalCancel: {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md + 2,
          alignItems: "center",
          marginTop: spacing.sm,
        },
        modalCancelText: {
          ...typography.body,
          color: colors.textSecondary,
          fontSize: 16,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={resolvedScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
          <AntDesign
            name="left-circle"
            size={24}
            color={colors.backArrowColor}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle}>设置</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.title}
                  style={[
                    styles.settingItem,
                    idx < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  activeOpacity={0.6}
                  onPress={() => handleItemPress(item.action)}
                >
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <View style={styles.settingRight}>
                    {!!item.value && (
                      <Text style={styles.settingValue}>{item.value}</Text>
                    )}
                    <Text style={styles.settingChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>外观</Text>
            {THEME_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.modalOption,
                  idx < THEME_OPTIONS.length - 1 && styles.modalOptionBorder,
                ]}
                activeOpacity={0.6}
                onPress={() => handleThemeSelect(opt.key)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    mode === opt.key && styles.modalOptionActive,
                  ]}
                >
                  {opt.title}
                </Text>
                {mode === opt.key && (
                  <Text
                    style={[styles.modalOptionText, styles.modalOptionActive]}
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              activeOpacity={0.6}
              onPress={() => setThemeModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>取消</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
