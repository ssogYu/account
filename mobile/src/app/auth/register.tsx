import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { AppError } from '@/services/api';
import { colors, spacing, radius, typography } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
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

    if (!phone.trim()) errors.phone = '请输入手机号';
    if (!email.trim()) errors.email = '请输入邮箱';
    else if (!EMAIL_RE.test(email.trim())) errors.email = '邮箱格式不正确';
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
        phone: phone.trim(),
        email: email.trim(),
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
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.title}>创建账号</Text>
            <Text style={styles.subtitle}>开始你的智能记账之旅</Text>
          </View>

          {/* 表单 */}
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
              placeholder="邮箱"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
            />

            <Input
              placeholder="昵称（选填）"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoComplete="username"
            />

            <Input
              placeholder="密码（至少6位）"
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
          </View>

          {!!serverError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          <Button title="注册" loading={isLoading} onPress={handleRegister} />

          {/* 登录入口 */}
          <View style={styles.footer}>
            <Text style={styles.footerHint}>已有账号？</Text>
            <Link href="/auth/login" asChild>
              <Text style={styles.footerLink}>登录</Text>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.largeTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  fields: {
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.footnote,
    color: colors.error,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
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
