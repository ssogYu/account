import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'error') {
  addToastFn?.(message, type);
}

const ICON_MAP: Record<ToastType, { name: string; color: string }> = {
  error: { name: 'alert-circle-outline', color: colors.error },
  success: { name: 'check-circle-outline', color: colors.success },
  warning: { name: 'alert-outline', color: colors.warning },
  info: { name: 'information-outline', color: colors.accent },
};

export function ToastProvider() {
  const toastsRef = useRef<ToastItem[]>([]);
  const [, forceUpdate] = useState(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const animationsRef = useRef<Map<number, Animated.Value>>(new Map());

  const removeToast = useCallback((id: number) => {
    const anim = animationsRef.current.get(id);
    if (anim) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        toastsRef.current = toastsRef.current.filter((t) => t.id !== id);
        animationsRef.current.delete(id);
        forceUpdate((v) => v + 1);
      });
    }
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = ++toastId;
      const anim = new Animated.Value(0);
      toastsRef.current = [...toastsRef.current, { id, message, type }];
      animationsRef.current.set(id, anim);
      forceUpdate((v) => v + 1);

      requestAnimationFrame(() => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }).start();
      });

      const timer = setTimeout(() => removeToast(id), 3000);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, [addToast]);

  const toasts = toastsRef.current;

  return (
    <View style={s.container} pointerEvents="box-none">
      {toasts.map((toast, index) => {
        const anim = animationsRef.current.get(toast.id);
        const icon = ICON_MAP[toast.type];
        return (
          <Animated.View
            key={toast.id}
            style={[
              s.toast,
              {
                top: 50 + index * 56,
                opacity: anim ?? new Animated.Value(0),
                transform: [
                  {
                    translateY: (anim ?? new Animated.Value(0)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialCommunityIcons name={icon.name as any} size={18} color={icon.color} />
            <Text style={s.message}>{toast.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separatorOpaque,
    ...shadows.elevated,
    maxWidth: Dimensions.get('window').width - 40,
  },
  message: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '500',
  },
});
