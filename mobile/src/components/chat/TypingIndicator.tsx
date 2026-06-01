import { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, radius } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

function usePulse(delay: number) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  return anim;
}

export function TypingIndicator() {
  const { colors } = useTheme();
  const dot1 = usePulse(0);
  const dot2 = usePulse(150);
  const dot3 = usePulse(300);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md,
          alignItems: 'flex-end',
        },
        avatar: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.accentSubtle,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
          marginBottom: 2,
        },
        bubbleBase: {
          maxWidth: '82%',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
          borderRadius: radius.lg,
          backgroundColor: colors.bgElevated,
          borderTopLeftRadius: radius.xs,
          borderBottomLeftRadius: radius.xs,
          borderBottomRightRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        },
        bubble: { paddingVertical: spacing.md, paddingHorizontal: spacing.md + 4 },
        dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="robot-happy-outline" size={18} color={colors.accent} />
      </View>
      <View style={[styles.bubbleBase, styles.bubble]}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
      </View>
    </View>
  );
}
