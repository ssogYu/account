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
import { useChatStore } from '@/stores/chat';
import { useBillStore } from '@/stores/bill';
import { useCategoryStore } from '@/stores/category';
import { AddBillModal } from '@/components/AddBillModal';
import { TodaySummaryCard } from '@/components/TodaySummaryCard';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { CategoryIcon } from '@/components/icons';
import type { ChatMessage, ParseResult } from '@/services/chat/types';

// ── 确认卡片组件 ──

function ConfirmCard({
  parseResult,
  messageId,
  confirmed,
  onConfirm,
  onReject,
}: {
  parseResult: ParseResult;
  messageId: string;
  confirmed: boolean;
  onConfirm: (messageId: string) => void;
  onReject: (messageId: string) => void;
}) {
  const typeLabel = parseResult.type === 'expense' ? '支出' : '收入';
  const typeColor = parseResult.type === 'expense' ? colors.error : colors.success;

  if (confirmed) {
    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.confirmedRow}>
          <Text style={cardStyles.confirmedIcon}>✓</Text>
          <Text style={cardStyles.confirmedText}>
            {parseResult.categoryName} {typeLabel} ¥{parseResult.amount.toFixed(2)} 已记录
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyles.card}>
      {/* 金额行 */}
      <View style={cardStyles.amountRow}>
        <View style={cardStyles.categoryBadge}>
          <CategoryIcon iconKey={parseResult.categoryIcon} size={24} color={colors.text} />
          <Text style={cardStyles.categoryName}>{parseResult.categoryName}</Text>
        </View>
        <View style={cardStyles.amountRight}>
          <Text style={[cardStyles.typeTag, { color: typeColor }]}>{typeLabel}</Text>
          <Text style={cardStyles.amount}>¥{parseResult.amount.toFixed(2)}</Text>
        </View>
      </View>

      {/* 详情行 */}
      <View style={cardStyles.detailRow}>
        <Text style={cardStyles.detailText}>{formatDate(parseResult.date)}</Text>
        {parseResult.confidence !== 'high' && (
          <Text style={cardStyles.hintText}>
            {parseResult.confidence === 'medium' ? '分类待确认' : '请确认信息'}
          </Text>
        )}
      </View>

      {/* 操作按钮 */}
      <View style={cardStyles.actionRow}>
        <TouchableOpacity
          style={cardStyles.rejectBtn}
          onPress={() => onReject(messageId)}
          activeOpacity={0.6}
        >
          <Text style={cardStyles.rejectText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={cardStyles.confirmBtn}
          onPress={() => onConfirm(messageId)}
          activeOpacity={0.6}
        >
          <Text style={cardStyles.confirmText}>确认记账</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.separator,
    ...shadows.card,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryName: {
    ...typography.headline,
    color: colors.text,
  },
  amountRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeTag: {
    ...typography.caption1,
    fontWeight: '600',
  },
  amount: {
    ...typography.title3,
    fontWeight: '700',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  hintText: {
    ...typography.caption1,
    color: colors.warning,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.fillTertiary,
  },
  rejectText: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  confirmText: {
    ...typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmedIcon: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '700',
  },
  confirmedText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return '今天';
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ── 对话气泡组件 ──

function ChatBubble({
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

  // 确认卡片类型
  const isConfirmCard = meta?.type === 'confirm_card';
  const isConfirmed = meta?.type === 'confirmed' && !!message.billId;
  const isRejected = meta?.type === 'rejected';

  // 已取消的确认卡片不显示操作按钮
  const showConfirmCard = (isConfirmCard || isConfirmed) && meta?.parseResult;

  return (
    <View style={[bubbleStyles.row, isUser ? bubbleStyles.rowUser : bubbleStyles.rowAssistant]}>
      {!isUser && (
        <View style={bubbleStyles.avatar}>
          <Text style={bubbleStyles.avatarIcon}>🤖</Text>
        </View>
      )}
      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <CategoryIcon
              iconKey={meta.parseResult.categoryIcon}
              size={16}
              color={colors.textTertiary}
            />
            <Text
              style={[
                bubbleStyles.text,
                { color: colors.textTertiary, textDecorationLine: 'line-through' },
              ]}
            >
              {meta.parseResult.categoryName} ¥{meta.parseResult.amount.toFixed(2)}（已取消）
            </Text>
          </View>
        ) : (
          <Text style={[bubbleStyles.text, isUser && bubbleStyles.textUser]}>
            {message.content}
          </Text>
        )}
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.fillSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  avatarIcon: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.xs,
  },
  bubbleAssistant: {
    backgroundColor: colors.bgSecondary,
    borderBottomLeftRadius: radius.xs,
  },
  text: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  textUser: {
    color: '#FFFFFF',
  },
});

// ── 打字指示器 ──

function TypingIndicator() {
  return (
    <View style={typingStyles.container}>
      <View style={bubbleStyles.avatar}>
        <Text style={bubbleStyles.avatarIcon}>🤖</Text>
      </View>
      <View style={[bubbleStyles.bubble, bubbleStyles.bubbleAssistant]}>
        <Text style={typingStyles.text}>思考中...</Text>
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  text: {
    ...typography.body,
    fontSize: 15,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});

// ── 欢迎消息 ──

const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    userId: '',
    role: 'assistant',
    content:
      '你好！我是你的记账助手 🤖\n\n直接告诉我你的消费，比如：\n• "午饭花了25"\n• "打车15元"\n• "收到工资8000"\n\n我会帮你自动识别并记录。',
    billId: null,
    metadata: { type: 'guide' },
    createdAt: new Date().toISOString(),
  },
];

// ── 首页 ──

export default function HomeScreen() {
  const messages = useChatStore((s) => s.messages);
  const isSending = useChatStore((s) => s.isSending);
  const fetchHistory = useChatStore((s) => s.fetchHistory);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const confirmBill = useChatStore((s) => s.confirmBill);
  const rejectBill = useChatStore((s) => s.rejectBill);
  const todaySummary = useBillStore((s) => s.todaySummary);
  const fetchTodaySummary = useBillStore((s) => s.fetchTodaySummary);
  const fetchBills = useBillStore((s) => s.fetchBills);
  const createBill = useBillStore((s) => s.createBill);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  const [inputText, setInputText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchHistory();
    fetchCategories();
    fetchTodaySummary();
  }, [fetchHistory, fetchCategories, fetchTodaySummary]);

  const displayMessages = messages.length > 0 ? messages : WELCOME_MESSAGES;

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    await sendMessage(text);
  }, [inputText, isSending, sendMessage]);

  const handleConfirm = useCallback(
    async (messageId: string) => {
      const ok = await confirmBill({ messageId });
      if (ok) {
        await Promise.all([fetchBills({ page: 1, pageSize: 20 }), fetchTodaySummary()]);
      }
    },
    [confirmBill, fetchBills, fetchTodaySummary],
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>记账助手</Text>
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.6}
        >
          <AntDesign name="edit" size={16} color={colors.accent} />
          <Text style={styles.manualBtnText}>手动记账</Text>
        </TouchableOpacity>
      </View>

      {/* 今日收支浮动卡片 */}
      <View style={styles.summaryWrapper}>
        <TodaySummaryCard summary={todaySummary} />
      </View>

      {/* 对话区域 */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} onConfirm={handleConfirm} onReject={handleReject} />
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
        <View style={styles.inputRow}>
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
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.7}
          >
            <AntDesign name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    backgroundColor: colors.accentSubtle,
    borderRadius: radius.sm,
    gap: 4,
  },
  manualBtnText: {
    ...typography.footnote,
    color: colors.accent,
    fontWeight: '600',
  },
  summaryWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  chatContent: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  inputArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    backgroundColor: colors.bgSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 2,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.textQuaternary,
  },
});
