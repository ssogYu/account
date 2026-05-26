import { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface InputProps extends TextInputProps {
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ error, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.base,
            focused && styles.focused,
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
  base: {
    ...typography.body,
    backgroundColor: colors.bgInput,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focused: {
    borderColor: colors.borderFocus,
  },
  error: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});
