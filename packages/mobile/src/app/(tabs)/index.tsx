import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { useChatStore } from '@/stores/chat';
import { useBillStore } from '@/stores/bill';
import { useCategoryStore } from '@/stores/category';
import { AddBillModal } from '@/components/AddBillModal';
import { colors, spacing, radius, typography } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ChatBubble,
  TypingIndicator,
  FloatingNav,
  FabButton,
  WELCOME_MESSAGES,
  QUICK_INPUTS,
} from '@/components/chat';
import type { ConfirmBillEdits } from '@/components/chat/ConfirmCard';

export default function HomeScreen() {
  const messages = useChatStore((s) => s.messages);
  const isSending = useChatStore((s) => s.isSending);
  const fetchHistory = useChatStore((s) => s.fetchHistory);
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

  const [inputText, setInputText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchHistory();
      fetchCategories();
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* 顶部栏 */}
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="robot-happy-outline" size={18} color={colors.accent} />
          </View>
          <Text style={styles.logoText}>AI 记账</Text>
        </View>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setNavVisible(!navVisible)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="menu" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* 今日汇总条 */}
      {(totalExpense > 0 || totalIncome > 0) && (
        <View style={styles.summaryBar}>
          {totalExpense > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>今日支出</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                ¥{totalExpense.toFixed(0)}
              </Text>
            </View>
          )}
          {totalIncome > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>今日收入</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                ¥{totalIncome.toFixed(0)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 对话区域 */}
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
      />

      {/* 底部输入区域 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inputArea}
      >
        {/* 快捷输入 */}
        <View style={styles.quickRow}>
          {QUICK_INPUTS.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickBtn}
              onPress={() => handleQuickInput(q.text)}
              activeOpacity={0.6}
            >
              <Text style={styles.quickBtnText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 输入框 */}
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
            />
            {isSending ? (
              <TouchableOpacity
                style={styles.cancelSendBtn}
                onPress={cancelSend}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 悬浮手动记账按钮 */}
      <FabButton onPress={() => setAddModalVisible(true)} />

      {/* 悬浮导航菜单 */}
      <FloatingNav visible={navVisible} onToggle={() => setNavVisible(!navVisible)} />

      {/* 手动记账弹窗 */}
      <AddBillModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={createBill}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...typography.headline,
    color: colors.text,
    fontSize: 17,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSecondary,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.bgSecondary,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  summaryValue: {
    ...typography.footnote,
    fontWeight: '700',
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
});
