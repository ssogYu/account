import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BusinessException } from '../../common/exceptions';
import { ErrorCode } from '@ai-account/shared';
import { CreateFamilyDto, JoinFamilyDto } from './dto';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  /** 创建家庭组 */
  async create(userId: string, dto: CreateFamilyDto) {
    // 检查用户是否已加入家庭组
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
    });
    if (membership) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '你已加入家庭组，无法重复创建',
      );
    }

    let inviteCode = generateInviteCode();
    // 确保邀请码唯一
    const existingCode = await this.prisma.family.findUnique({
      where: { inviteCode },
    });
    if (existingCode) {
      inviteCode = generateInviteCode();
    }

    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        creatorId: userId,
        inviteCode,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: { id: true, nickname: true, avatar: true, phone: true },
            },
          },
        },
      },
    });

    return family;
  }

  /** 通过邀请码加入家庭组 */
  async join(userId: string, dto: JoinFamilyDto) {
    // 检查是否已加入
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
    });
    if (membership) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '你已加入家庭组，请先退出后再加入新的家庭组',
      );
    }

    const family = await this.prisma.family.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!family) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '邀请码无效，请检查后重试',
      );
    }

    await this.prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId,
        role: 'member',
      },
    });

    return this.getFamilyDetail(family.id);
  }

  /** 获取当前用户的家庭组信息 */
  async getMyFamily(userId: string) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              select: {
                id: true,
                userId: true,
                role: true,
                joinedAt: true,
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    avatar: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      ...membership.family,
      myRole: membership.role,
    };
  }

  /** 退出家庭组 */
  async leave(userId: string) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '你未加入任何家庭组');
    }

    const family = await this.prisma.family.findUnique({
      where: { id: membership.familyId },
      include: { members: true },
    });

    if (!family) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '家庭组不存在');
    }

    // 组长退出 = 解散家庭组
    if (membership.role === 'owner') {
      await this.prisma.familyMember.deleteMany({
        where: { familyId: family.id },
      });
      await this.prisma.family.delete({
        where: { id: family.id },
      });
      return { dissolved: true };
    }

    // 普通成员退出
    await this.prisma.familyMember.delete({
      where: { id: membership.id },
    });
    return { dissolved: false };
  }

  /** 移除成员（仅组长可操作） */
  async removeMember(userId: string, memberId: string) {
    const operatorMembership = await this.prisma.familyMember.findFirst({
      where: { userId },
    });
    if (!operatorMembership || operatorMembership.role !== 'owner') {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅组长可以移除成员');
    }

    const targetMembership = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });
    if (
      !targetMembership ||
      targetMembership.familyId !== operatorMembership.familyId
    ) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '该成员不在你的家庭组中',
      );
    }

    if (targetMembership.role === 'owner') {
      throw new BusinessException(ErrorCode.BAD_REQUEST, '不能移除组长');
    }

    await this.prisma.familyMember.delete({
      where: { id: memberId },
    });
    return { success: true };
  }

  /** 获取家庭组详情 */
  private async getFamilyDetail(familyId: string) {
    return this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: { id: true, nickname: true, avatar: true, phone: true },
            },
          },
        },
      },
    });
  }
}
