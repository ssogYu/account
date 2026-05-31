import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export const AUTH_MODE_OPTIONS = [
  { key: 'phone', title: '手机号' },
  { key: 'email', title: '邮箱' },
] as const;

export type AuthMode = (typeof AUTH_MODE_OPTIONS)[number]['key'];

interface ModeSwitchProps {
  mode: string;
  options: ReadonlyArray<{ key: string; title: string }>;
  onChange: (key: string) => void;
}

export function ModeSwitch({ mode, options, onChange }: ModeSwitchProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isActive = mode === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.7}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{opt.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs,
  },
  tabActive: {
    backgroundColor: colors.fillPrimary,
  },
  tabText: {
    ...typography.subheadline,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
