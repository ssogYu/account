import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma';
import { BusinessException } from '../../common/exceptions';
import { ErrorCode } from '@ai-account/shared';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.phone && !dto.email) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        '手机号或邮箱至少提供一个',
      );
    }

    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new BusinessException(ErrorCode.CONFLICT, '该手机号已注册');
      }
    }
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BusinessException(ErrorCode.CONFLICT, '该邮箱已注册');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        password: hashedPassword,
        nickname: dto.nickname ?? dto.phone ?? dto.email,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id);

    return { user, token };
  }

  async login(dto: LoginDto) {
    if (!dto.phone && !dto.email) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        '手机号或邮箱至少提供一个',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.email }],
      },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '账号或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '账号或密码错误');
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = this.generateToken(user.id);

    return { user: userWithoutPassword, token };
  }

  private generateToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: { nickname?: string; avatar?: string } = {};
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;

    if (Object.keys(data).length === 0) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        '至少需要更新一个字段',
      );
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        email: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    });

    return user;
  }
}
