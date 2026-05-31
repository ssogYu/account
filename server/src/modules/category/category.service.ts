import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BusinessException } from '../../common/exceptions';
import { ErrorCode } from '../../common/shared';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto } from './dto';
import { Prisma } from '@prisma/client';

/** 系统默认分类种子数据 */
const SYSTEM_EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: 'meal' },
  { name: '交通', icon: 'transport' },
  { name: '购物', icon: 'shopping' },
  { name: '娱乐', icon: 'entertain' },
  { name: '居住', icon: 'housing' },
  { name: '医疗', icon: 'medical' },
  { name: '教育', icon: 'education' },
  { name: '通讯', icon: 'telecom' },
  { name: '服饰', icon: 'clothing' },
  { name: '美容', icon: 'beauty' },
  { name: '运动', icon: 'sport' },
  { name: '其他', icon: 'other_exp' },
];

const SYSTEM_INCOME_CATEGORIES = [
  { name: '工资', icon: 'salary' },
  { name: '理财', icon: 'finance' },
  { name: '兼职', icon: 'parttime' },
  { name: '红包', icon: 'redpacket' },
  { name: '退款', icon: 'refund' },
  { name: '其他', icon: 'other_inc' },
];

@Injectable()
export class CategoryService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** 应用启动时初始化系统默认分类 */
  async onModuleInit() {
    const count = await this.prisma.category.count({
      where: { isSystem: true },
    });
    if (count > 0) return;

    const systemCategories = [
      ...SYSTEM_EXPENSE_CATEGORIES.map((c) => ({
        ...c,
        type: 'expense',
        isSystem: true,
        userId: null,
      })),
      ...SYSTEM_INCOME_CATEGORIES.map((c) => ({
        ...c,
        type: 'income',
        isSystem: true,
        userId: null,
      })),
    ];

    await this.prisma.category.createMany({
      data: systemCategories,
      skipDuplicates: true,
    });
  }

  /** 获取分类列表（系统默认 + 用户自定义） */
  async findMany(userId: string, query?: QueryCategoryDto) {
    const where: Prisma.CategoryWhereInput = {
      OR: [{ isSystem: true }, { userId }],
      ...(query?.type && { type: query.type }),
    };

    return this.prisma.category.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { type: 'asc' }, { name: 'asc' }],
    });
  }

  /** 创建用户自定义分类 */
  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        icon: dto.icon,
        isSystem: false,
      },
    });
  }

  /** 更新分类（仅用户自定义可修改） */
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({ where: { id } });
    if (!category) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '分类不存在');
    }
    if (category.isSystem) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '系统默认分类不可修改');
    }
    if (category.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权修改此分类');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
      },
    });
  }

  /** 删除分类（仅用户自定义可删除，有账单引用时拒绝） */
  async remove(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id } });
    if (!category) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '分类不存在');
    }
    if (category.isSystem) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '系统默认分类不可删除');
    }
    if (category.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权删除此分类');
    }

    const billCount = await this.prisma.bill.count({
      where: { categoryId: id },
    });
    if (billCount > 0) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        '该分类下有账单，无法删除',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
