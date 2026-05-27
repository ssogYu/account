import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth';
import { useFamilyStore } from '@/stores/family';
import { FamilyModal } from '@/components/FamilyModal';
import { colors, spacing, radius, typography } from '@/theme';
import AntDesign from '@expo/vector-icons/AntDesign';

const MENU_ITEMS = [
  { key: 'accounts', title: '账户管理', subtitle: '微信、支付宝、银行卡' },
  { key: 'budget', title: '预算设置', subtitle: '月度预算与分类预算' },
  { key: 'reminder', title: '提醒设置', subtitle: '记账提醒与预算预警' },
  { key: 'export', title: '数据导出', subtitle: '导出CSV格式' },
  // { key: 'settings', title: '设置', subtitle: '' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const family = useFamilyStore((s) => s.family);

  const [familyModalVisible, setFamilyModalVisible] = useState(false);

  const handleMenuPress = (key: string) => {
    if (key === 'settings') {
      router.push('/setting');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 页面标题 */}
        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitle}>我的</Text>
          <TouchableOpacity onPress={() => handleMenuPress('settings')}>
            <AntDesign name="setting" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* 用户信息卡片 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.nickname?.[0] || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.nickname || '用户'}</Text>
            <Text style={styles.profileSub}>{user?.phone || '未设置手机号'}</Text>
          </View>
        </View>

        {/* 家庭组入口 */}
        <TouchableOpacity
          style={styles.familyCard}
          onPress={() => setFamilyModalVisible(true)}
          activeOpacity={0.6}
        >
          <View style={styles.familyLeft}>
            <Text style={styles.familyTitle}>家庭组</Text>
            <Text style={styles.familySubtitle}>
              {family ? `${family.name} · ${family.members.length}人` : '创建或加入家庭组'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* 菜单列表 */}
        <View style={styles.menuGroup}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              onPress={() => handleMenuPress(item.key)}
              activeOpacity={0.6}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {!!item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.6}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>

      <FamilyModal visible={familyModalVisible} onClose={() => setFamilyModalVisible(false)} />
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
    paddingBottom: 100,
  },
  pageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  pageTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },

  // ── 用户信息 ──
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.title3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 2,
  },
  profileSub: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },

  // ── 家庭组入口 ──
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  familyLeft: {
    flex: 1,
  },
  familyTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 2,
  },
  familySubtitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  chevron: {
    ...typography.title2,
    color: colors.textTertiary,
    fontWeight: '300',
  },

  // ── 菜单 ──
  menuGroup: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  menuLeft: {
    flex: 1,
  },
  menuTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
  },
  menuSubtitle: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ── 退出 ──
  logoutBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontSize: 16,
  },
});
