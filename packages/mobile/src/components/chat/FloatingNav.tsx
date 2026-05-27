import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NAV_ITEMS } from './constants';

export function FloatingNav({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const router = useRouter();
  const menuItemsY = useRef(NAV_ITEMS.map(() => new Animated.Value(0))).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ...menuItemsY.map((val, i) =>
          Animated.spring(val, {
            toValue: 1,
            friction: 7,
            tension: 40,
            delay: i * 60,
            useNativeDriver: true,
          }),
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ...menuItemsY.map((val) =>
          Animated.timing(val, { toValue: 0, duration: 150, useNativeDriver: true }),
        ),
      ]).start();
    }
  }, [visible]);

  const handleNav = (route: string) => {
    onToggle();
    setTimeout(() => router.push(route as any), 250);
  };

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 遮罩层 */}
      <Pressable style={styles.backdrop} onPress={onToggle}>
        <Animated.View
          style={[
            styles.backdropFill,
            {
              opacity: overlayOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            },
          ]}
        />
      </Pressable>

      {/* 展开的菜单项 */}
      {NAV_ITEMS.map((item, i) => {
        const translateY = menuItemsY[i].interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        });
        return (
          <Animated.View
            key={item.key}
            style={[
              styles.menuItemWrap,
              {
                top: 60 + i * 56,
                opacity: menuItemsY[i],
                transform: [{ translateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNav(item.route)}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color="rgba(245, 245, 247, 0.85)"
              />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropFill: {
    flex: 1,
    backgroundColor: '#000000',
  },
  menuItemWrap: {
    position: 'absolute',
    right: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.elevated,
  },
  menuLabel: {
    ...typography.footnote,
    color: 'rgba(245, 245, 247, 0.85)',
    fontWeight: '600',
  },
});
