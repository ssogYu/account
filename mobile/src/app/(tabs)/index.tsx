import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { useChatStore } from '@/stores/chat';
import { useBillStore } from '@/stores/bill';
import { useCategoryStore } from '@/stores/category';
import { useAccountStore } from '@/stores/account';
import { AddBillModal } from '@/components/AddBillModal';
import { useTheme } from '@/theme';
import { spacing, radius, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ChatBubble, TypingIndicator, WELCOME_MESSAGES, QUICK_INPUTS } from '@/components/chat';
import type { ConfirmBillEdits } from '@/components/chat/ConfirmCard';

function TodayTicker({ expense, income }: { expense: number; income: number }) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = [
    { label: '今日支出', value: `¥${expense.toFixed(2)}`, color: colors.error },
    { label: '今日收入', value: `¥${income.toFixed(2)}`, color: colors.success },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        translateY.setValue(1);
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[currentIndex] ?? items[0];

  const tStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          overflow: 'hidden',
          height: 28,
        },
        badge: {
          width: 8,
          height: 8,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: 3,
        },
        textWrap: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        label: {
          ...typography.caption1,
          color: colors.textTertiary,
          fontSize: 12,
        },
        value: {
          ...typography.footnote,
          fontWeight: '700',
          fontSize: 15,
        },
      }),
    [colors],
  );

  return (
    <View style={tStyles.container}>
      <View style={tStyles.badge}>
        <View style={[tStyles.dot, { backgroundColor: current.color }]} />
      </View>
      <Animated.View
        style={[
          tStyles.textWrap,
          {
            transform: [
              {
                translateY: translateY.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-22, 0, 22],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={tStyles.label}>{current.label}</Text>
        <Text style={[tStyles.value, { color: current.color }]}>{current.value}</Text>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const messages = useChatStore((s) => s.messages);
  const isSending = useChatStore((s) => s.isSending);
  const hasMore = useChatStore((s) => s.hasMore);
  const fetchHistory = useChatStore((s) => s.fetchHistory);
  const loadMore = useChatStore((s) => s.loadMore);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const cancelSend = useChatStore((s) => s.cancelSend);
  const confirmBill = useChatStore((s) => s.confirmBill);
  const confirmAllBills = useChatStore((s) => s.confirmAllBills);
  const rejectBill = useChatStore((s) => s.rejectBill);
  const todaySummary = useBillStore((s) => s.todaySummary);
  const fetchTodaySummary = useBillStore((s) => s.fetchTodaySummary);
  const fetchBills = useBillStore((s) => s.fetchBills);
  const createBill = useBillStore((s) => s.createBill);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const { colors, resolvedScheme } = useTheme();

  const [inputText, setInputText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchHistory();
      fetchCategories();
      fetchAccounts();
      fetchTodaySummary();
    }
  }, [isFocused]);

  const displayMessages = messages.length > 0 ? messages : WELCOME_MESSAGES;

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText('');
    await sendMessage(text);
  }, [inputText, isSending, sendMessage]);

  const handleQuickInput = useCallback(
    (text: string) => {
      if (isSending) return;
      setInputText(text);
    },
    [isSending],
  );

  const handleConfirm = useCallback(
    async (messageId: string, billIndex: number, edits?: ConfirmBillEdits) => {
      const ok = await confirmBill({
        messageId,
        billIndex,
        edits: edits
          ? {
              categoryId: edits.categoryId,
              amount: edits.amount,
              note: edits.note,
              accountName: edits.accountName,
            }
          : undefined,
      });
      if (ok) {
        await Promise.all([fetchBills({ page: 1, pageSize: 20 }), fetchTodaySummary()]);
      }
    },
    [confirmBill, fetchBills, fetchTodaySummary],
  );

  const handleConfirmAll = useCallback(
    async (messageId: string, edits: Record<number, ConfirmBillEdits>) => {
      const editsForApi: Record<
        number,
        { categoryId?: string; amount?: number; note?: string; accountName?: string }
      > = {};
      for (const [key, val] of Object.entries(edits)) {
        editsForApi[Number(key)] = {
          categoryId: val.categoryId,
          amount: val.amount,
          note: val.note,
          accountName: val.accountName,
        };
      }
      const ok = await confirmAllBills({ messageId, edits: editsForApi });
      if (ok) {
        await Promise.all([fetchBills({ page: 1, pageSize: 20 }), fetchTodaySummary()]);
      }
    },
    [confirmAllBills, fetchBills, fetchTodaySummary],
  );

  const handleReject = useCallback(
    async (messageId: string) => {
      await rejectBill(messageId);
    },
    [rejectBill],
  );

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const totalExpense = todaySummary?.totalExpense ?? 0;
  const totalIncome = todaySummary?.totalIncome ?? 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
        chatContent: {
          paddingVertical: spacing.md,
          paddingBottom: spacing.xl,
        },
        inputArea: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          backgroundColor: colors.bg,
        },
        quickRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.xs,
        },
        quickBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 1,
          borderRadius: radius.full,
          backgroundColor: colors.bgElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        },
        quickBtnText: {
          ...typography.caption1,
          color: colors.textSecondary,
          fontWeight: '500',
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        inputContainer: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bgElevated,
          borderRadius: radius.xl,
          paddingLeft: spacing.md + 4,
          paddingRight: spacing.xs + 2,
          paddingVertical: spacing.xs,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        },
        textInput: {
          flex: 1,
          ...typography.body,
          fontSize: 16,
          color: colors.text,
          paddingVertical: spacing.sm + 2,
          maxHeight: 100,
        },
        sendBtn: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: spacing.xs,
        },
        sendBtnDisabled: {
          backgroundColor: colors.textQuaternary,
        },
        cancelSendBtn: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.fillSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: spacing.xs,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle={resolvedScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TodayTicker expense={totalExpense} income={totalIncome} />
      </View>

      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            onConfirm={handleConfirm}
            onConfirmAll={handleConfirmAll}
            onReject={handleReject}
          />
        )}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={isSending ? <TypingIndicator /> : null}
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.3}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={15}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inputArea}
      >
        <View style={styles.quickRow}>
          {QUICK_INPUTS.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickBtn}
              onPress={() => handleQuickInput(q.text)}
              activeOpacity={0.6}
              accessibilityLabel={`快捷输入: ${q.label}`}
            >
              <Text style={styles.quickBtnText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="告诉我你的消费..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isSending}
              maxLength={200}
              accessibilityLabel="输入消费信息"
            />
            {isSending ? (
              <TouchableOpacity
                style={styles.cancelSendBtn}
                onPress={cancelSend}
                activeOpacity={0.7}
                accessibilityLabel="取消发送"
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.7}
                accessibilityLabel="发送消息"
              >
                <MaterialCommunityIcons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <AddBillModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={createBill}
      />
    </SafeAreaView>
  );
}
