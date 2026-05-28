import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFamilyStore } from '@/stores/family';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { Button } from '@/components/ui';
import AntDesign from '@expo/vector-icons/AntDesign';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

interface FamilyModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'main' | 'create' | 'join';

export function FamilyModal({ visible, onClose }: FamilyModalProps) {
  const family = useFamilyStore((s) => s.family);
  const isLoading = useFamilyStore((s) => s.isLoading);
  const fetchFamily = useFamilyStore((s) => s.fetchFamily);
  const createFamily = useFamilyStore((s) => s.createFamily);
  const joinFamily = useFamilyStore((s) => s.joinFamily);
  const leaveFamily = useFamilyStore((s) => s.leaveFamily);
  const removeMember = useFamilyStore((s) => s.removeMember);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('main');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      fetchFamily();
      setStep('main');
      setFamilyName('');
      setInviteCode('');
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      slideY.setValue(SHEET_MAX_HEIGHT);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: SHEET_MAX_HEIGHT, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    try {
      await createFamily(familyName.trim());
      setStep('main');
    } catch {
      // store 已处理 error 状态
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    try {
      await joinFamily(inviteCode.trim().toUpperCase());
      setStep('main');
    } catch {
      // store 已处理 error 状态
    }
  };

  const handleLeave = () => {
    const isOwner = family?.myRole === 'owner';
    Alert.alert(
      isOwner ? '删除家庭组' : '退出家庭组',
      isOwner
        ? '删除后所有成员将被移出，确定要删除吗？'
        : '退出后将无法查看家庭账单，确定要退出吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: isOwner ? '删除' : '退出',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFamily();
              setStep('main');
            } catch {
              // store 已处理 error 状态
            }
          },
        },
      ],
    );
  };

  const handleRemoveMember = (memberId: string, nickname: string) => {
    Alert.alert('移除成员', `确定要将 ${nickname} 移出家庭组吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(memberId);
          } catch {
            // store 已处理 error 状态
          }
        },
      },
    ]);
  };

  // ── 空状态 ──
  const renderNoFamily = () => (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <AntDesign name="usergroup-add" size={48} color="black" />
      </View>
      <Text style={s.emptyTitle}>开始家庭记账</Text>
      <Text style={s.emptySub}>创建或加入家庭组，与家人一起管理账单</Text>
      <View style={s.emptyActions}>
        <Button title="创建家庭组" onPress={() => setStep('create')} style={s.emptyBtn} />
        <Button
          title="加入家庭组"
          variant="tinted"
          onPress={() => setStep('join')}
          style={s.emptyBtn}
        />
      </View>
    </View>
  );

  // ── 家庭组信息 ──
  const renderFamilyInfo = () => {
    if (!family) return null;
    const isOwner = family.myRole === 'owner';

    return (
      <View style={s.infoWrap}>
        {/* 顶部卡片 */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroName}>{family.name}</Text>
              <View style={s.heroMeta}>
                <View style={[s.roleBadge, isOwner ? s.roleBadgeOwner : s.roleBadgeMember]}>
                  <Text
                    style={[
                      s.roleBadgeText,
                      isOwner ? s.roleBadgeTextOwner : s.roleBadgeTextMember,
                    ]}
                  >
                    {isOwner ? '组长' : '成员'}
                  </Text>
                </View>
                <Text style={s.heroCount}>{family.members.length} 位成员</Text>
              </View>
            </View>
          </View>

          {/* 邀请码 */}
          {isOwner && (
            <View style={s.codeCard}>
              <Text style={s.codeLabel}>邀请码</Text>
              <View style={s.codeRow}>
                {family.inviteCode.split('').map((ch, i) => (
                  <View key={i} style={s.codeCell}>
                    <Text style={s.codeChar}>{ch}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.codeHint}>分享邀请码，家人即可加入</Text>
            </View>
          )}
        </View>

        {/* 成员列表 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>成员</Text>
          <View style={s.memberList}>
            {family.members.map((member, idx) => {
              const isMe = member.userId === user?.id;
              return (
                <View
                  key={member.id}
                  style={[s.memberRow, idx < family.members.length - 1 && s.memberRowBorder]}
                >
                  <View style={s.memberAvatar}>
                    <Text style={s.memberAvatarChar}>{member.user.nickname?.[0] || '?'}</Text>
                  </View>
                  <View style={s.memberDetail}>
                    <Text style={s.memberName}>
                      {member.user.nickname || member.user.phone || '未知用户'}
                      {isMe && <Text style={s.memberMeTag}>（我）</Text>}
                    </Text>
                    <Text style={s.memberRoleText}>
                      {member.role === 'owner' ? '组长' : '成员'}
                    </Text>
                  </View>
                  {isOwner && member.role !== 'owner' && !isMe && (
                    <TouchableOpacity
                      style={s.removeTouch}
                      onPress={() =>
                        handleRemoveMember(member.id, member.user.nickname || '该成员')
                      }
                      activeOpacity={0.5}
                    >
                      <Text style={s.removeText}>移除</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 底部操作 */}
        <TouchableOpacity style={s.leaveBtn} onPress={handleLeave} activeOpacity={0.6}>
          <Text style={s.leaveText}>{isOwner ? '删除家庭组' : '退出家庭组'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── 创建表单 ──
  const renderCreate = () => (
    <View style={s.formWrap}>
      <TouchableOpacity style={s.backBtn} onPress={() => setStep('main')} activeOpacity={0.6}>
        <Text style={s.backText}>‹ 返回</Text>
      </TouchableOpacity>
      <Text style={s.formTitle}>创建家庭组</Text>
      <Text style={s.formSub}>为你的家庭组起个名字</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          placeholder="例如：温馨小家"
          placeholderTextColor={colors.textTertiary}
          value={familyName}
          onChangeText={setFamilyName}
          maxLength={20}
        />
        <Text style={s.inputCount}>{familyName.length}/20</Text>
      </View>
      <Button
        title="创建"
        onPress={handleCreate}
        loading={isLoading}
        disabled={!familyName.trim()}
        style={s.formSubmit}
      />
    </View>
  );

  // ── 加入表单 ──
  const renderJoin = () => (
    <View style={s.formWrap}>
      <TouchableOpacity style={s.backBtn} onPress={() => setStep('main')} activeOpacity={0.6}>
        <Text style={s.backText}>‹ 返回</Text>
      </TouchableOpacity>
      <Text style={s.formTitle}>加入家庭组</Text>
      <Text style={s.formSub}>输入分享的6位邀请码</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={[s.input, s.inputCode]}
          placeholder="A3B5K9"
          placeholderTextColor={colors.textTertiary}
          value={inviteCode}
          onChangeText={(v) => setInviteCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          maxLength={6}
          autoCapitalize="characters"
        />
      </View>
      <Button
        title="加入"
        onPress={handleJoin}
        loading={isLoading}
        disabled={inviteCode.length < 6}
        style={s.formSubmit}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="none" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.backdrop, { opacity }]}>
          <Pressable style={s.backdropTouch} onPress={handleClose} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
            {/* 拖拽指示条 */}
            <View style={s.handleArea}>
              <View style={s.handle} />
            </View>

            {/* 步骤标题 */}
            <View style={s.header}>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.headerClose}>完成</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'main' && (family ? renderFamilyInfo() : renderNoFamily())}
              {step === 'create' && renderCreate()}
              {step === 'join' && renderJoin()}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  // ── 遮罩 & 弹窗 ──
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
    maxHeight: SHEET_MAX_HEIGHT,
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
    justifyContent: 'flex-end',
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
    color: colors.accent,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 20,
  },

  // ── 空状态 ──
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconGlyph: {
    fontSize: 32,
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.subheadline,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  emptyBtn: {
    flex: 1,
  },

  // ── 家庭组信息 ──
  infoWrap: {
    paddingTop: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  heroName: {
    ...typography.title3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  roleBadgeOwner: {
    backgroundColor: colors.accentSubtle,
  },
  roleBadgeMember: {
    backgroundColor: colors.fillSecondary,
  },
  roleBadgeText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  roleBadgeTextOwner: {
    color: colors.accent,
  },
  roleBadgeTextMember: {
    color: colors.textSecondary,
  },
  heroCount: {
    ...typography.footnote,
    color: colors.textSecondary,
  },

  // ── 邀请码 ──
  codeCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codeCell: {
    width: 38,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    ...typography.title3,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
  },
  codeHint: {
    ...typography.caption1,
    color: colors.textTertiary,
  },

  // ── 成员列表 ──
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberList: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  memberRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.fillSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarChar: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
  },
  memberDetail: {
    flex: 1,
  },
  memberName: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    marginBottom: 1,
  },
  memberMeTag: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
  memberRoleText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  removeTouch: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  removeText: {
    ...typography.footnote,
    color: colors.error,
    fontWeight: '500',
  },

  // ── 退出/解散 ──
  leaveBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  leaveText: {
    ...typography.body,
    color: colors.error,
    fontSize: 15,
  },

  // ── 表单 ──
  formWrap: {
    paddingTop: spacing.sm,
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.accent,
    fontSize: 16,
  },
  formTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formSub: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  inputWrap: {
    position: 'relative',
    marginBottom: spacing.xl,
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
  inputCode: {
    letterSpacing: 3,
    fontWeight: '600',
  },
  inputCount: {
    position: 'absolute',
    right: spacing.lg,
    top: 18,
    ...typography.caption1,
    color: colors.textTertiary,
  },
  formSubmit: {
    marginTop: spacing.sm,
  },
});
