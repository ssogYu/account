import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/auth';
import { uploadService } from '@/services/upload';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import AntDesign from '@expo/vector-icons/AntDesign';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.5)).current;

  useEffect(() => {
    if (visible) {
      setEditNickname(user?.nickname || '');
      setEditAvatar(user?.avatar || null);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      slideY.setValue(SCREEN_HEIGHT * 0.5);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT * 0.5,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!editNickname.trim()) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }
    setIsSaving(true);
    try {
      const data: { nickname: string; avatar?: string } = { nickname: editNickname.trim() };
      if (editAvatar && editAvatar !== user?.avatar) {
        const avatarUrl = await uploadService.uploadImage(editAvatar);
        data.avatar = avatarUrl;
      } else if (editAvatar === null && user?.avatar) {
        data.avatar = '';
      }
      await updateProfile(data);
      handleClose();
    } catch {
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.backdrop, { opacity }]}>
          <Pressable style={s.backdropTouch} onPress={handleClose} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
            <View style={s.handleArea}>
              <View style={s.handle} />
            </View>

            <View style={s.header}>
              <Text style={s.headerTitle}>编辑资料</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.headerClose}>取消</Text>
              </TouchableOpacity>
            </View>

            <View style={s.content}>
              {/* 头像 */}
              <TouchableOpacity style={s.avatarSection} onPress={pickImage} activeOpacity={0.6}>
                {editAvatar ? (
                  <Image
                    source={{ uri: editAvatar }}
                    style={s.avatarPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={s.avatarPreview}>
                    <Text style={s.avatarPreviewChar}>{editNickname?.[0] || 'U'}</Text>
                  </View>
                )}
                <View style={s.avatarEditHint}>
                  <AntDesign name="camera" size={14} color={colors.accent} />
                  <Text style={s.avatarEditText}>更换头像</Text>
                </View>
              </TouchableOpacity>

              {/* 昵称 */}
              <View style={s.fieldSection}>
                <Text style={s.fieldLabel}>昵称</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    value={editNickname}
                    onChangeText={setEditNickname}
                    maxLength={20}
                    placeholder="输入昵称"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={s.inputCount}>{editNickname.length}/20</Text>
                </View>
              </View>

              {/* 保存按钮 */}
              <TouchableOpacity
                style={[s.saveBtn, (!editNickname.trim() || isSaving) && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!editNickname.trim() || isSaving}
                activeOpacity={0.6}
              >
                <Text style={s.saveBtnText}>{isSaving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: SCREEN_HEIGHT * 0.55,
    ...shadows.elevated,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textQuaternary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  headerClose: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 20,
  },

  // ── 头像编辑 ──
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarPreviewChar: {
    ...typography.title1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  avatarEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarEditText: {
    ...typography.footnote,
    color: colors.accent,
  },

  // ── 昵称编辑 ──
  fieldSection: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    paddingRight: 60,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  inputCount: {
    position: 'absolute',
    right: spacing.lg,
    top: 18,
    ...typography.caption1,
    color: colors.textTertiary,
  },

  // ── 保存 ──
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  saveBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
});
