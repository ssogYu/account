import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryIcon } from '@/components/icons';
import { ConfirmCard } from './ConfirmCard';
import type { ChatMessage } from '../../services/chat/types';
import type { ConfirmBillEdits } from './ConfirmCard';

export function ChatBubble({
  message,
  onConfirm,
  onConfirmAll,
  onReject,
}: {
  message: ChatMessage;
  onConfirm: (messageId: string, billIndex: number, edits?: ConfirmBillEdits) => void;
  onConfirmAll: (messageId: string, edits: Record<number, ConfirmBillEdits>) => void;
  onReject: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const meta = !isUser ? message.metadata : null;

  const isConfirmCard = meta?.type === 'confirm_card';
  const isConfirmed = meta?.type === 'confirmed' && !!message.billId;
  const isRejected = meta?.type === 'rejected';
  const showConfirmCard =
    (isConfirmCard || isConfirmed) && meta?.parseResults && meta.parseResults.length > 0;

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
            parseResults={meta!.parseResults!}
            messageId={message.id}
            confirmed={isConfirmed}
            onConfirm={onConfirm}
            onConfirmAll={onConfirmAll}
            onReject={onReject}
          />
        ) : isRejected && meta?.parseResults ? (
          <View style={styles.rejectedRow}>
            {meta.parseResults.map((pr, i) => (
              <View key={i} style={styles.rejectedItem}>
                <CategoryIcon iconKey={pr.categoryIcon} size={12} color={colors.textTertiary} />
                <Text style={styles.rejectedText}>
                  {pr.categoryName} ¥{pr.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <Text style={styles.rejectedLabel}>（已取消）</Text>
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
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 16,
    backgroundColor: colors.accent,
    opacity: 0.08,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.bgElevated,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  text: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  textUser: {
    color: '#FFFFFF',
  },
  rejectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  rejectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rejectedText: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
  rejectedLabel: {
    ...typography.footnote,
    color: colors.textQuaternary,
  },
});
