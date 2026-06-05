import { useEffect, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/theme";
import { Image } from "expo-image";
import { typography } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CategoryIcon } from "@/components/icons";
import { ConfirmCard } from "./ConfirmCard";
import { ImageViewer } from "./ImageViewer";
import { useAuthStore } from "@/stores/auth";
import type { ChatMessage } from "../../services/chat/types";
import type { ConfirmBillEdits } from "./ConfirmCard";

export function ChatBubble({
  message,
  onConfirm,
  onConfirmAll,
  onReject,
}: {
  message: ChatMessage;
  onConfirm: (
    messageId: string,
    billIndex: number,
    edits?: ConfirmBillEdits,
  ) => void;
  onConfirmAll: (
    messageId: string,
    edits: Record<number, ConfirmBillEdits>,
  ) => void;
  onReject: (messageId: string) => void;
}) {
  const { colors } = useTheme();
  const userAvatar = useAuthStore((s) => s.user?.avatar);
  const isUser = message.role === "user";
  const meta = message.metadata;
  const assistantMeta = (!isUser ? meta : null) as any;

  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const isConfirmCard = assistantMeta?.type === "confirm_card";
  const isConfirmed = assistantMeta?.type === "confirmed" && !!message.billId;
  const isRejected = assistantMeta?.type === "rejected";
  const attachments = meta?.attachments ?? [];
  const showConfirmCard =
    (isConfirmCard || isConfirmed) &&
    assistantMeta?.parseResults &&
    assistantMeta.parseResults.length > 0;

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 12,
          paddingHorizontal: 16,
        },
        rowUser: {
          justifyContent: "flex-end",
        },
        avatar: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.accentSubtle,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
          marginTop: 2,
          position: "relative",
        },
        avatarGlow: {
          position: "absolute",
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderRadius: 16,
          backgroundColor: colors.accent,
          opacity: 0.08,
        },
        bubble: {
          maxWidth: "80%",
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
        },
        bubbleUser: {
          backgroundColor: colors.accent,
          borderBottomRightRadius: 4,
          marginRight: 8,
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
          color: "#FFFFFF",
        },
        rejectedRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
        },
        rejectedItem: {
          flexDirection: "row",
          alignItems: "center",
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
        attachmentImage: {
          width: 180,
          height: 180,
          borderRadius: 12,
          marginBottom: message.content ? 8 : 0,
          backgroundColor: colors.fillSecondary,
        },
      }),
    [colors],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        isUser && styles.rowUser,
        { transform: [{ translateY }], opacity },
      ]}
    >
      {!isUser && (
        <Image
          source={require("@/icon/icon.png")}
          style={styles.avatar}
          contentFit="contain"
        />
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {!showConfirmCard && attachments.length > 0 ? (
          <View>
            {attachments.map((attachment, index) =>
              attachment.previewUrl ? (
                <TouchableOpacity
                  key={`${attachment.objectKey}-${index}`}
                  activeOpacity={0.85}
                  onPress={() => setViewerUri(attachment.previewUrl!)}
                >
                  <Image
                    source={{ uri: attachment.previewUrl }}
                    style={styles.attachmentImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ) : null,
            )}
            {message.content ? (
              <Text style={[styles.text, isUser && styles.textUser]}>
                {message.content}
              </Text>
            ) : null}
          </View>
        ) : showConfirmCard ? (
          <ConfirmCard
            parseResults={assistantMeta!.parseResults!}
            messageId={message.id}
            confirmed={isConfirmed}
            onConfirm={onConfirm}
            onConfirmAll={onConfirmAll}
            onReject={onReject}
          />
        ) : isRejected && assistantMeta?.parseResults ? (
          <View style={styles.rejectedRow}>
            {assistantMeta.parseResults.map((pr: any, i: number) => (
              <View key={i} style={styles.rejectedItem}>
                <CategoryIcon
                  iconKey={pr.categoryIcon}
                  size={12}
                  color={colors.textTertiary}
                />
                <Text style={styles.rejectedText}>
                  {pr.categoryName} ¥{pr.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <Text style={styles.rejectedLabel}>（已取消）</Text>
          </View>
        ) : (
          <Text style={[styles.text, isUser && styles.textUser]}>
            {message.content}
          </Text>
        )}
      </View>
      {isUser &&
        (userAvatar ? (
          <Image
            source={{ uri: userAvatar }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name="account-circle"
            size={28}
            color={colors.textSecondary}
          />
        ))}
      <ImageViewer
        visible={!!viewerUri}
        uri={viewerUri ?? ""}
        onClose={() => setViewerUri(null)}
      />
    </Animated.View>
  );
}
