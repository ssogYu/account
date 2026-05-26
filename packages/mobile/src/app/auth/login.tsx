import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { AppError } from '@/services/api';
import { colors, spacing, radius, typography, shadows } from '@/theme';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const { login, isLoading } = useAuthStore();

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!phone.trim()) errors.phone = '请输入手机号';
    if (!password) errors.password = '请输入密码';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setServerError('');
    if (!validate()) return;

    try {
      await login({
        phone: phone.trim(),
        password,
      });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '登录失败，请稍后重试';
      setServerError(message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* 品牌区域 - 大量留白，Apple式呼吸感 */}
        <View style={styles.brand}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoGlyph}>A</Text>
          </View>
          <Text style={styles.appName}>AI 记账</Text>
          <Text style={styles.tagline}>智能记账，轻松生活</Text>
        </View>

        {/* 表单区域 */}
        <View style={styles.form}>
          <View style={styles.fields}>
            <Input
              placeholder="手机号"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoComplete="tel"
              error={fieldErrors.phone}
            />

            <Input
              placeholder="密码"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              error={fieldErrors.password}
            />
          </View>

          {!!serverError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          <Button title="登录" loading={isLoading} onPress={handleLogin} />
        </View>

        {/* 底部注册入口 */}
        <View style={styles.footer}>
          <Text style={styles.footerHint}>还没有账号？</Text>
          <Link href="/auth/register" asChild>
            <Text style={styles.footerLink}>创建账号</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.elevated,
  },

  logoGlyph: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  appName: {
    ...typography.largeTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
  },
  fields: {
    gap: spacing.md,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.footnote,
    color: colors.error,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  footerHint: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
  footerLink: {
    ...typography.footnote,
    color: colors.accent,
    fontWeight: '600',
  },
});
