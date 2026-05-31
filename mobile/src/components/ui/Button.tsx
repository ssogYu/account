import { TouchableOpacity, ActivityIndicator, Text, StyleSheet, type TouchableOpacityProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'filled' | 'tinted' | 'ghost';
  size?: 'default' | 'small';
}

export function Button({
  title,
  loading = false,
  variant = 'filled',
  size = 'default',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'small' && styles.small,
        variant === 'filled' && styles.filled,
        variant === 'tinted' && styles.tinted,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'filled' ? '#FFFFFF' : colors.accent}
        />
      ) : (
        <Text
          style={[
            styles.text,
            size === 'small' && styles.smallText,
            variant === 'filled' && styles.filledText,
            variant === 'tinted' && styles.tintedText,
            variant === 'ghost' && styles.ghostText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  small: {
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
    borderRadius: radius.sm,
  },
  filled: {
    backgroundColor: colors.accent,
  },
  tinted: {
    backgroundColor: colors.accentSubtle,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.35,
  },
  text: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  smallText: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  filledText: {
    color: '#FFFFFF',
  },
  tintedText: {
    color: colors.accent,
  },
  ghostText: {
    color: colors.accent,
  },
});
