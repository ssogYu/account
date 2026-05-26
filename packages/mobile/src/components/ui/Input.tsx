import { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface InputProps extends TextInputProps {
  error?: string;
  label?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ error, label, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.wrapper}>
        {!!label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.base,
            focused && !error && styles.focused,
            error && styles.error,
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '500',
    paddingLeft: 4,
  },
  base: {
    ...typography.body,
    backgroundColor: colors.bgInput,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    borderWidth: 0,
  },
  focused: {
    backgroundColor: colors.bgElevated,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  error: {
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  errorText: {
    ...typography.caption1,
    color: colors.error,
    paddingLeft: 4,
  },
});
