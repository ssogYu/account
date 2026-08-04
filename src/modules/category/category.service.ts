import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { DbService } from '../../infra/db/db.service';
import { FamilyService } from '../family/family.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly db: DbService,
    private readonly familyService: FamilyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('CategoryService');
  }

  // ==========================================================
  // 查询
  // ==========================================================

  /** 获取分类列表：系统默认 + 家庭组共享 + 用户个人 */
  async findAll(userId: string) {
    const familyId = await this.familyService.getFamilyId(userId);

    const or: Record<string, unknown>[] = [{ isSystem: true }, { userId }];

    if (familyId) {
      or.push({ familyId });
    }

    return this.db.category.findMany({
      where: { OR: or },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ==========================================================
  // 创建
  // ==========================================================

  /** 创建分类：用户加入了家庭组则创建为家庭共享分类，否则为个人分类 */
  async create(userId: string, dto: CreateCategoryDto) {
    const familyId = await this.familyService.getFamilyId(userId);

    // 名称冲突检查
    const existing = familyId
      ? await this.db.category.findFirst({
          where: { familyId, userId: null, name: dto.name },
        })
      : await this.db.category.findFirst({
          where: { userId, familyId: null, name: dto.name },
        });

    if (existing) {
      throw new ConflictException(`分类 "${dto.name}" 已存在`);
    }

    const category = await this.db.category.create({
      data: {
        userId: familyId ? null : userId,
        familyId: familyId ?? null,
        name: dto.name,
        icon: dto.icon ?? null,
        type: dto.type,
        isSystem: false,
      },
    });

    this.logger.info(
      {
        categoryId: category.id,
        name: category.name,
        familyId: familyId ?? undefined,
      },
      '分类创建成功',
    );
    return category;
  }

  // ==========================================================
  // 更新
  // ==========================================================

  /** 更新分类：系统分类不可改，家庭组内任何成员可改家庭分类 */
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findByIdAndValidate(id, userId, false);
    const familyId = category.familyId;

    if (dto.name) {
      const duplicate = familyId
        ? await this.db.category.findFirst({
            where: { familyId, userId: null, name: dto.name },
          })
        : await this.db.category.findFirst({
            where: { userId, familyId: null, name: dto.name },
          });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`分类 "${dto.name}" 已存在`);
      }
    }

    return this.db.category.update({
      where: { id: category.id },
      data: {
        name: dto.name,
        icon: dto.icon,
        type: dto.type,
      },
    });
  }

  // ==========================================================
  // 删除
  // ==========================================================

  /** 删除分类：系统分类不可删，家庭组内任何成员可删家庭分类 */
  async remove(userId: string, id: string) {
    await this.findByIdAndValidate(id, userId, false);

    const billCount = await this.db.bill.count({ where: { categoryId: id } });

    if (billCount > 0) {
      throw new ConflictException(`该分类下存在 ${billCount} 条账单，无法删除`);
    }

    await this.db.category.delete({ where: { id } });

    return { deleted: true };
  }

  // ==========================================================
  // 私有方法
  // ==========================================================

  /**
   * 查询并校验分类操作权限
   *
   * 规则：系统分类不可改/删 | 个人分类仅所有者可操作 |
   * 家庭组分类组内任何成员可操作
   *
   * @param allowSystem - 是否允许系统分类（更新/删除时为 false）
   */
  private async findByIdAndValidate(
    id: string,
    userId: string,
    allowSystem: boolean,
  ) {
    const category = await this.db.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    if (category.isSystem) {
      if (!allowSystem) {
        throw new ForbiddenException('系统默认分类不可修改或删除');
      }
      return category;
    }

    // 个人分类：仅所有者可操作
    if (category.userId) {
      if (category.userId !== userId) {
        throw new ForbiddenException('无权操作该分类');
      }
      return category;
    }

    // 家庭组分类：需要确认用户属于同一家庭组
    if (category.familyId) {
      const userFamilyId = await this.familyService.getFamilyId(userId);
      if (userFamilyId !== category.familyId) {
        throw new ForbiddenException('无权操作该分类');
      }
      return category;
    }

    throw new ForbiddenException('无权操作该分类');
  }
}
