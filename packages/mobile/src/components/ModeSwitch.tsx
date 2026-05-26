import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export const AUTH_MODE_OPTIONS = [
  { key: 'phone', title: '手机号' },
  { key: 'email', title: '邮箱' },
] as const;

export type AuthMode = (typeof AUTH_MODE_OPTIONS)[number]['key'];

interface ModeTabProps {
  active: boolean;
  title: string;
  onPress: () => void;
}

export function ModeTab({ active, title, onPress }: ModeTabProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function ModeSwitch({
  mode,
  options,
  onChange,
}: {
  mode: string;
  options: ReadonlyArray<{ key: string; title: string }>;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.switch}>
      {options.map((opt) => (
        <ModeTab
          key={opt.key}
          active={mode === opt.key}
          title={opt.title}
          onPress={() => onChange(opt.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.bgCard,
  },
  tabText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text,
  },
});
