import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, radius, typography, shadows } from '@/theme';

const MENU_GROUPS = [
  { title: '家庭组', subtitle: '管理家庭成员' },
  { title: '账户管理', subtitle: '微信、支付宝、银行卡' },
  { title: '预算设置', subtitle: '月度预算与分类预算' },
  { title: '提醒设置', subtitle: '记账提醒与预算预警' },
  { title: '数据导出', subtitle: '导出CSV格式' },
  { title: '设置', subtitle: '' },
];

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.6}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  pageTitle: {
    ...typography.largeTitle,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },

  // ── 退出 ──
  logoutBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontSize: 16,
  },
});
