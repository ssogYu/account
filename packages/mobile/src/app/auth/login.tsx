import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Button } from '@/components/ui';
import { ModeSwitch, AUTH_MODE_OPTIONS, type AuthMode } from '@/components/ModeSwitch';
import { useAuthStore } from '@/stores/auth';
import { AppError } from '@/services/api';
import { colors, spacing, radius, typography } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const { login, isLoading } = useAuthStore();

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (mode === 'phone') {
      if (!phone.trim()) errors.phone = '请输入手机号';
    } else {
      if (!email.trim()) errors.email = '请输入邮箱';
      else if (!EMAIL_RE.test(email.trim())) errors.email = '邮箱格式不正确';
    }
    if (!password) errors.password = '请输入密码';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setServerError('');
    if (!validate()) return;

    try {
      await login({
        phone: mode === 'phone' ? phone.trim() : undefined,
        email: mode === 'email' ? email.trim() : undefined,
        password,
      });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '登录失败，请稍后重试';
      setServerError(message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* 品牌 */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.appName}>AI 记账</Text>
          <Text style={styles.tagline}>智能记账，轻松生活</Text>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          <ModeSwitch
            mode={mode}
            options={AUTH_MODE_OPTIONS}
            onChange={(key) => {
              setMode(key as AuthMode);
              setFieldErrors({});
              setServerError('');
            }}
          />

          {mode === 'phone' ? (
            <Input
              placeholder="请输入手机号"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoComplete="tel"
              error={fieldErrors.phone}
            />
          ) : (
            <Input
              placeholder="请输入邮箱"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
            />
          )}

          <Input
            placeholder="请输入密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            error={fieldErrors.password}
          />

          {!!serverError && <Text style={styles.serverError}>{serverError}</Text>}

          <Button title="登录" loading={isLoading} onPress={handleLogin} />
        </View>

        {/* 注册入口 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>还没有账号？</Text>
          <Link href="/auth/register" asChild>
            <Text style={styles.link}>立即注册</Text>
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
    paddingHorizontal: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  appName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  serverError: {
    ...typography.caption,
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
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  link: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
