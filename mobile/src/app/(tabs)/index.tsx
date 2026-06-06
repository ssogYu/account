import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useChatStore } from "@/stores/chat";
import { useBillStore } from "@/stores/bill";
import { useCategoryStore } from "@/stores/category";
import { useAccountStore } from "@/stores/account";
import { AddBillModal } from "@/components/AddBillModal";
import { useTheme } from "@/theme";
import { spacing, radius, shadows, typography } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ChatBubble,
  TypingIndicator,
  DateSeparator,
  WELCOME_MESSAGES,
  QUICK_INPUTS,
} from "@/components/chat";
import type {
  ChatAttachment,
  ChatAttachmentPayload,
  ChatMessage,
} from "@/services/chat/types";
import type { ConfirmBillEdits } from "@/components/chat/ConfirmCard";
import { uploadService } from "@/services/upload";
import { showToast } from "@/components/ui/Toast";
import { Image } from "expo-image";

type PendingImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
};

function toChatAttachmentPayload(
  attachment: ChatAttachment,
): ChatAttachmentPayload {
  return {
    type: attachment.type,
    bucket: attachment.bucket,
    objectKey: attachment.objectKey,
    mimeType: attachment.mimeType,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    width: attachment.width,
    height: attachment.height,
  };
}

function TodayTicker({ expense, income }: { expense: number; income: number }) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = [
    { label: "今日支出", value: `¥${expense.toFixed(2)}`, color: colors.error },
    {
      label: "今日收入",
      value: `¥${income.toFixed(2)}`,
      color: colors.success,
    },
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
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          overflow: "hidden",
          height: 28,
        },
        badge: {
          width: 8,
          height: 8,
          borderRadius: 4,
          alignItems: "center",
          justifyContent: "center",
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: 3,
        },
        textWrap: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        label: {
          ...typography.caption1,
          color: colors.textTertiary,
          fontSize: 12,
        },
        value: {
          ...typography.footnote,
          fontWeight: "700",
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
        <Text style={[tStyles.value, { color: current.color }]}>
          {current.value}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const messages = useChatStore((s) => s.messages);
  const isSending = useChatStore((s) => s.isSending);
  const hasMore = useChatStore((s) => s.hasMore);
  const isLoading = useChatStore((s) => s.isLoading);
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

  const [inputText, setInputText] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [showMediaTray, setShowMediaTray] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const shouldScrollToBottomRef = useRef(false);
  const isInitialScrollRef = useRef(true);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchHistory();
      fetchCategories();
      fetchAccounts();
      fetchTodaySummary();
    }
  }, [isFocused]);

  // 将消息列表转换为带日期分隔线的渲染列表（倒序用于 inverted FlatList）
  type RenderItem =
    | { type: "message"; data: ChatMessage }
    | { type: "date"; date: string };
  const renderList = useMemo(() => {
    const list: RenderItem[] = [];
    const msgs = messages.length > 0 ? messages : WELCOME_MESSAGES;
    let lastDate = "";
    for (const msg of msgs) {
      // 直接解析 ISO 字符串避免 UTC 时区偏移
      const datePart = msg.createdAt.split("T")[0]!;
      if (datePart !== lastDate) {
        list.push({ type: "date", date: msg.createdAt });
        lastDate = datePart;
      }
      list.push({ type: "message", data: msg });
    }
    return list.reverse();
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if ((!text && pendingImages.length === 0) || isSending) return;
    shouldScrollToBottomRef.current = true;
    const nextPendingImages = pendingImages;

    // 立即清空输入区并显示 loading
    setInputText("");
    setPendingImages([]);
    setShowMediaTray(false);

    try {
      let attachments = undefined;
      if (nextPendingImages.length > 0) {
        setIsUploading(true);
        const uploaded = await Promise.all(
          nextPendingImages.map((img) => uploadService.uploadChatImage(img)),
        );
        attachments = uploaded.map(toChatAttachmentPayload);
        setIsUploading(false);
      }

      await sendMessage({
        content: text || undefined,
        attachments,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "上传图片失败，请稍后重试";
      showToast(message);
      setIsUploading(false);
    }
  }, [inputText, isSending, pendingImages, sendMessage]);

  const handlePickImage = useCallback(async () => {
    if (isSending || isUploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 9,
    });
    if (result.canceled || result.assets.length === 0) return;
    const newImages = result.assets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
    }));
    setPendingImages((prev) => [...prev, ...newImages].slice(0, 9));
    setShowMediaTray(false);
  }, [isSending]);

  const handleTakePhoto = useCallback(async () => {
    if (isSending || isUploading) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast("请先开启相机权限");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPendingImages((prev) =>
      prev.length >= 9
        ? prev
        : [
            ...prev,
            {
              uri: asset.uri,
              fileName: asset.fileName,
              mimeType: asset.mimeType,
              width: asset.width,
              height: asset.height,
            },
          ],
    );
    setShowMediaTray(false);
  }, [isSending]);

  const handleQuickInput = useCallback(
    (text: string) => {
      if (isSending || isUploading) return;
      setInputText(text);
    },
    [isSending, isUploading],
  );

  const handleConfirm = useCallback(
    async (messageId: string, billIndex: number, edits?: ConfirmBillEdits) => {
      shouldScrollToBottomRef.current = true;
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
        await Promise.all([
          fetchBills({ page: 1, pageSize: 20 }),
          fetchTodaySummary(),
        ]);
      }
    },
    [confirmBill, fetchBills, fetchTodaySummary],
  );

  const handleConfirmAll = useCallback(
    async (messageId: string, edits: Record<number, ConfirmBillEdits>) => {
      const editsForApi: Record<
        number,
        {
          categoryId?: string;
          amount?: number;
          note?: string;
          accountName?: string;
        }
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
        await Promise.all([
          fetchBills({ page: 1, pageSize: 20 }),
          fetchTodaySummary(),
        ]);
      }
    },
    [confirmAllBills, fetchBills, fetchTodaySummary],
  );

  const handleReject = useCallback(
    async (messageId: string) => {
      shouldScrollToBottomRef.current = true;
      await rejectBill(messageId);
    },
    [rejectBill],
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
      100,
    );
  }, []);

  // 首次加载完成后滚动到底部
  const handleLayout = useCallback(() => {
    if (isInitialScrollRef.current) {
      isInitialScrollRef.current = false;
      scrollToBottom();
    }
  }, [scrollToBottom]);

  // 内容变化时，仅在新消息（shouldScrollToBottom）时自动滚动
  const handleContentSizeChange = useCallback(() => {
    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const totalExpense = todaySummary?.totalExpense ?? 0;
  const totalIncome = todaySummary?.totalIncome ?? 0;
  const pendingImageDescription =
    pendingImages.length > 1
      ? `${pendingImages.length} 张图片待发送`
      : pendingImages[0]?.fileName
        ? pendingImages[0].fileName
        : pendingImages[0]?.width && pendingImages[0]?.height
          ? `${pendingImages[0].width}×${pendingImages[0].height}`
          : "图片待发送";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
          flexDirection: "row",
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
          fontWeight: "500",
        },
        inputRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.sm,
        },
        composerShell: {
          flex: 1,
          borderRadius: 24,
          backgroundColor: colors.glass,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
          padding: spacing.sm,
          ...shadows.elevated,
        },
        inputContainer: {
          backgroundColor: colors.bgElevated,
          borderRadius: 20,
          paddingLeft: spacing.sm + 2,
          paddingRight: spacing.xs,
          paddingVertical: spacing.xs,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        },
        trayWrap: {
          marginBottom: spacing.sm,
        },
        trayInner: {
          flexDirection: "row",
          gap: spacing.sm,
        },
        trayCard: {
          flex: 1,
          borderRadius: 18,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md - 2,
          backgroundColor: colors.fillSecondary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        },
        trayCardPrimary: {
          backgroundColor: colors.accentSubtle,
          borderColor: "transparent",
        },
        trayIconWrap: {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
          backgroundColor: colors.bgElevated,
        },
        trayTitle: {
          ...typography.subheadline,
          color: colors.text,
          fontWeight: "600",
        },
        trayDesc: {
          ...typography.caption1,
          color: colors.textSecondary,
          marginTop: 2,
        },
        pendingImageInline: {
          flexDirection: "column",
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
          borderRadius: 18,
          backgroundColor: colors.fillTertiary,
        },
        pendingImageRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        },
        pendingImageCard: {
          width: 52,
          height: 52,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: colors.fillSecondary,
          marginRight: 6,
        },
        pendingImage: {
          width: "100%",
          height: "100%",
        },
        pendingImageMeta: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        pendingImageTitle: {
          ...typography.caption1,
          color: colors.text,
          fontWeight: "600",
          flex: 1,
        },
        pendingImageDesc: {
          ...typography.caption1,
          color: colors.textSecondary,
        },
        pendingRemoveBadge: {
          position: "absolute",
          top: 2,
          right: 2,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
        },
        pendingRemove: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.bgElevated,
          alignItems: "center",
          justifyContent: "center",
        },
        composerRow: {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 52,
        },
        mediaDock: {
          marginRight: spacing.xs,
        },
        mediaIconBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.fillSecondary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        },
        mediaIconBtnActive: {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
        },
        textInput: {
          flex: 1,
          ...typography.body,
          fontSize: 16,
          color: colors.text,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
          maxHeight: 100,
        },
        sendBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: spacing.xs,
          ...shadows.subtle,
        },
        sendBtnDisabled: {
          backgroundColor: colors.fillPrimary,
        },
        cancelSendBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: colors.fillSecondary,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: spacing.xs,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={resolvedScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.header}>
        <TodayTicker expense={totalExpense} income={totalIncome} />
        <TouchableOpacity onPress={() => setAddModalVisible(true)}>
          <MaterialCommunityIcons
            name="account-edit-outline"
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={renderList}
        keyExtractor={(item, index) =>
          item.type === "date" ? `date-${item.date}-${index}` : item.data.id
        }
        renderItem={({ item }) =>
          item.type === "date" ? (
            <DateSeparator date={item.date} />
          ) : (
            <ChatBubble
              message={item.data}
              onConfirm={handleConfirm}
              onConfirmAll={handleConfirmAll}
              onReject={handleReject}
            />
          )
        }
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        inverted
        ListHeaderComponent={
          <View>
            {(isSending || isUploading) && <TypingIndicator />}
            {hasMore ? (
              <View style={s.loadMoreWrap}>
                <Text style={[s.loadMoreText, { color: colors.textTertiary }]}>
                  {isLoading ? "加载中..." : "上拉加载更多"}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={null}
        onEndReached={() => {
          if (hasMore && !isLoading) loadMore();
        }}
        onEndReachedThreshold={0.3}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={15}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <View style={styles.composerShell}>
            {showMediaTray ? (
              <View style={styles.trayWrap}>
                <View style={styles.trayInner}>
                  <TouchableOpacity
                    style={[styles.trayCard, styles.trayCardPrimary]}
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                    accessibilityLabel="从相册选择图片"
                  >
                    <View style={styles.trayIconWrap}>
                      <MaterialCommunityIcons
                        name="image-multiple-outline"
                        size={18}
                        color={colors.accent}
                      />
                    </View>
                    <Text style={styles.trayTitle}>从相册选择</Text>
                    <Text style={styles.trayDesc}>上传账单截图或订单图片</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.trayCard}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                    accessibilityLabel="拍照上传图片"
                  >
                    <View style={styles.trayIconWrap}>
                      <MaterialCommunityIcons
                        name="camera-outline"
                        size={18}
                        color={colors.text}
                      />
                    </View>
                    <Text style={styles.trayTitle}>直接拍照</Text>
                    <Text style={styles.trayDesc}>适合纸质小票和收据</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            <View style={styles.inputContainer}>
              {pendingImages.length > 0 ? (
                <View style={styles.pendingImageInline}>
                  <View style={styles.pendingImageRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flex: 1 }}
                    >
                      {pendingImages.map((img, idx) => (
                        <View
                          key={`pending-${idx}`}
                          style={styles.pendingImageCard}
                        >
                          <Image
                            source={{ uri: img.uri }}
                            style={styles.pendingImage}
                            contentFit="cover"
                          />
                          <TouchableOpacity
                            style={styles.pendingRemoveBadge}
                            onPress={() =>
                              setPendingImages((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name="close"
                              size={12}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.pendingRemove}
                      onPress={() => setPendingImages([])}
                      activeOpacity={0.7}
                      accessibilityLabel="移除全部图片"
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pendingImageMeta}>
                    <Text style={styles.pendingImageTitle}>
                      {pendingImages.length === 1
                        ? "已添加图片账单"
                        : `${pendingImages.length} 张图片账单`}
                    </Text>
                    <Text style={styles.pendingImageDesc} numberOfLines={1}>
                      {pendingImageDescription}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.composerRow}>
                <View style={styles.mediaDock}>
                  <TouchableOpacity
                    style={[
                      styles.mediaIconBtn,
                      (showMediaTray || pendingImages.length > 0) &&
                        styles.mediaIconBtnActive,
                    ]}
                    onPress={() => {
                      if (isSending) return;
                      setShowMediaTray((prev) => !prev);
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel="打开附件操作"
                  >
                    <MaterialCommunityIcons
                      name={showMediaTray ? "close" : "plus"}
                      size={20}
                      color={
                        showMediaTray || pendingImages.length > 0
                          ? "#FFFFFF"
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="说一句，或添加一张账单图片..."
                  placeholderTextColor={colors.textTertiary}
                  onFocus={() => setShowMediaTray(false)}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!isSending && !isUploading}
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
                    <MaterialCommunityIcons
                      name="close"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      !inputText.trim() &&
                        pendingImages.length === 0 &&
                        styles.sendBtnDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!inputText.trim() && pendingImages.length === 0}
                    activeOpacity={0.7}
                    accessibilityLabel="发送消息"
                  >
                    <MaterialCommunityIcons
                      name="arrow-up"
                      size={18}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
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

const s = StyleSheet.create({
  loadMoreWrap: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    ...typography.caption1,
  },
});
