import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '@/theme';

export default function SettingScreen() {
  const router = useRouter();

  const sections = [
    {
      title: '通用',
      items: [
        { title: '语言', value: '简体中文' },
        { title: '深色模式', value: '跟随系统' },
      ],
    },
    {
      title: '记账',
      items: [
        { title: '默认账户', value: '微信支付' },
        { title: '记账提醒', value: '每天 21:00' },
        { title: '智能分类', value: '已开启' },
      ],
    },
    {
      title: '数据',
      items: [
        { title: '云同步', value: '已开启' },
        { title: '导出数据', value: '' },
        { title: '清除缓存', value: '12.3 MB' },
      ],
    },
    {
      title: '关于',
      items: [
        { title: '版本', value: '1.0.0' },
        { title: '用户协议', value: '' },
        { title: '隐私政策', value: '' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={styles.navBack}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>设置</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                >
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <View style={styles.settingRight}>
                    {!!item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                    <Text style={styles.settingChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── 导航栏 ──
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // ── 内容 ──
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
    fontWeight: '500',
    textTransform: 'uppercase',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '300',
  },
});
