import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Button } from '@/components/ui';
import { ModeSwitch, AUTH_MODE_OPTIONS, type AuthMode } from '@/components/ModeSwitch';
import { useAuthStore } from '@/stores/auth';
import { AppError } from '@/services/api';
import { colors, spacing, typography } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [mode, setMode] = useState<AuthMode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const { register, isLoading } = useAuthStore();

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (mode === 'phone') {
      if (!phone.trim()) errors.phone = '请输入手机号';
    } else {
      if (!email.trim()) errors.email = '请输入邮箱';
      else if (!EMAIL_RE.test(email.trim())) errors.email = '邮箱格式不正确';
    }
    if (!password) {
      errors.password = '请设置密码';
    } else if (password.length < 6) {
      errors.password = '密码至少6位';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = '两次密码不一致';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setServerError('');
    if (!validate()) return;

    try {
      await register({
        phone: mode === 'phone' ? phone.trim() : undefined,
        email: mode === 'email' ? email.trim() : undefined,
        password,
        nickname: nickname.trim() || undefined,
      });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '注册失败，请稍后重试';
      setServerError(message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.title}>创建账号</Text>
            <Text style={styles.subtitle}>开始你的智能记账之旅</Text>
          </View>

          {/* 切换模式 */}
          <ModeSwitch
            mode={mode}
            options={AUTH_MODE_OPTIONS}
            onChange={(key) => {
              setMode(key as AuthMode);
              setFieldErrors({});
              setServerError('');
            }}
          />

          {/* 表单 */}
          <View style={styles.form}>
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
              placeholder="昵称（选填）"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoComplete="username"
            />

            <Input
              placeholder="设置密码（至少6位）"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              error={fieldErrors.password}
            />

            <Input
              placeholder="确认密码"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
              error={fieldErrors.confirmPassword}
            />

            {!!serverError && <Text style={styles.serverError}>{serverError}</Text>}

            <Button title="注册" loading={isLoading} onPress={handleRegister} />
          </View>

          {/* 登录入口 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>已有账号？</Text>
            <Link href="/auth/login" asChild>
              <Text style={styles.link}>立即登录</Text>
            </Link>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  serverError: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
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
