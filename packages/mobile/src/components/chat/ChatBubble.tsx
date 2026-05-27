import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import type { ChatMessage } from '@/services/chat/types';
import { ConfirmCard } from './ConfirmCard';

export function ChatBubble({
  message,
  onConfirm,
  onReject,
}: {
  message: ChatMessage;
  onConfirm: (messageId: string) => void;
  onReject: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const meta = !isUser ? message.metadata : null;

  const isConfirmCard = meta?.type === 'confirm_card';
  const isConfirmed = meta?.type === 'confirmed' && !!message.billId;
  const isRejected = meta?.type === 'rejected';
  const showConfirmCard = (isConfirmCard || isConfirmed) && meta?.parseResult;

  // 入场动画
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.row,
        isUser && styles.rowUser,
        { transform: [{ translateY }], opacity },
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <View style={styles.avatarGlow} />
          <MaterialCommunityIcons name="robot-happy-outline" size={18} color={colors.accent} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {showConfirmCard ? (
          <ConfirmCard
            parseResult={meta!.parseResult!}
            messageId={message.id}
            confirmed={isConfirmed}
            onConfirm={onConfirm}
            onReject={onReject}
          />
        ) : isRejected && meta?.parseResult ? (
          <View style={styles.rejectedRow}>
            <CategoryIcon
              iconKey={meta.parseResult.categoryIcon}
              size={14}
              color={colors.textTertiary}
            />
            <Text style={styles.rejectedText}>
              {meta.parseResult.categoryName} ¥{meta.parseResult.amount.toFixed(2)}（已取消）
            </Text>
          </View>
        ) : (
          <Text style={[styles.text, isUser && styles.textUser]}>
            {message.content}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-end',
  },
  rowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: 2,
  },
  avatarGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    transform: [{ scale: 1.6 }],
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderTopRightRadius: radius.xs,
    borderBottomRightRadius: radius.xs,
    borderBottomLeftRadius: radius.lg,
    borderTopLeftRadius: radius.lg,
  },
  bubbleAssistant: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xs,
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  text: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  textUser: { color: '#FFFFFF' },
  rejectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rejectedText: {
    ...typography.footnote,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
});
