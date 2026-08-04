import { randomBytes } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import { DbService } from '../../infra/db/db.service';
import type { CreateFamilyDto } from './dto/create-family.dto';
import type { JoinFamilyDto } from './dto/join-family.dto';
import type { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class FamilyService {
  constructor(
    private readonly db: DbService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('FamilyService');
  }

  // ==========================================================
  // 查询
  // ==========================================================

  /** 获取用户当前所属家庭组（含成员列表） */
  async getByUser(userId: string) {
    const member = await this.db.familyMember.findUnique({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, avatar: true } },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    return member?.family ?? null;
  }

  /** 轻量查询：仅返回用户当前家庭组 ID，未加入则返回 null */
  async getFamilyId(userId: string): Promise<string | null> {
    const member = await this.db.familyMember.findUnique({
      where: { userId },
      select: { familyId: true },
    });
    return member?.familyId ?? null;
  }

  // ==========================================================
  // 创建
  // ==========================================================

  /** 创建家庭组，同时将创建者设为 owner */
  async create(userId: string, dto: CreateFamilyDto) {
    // 一个用户只能拥有/加入一个家庭组
    const existing = await this.db.familyMember.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('您已加入一个家庭组，无法创建新的');
    }

    const inviteCode = this.generateInviteCode();

    const family = await this.db.family.create({
      data: {
        name: dto.name,
        inviteCode,
        ownerId: userId,
        members: {
          create: { userId, role: FamilyRole.owner },
        },
      },
      include: { members: true },
    });

    this.logger.info(
      { familyId: family.id, name: family.name, userId },
      '家庭组创建成功',
    );
    return family;
  }

  // ==========================================================
  // 加入
  // ==========================================================

  /** 通过邀请码加入家庭组 */
  async join(userId: string, dto: JoinFamilyDto) {
    const existing = await this.db.familyMember.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('您已加入一个家庭组，请先退出当前家庭组');
    }

    const family = await this.db.family.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!family) {
      throw new NotFoundException('邀请码无效或家庭组不存在');
    }

    await this.db.familyMember.create({
      data: {
        familyId: family.id,
        userId,
        role: FamilyRole.member,
      },
    });

    this.logger.info(
      { familyId: family.id, familyName: family.name, userId },
      '成员加入家庭组',
    );

    return this.getByUser(userId);
  }

  // ==========================================================
  // 退出
  // ==========================================================

  /** 退出家庭组（owner 必须先转让或解散） */
  async leave(userId: string) {
    const member = await this.db.familyMember.findUnique({
      where: { userId },
      include: { family: true },
    });

    if (!member) {
      throw new NotFoundException('您未加入任何家庭组');
    }

    if (member.role === FamilyRole.owner) {
      throw new ForbiddenException(
        '家庭组创建者无法直接退出，请先解散家庭组',
      );
    }

    await this.db.familyMember.delete({ where: { userId } });

    this.logger.info(
      { familyId: member.familyId, userId },
      '成员退出家庭组',
    );

    return { left: true };
  }

  // ==========================================================
  // 解散
  // ==========================================================

  /** 解散家庭组（仅 owner），级联删除所有成员关系 */
  async dissolve(userId: string) {
    const member = await this.db.familyMember.findUnique({
      where: { userId },
      include: { family: true },
    });

    if (!member) {
      throw new NotFoundException('您未加入任何家庭组');
    }

    if (member.role !== FamilyRole.owner) {
      throw new ForbiddenException('仅家庭组创建者可以解散家庭组');
    }

    const familyId = member.familyId;

    // 先删除所有成员关系（Cascade 已在 Prisma 层设置，这里显式删除确保清理）
    await this.db.familyMember.deleteMany({ where: { familyId } });
    await this.db.family.delete({ where: { id: familyId } });

    this.logger.info(
      { familyId, familyName: member.family.name },
      '家庭组已解散',
    );

    return { dissolved: true };
  }

  // ==========================================================
  // 成员管理
  // ==========================================================

  /** 移除成员（仅 owner） */
  async removeMember(ownerId: string, targetUserId: string) {
    const owner = await this.db.familyMember.findUnique({
      where: { userId: ownerId },
    });

    if (!owner || owner.role !== FamilyRole.owner) {
      throw new ForbiddenException('仅家庭组创建者可以移除成员');
    }

    if (targetUserId === ownerId) {
      throw new ForbiddenException('无法移除自己，请使用解散功能');
    }

    const target = await this.db.familyMember.findUnique({
      where: { userId: targetUserId },
    });

    if (!target || target.familyId !== owner.familyId) {
      throw new NotFoundException('该成员不在您的家庭组中');
    }

    await this.db.familyMember.delete({ where: { userId: targetUserId } });

    this.logger.info(
      { familyId: owner.familyId, targetUserId },
      '成员已被移出家庭组',
    );

    return { removed: true };
  }

  // ==========================================================
  // 更新
  // ==========================================================

  /** 更新家庭组名称（仅 owner） */
  async updateName(userId: string, dto: UpdateFamilyDto) {
    const member = await this.db.familyMember.findUnique({
      where: { userId },
    });

    if (!member) {
      throw new NotFoundException('您未加入任何家庭组');
    }

    if (member.role !== FamilyRole.owner) {
      throw new ForbiddenException('仅家庭组创建者可以修改名称');
    }

    return this.db.family.update({
      where: { id: member.familyId },
      data: { name: dto.name },
      include: { members: true },
    });
  }

  /** 刷新邀请码（仅 owner） */
  async newInviteCode(userId: string) {
    const member = await this.db.familyMember.findUnique({
      where: { userId },
    });

    if (!member) {
      throw new NotFoundException('您未加入任何家庭组');
    }

    if (member.role !== FamilyRole.owner) {
      throw new ForbiddenException('仅家庭组创建者可以刷新邀请码');
    }

    const inviteCode = this.generateInviteCode();

    return this.db.family.update({
      where: { id: member.familyId },
      data: { inviteCode },
      select: { inviteCode: true },
    });
  }

  // ==========================================================
  // 私有方法
  // ==========================================================

  /** 生成 8 位大写字母数字邀请码 */
  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
