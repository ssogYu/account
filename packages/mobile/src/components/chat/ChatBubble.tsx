import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import type { ChatMessage } from '@/services/chat/types';
import { ConfirmCard, type ConfirmBillEdits } from './ConfirmCard';

export function ChatBubble({
  message,
  onConfirm,
  onReject,
}: {
  message: ChatMessage;
  onConfirm: (messageId: string, edits?: ConfirmBillEdits) => void;
  onReject: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const meta = !isUser ? message.metadata : null;

  const isConfirmCard = meta?.type === 'confirm_card';
  const isConfirmed = meta?.type === 'confirmed' && !!message.billId;
  const isRejected = meta?.type === 'rejected';
  const showConfirmCard = (isConfirmCard || isConfirmed) && meta?.parseResult;

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
    outputRange: [12, 0],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[styles.row, isUser && styles.rowUser, { transform: [{ translateY }], opacity }]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <View style={styles.avatarGlow} />
          <MaterialCommunityIcons name="robot-happy-outline" size={16} color={colors.accent} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
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
              size={12}
              color={colors.textTertiary}
            />
            <Text style={styles.rejectedText}>
              {meta.parseResult.categoryName} ¥{meta.parseResult.amount.toFixed(2)}（已取消）
            </Text>
          </View>
        ) : (
          <Text style={[styles.text, isUser && styles.textUser]}>{message.content}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm + 2,
    paddingHorizontal: spacing.lg - 2,
    alignItems: 'flex-end',
  },
  rowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 132, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm - 2,
    marginBottom: 2,
  },
  avatarGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 132, 255, 0.06)',
    transform: [{ scale: 1.5 }],
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: '#0A84FF',
    borderTopRightRadius: radius.xs,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: radius.lg,
    borderTopLeftRadius: radius.lg,
  },
  bubbleAssistant: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xs,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  text: {
    ...typography.subheadline,
    lineHeight: 21,
    color: colors.text,
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  rejectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 1,
  },
  rejectedText: {
    ...typography.caption1,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
});
