import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { SignOptions } from 'jsonwebtoken';
import { PinoLogger } from 'nestjs-pino';

import { authConfig } from '../../config/configuration/auth.config';
import { DbService } from '../../infra/db/db.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('AuthService');
  }

  async register(dto: RegisterDto) {
    const existing = await this.db.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existing) {
      const field = existing.email === dto.email ? '邮箱' : '用户名';
      throw new ConflictException(`${field}已被注册`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.db.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
      },
    });

    this.logger.info({ userId: user.id }, '用户注册成功');

    return {
      token: this.generateToken(user.id, user.email, user.username),
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.info({ userId: user.id }, '用户登录成功');

    return {
      token: this.generateToken(user.id, user.email, user.username),
      user: this.sanitizeUser(user),
    };
  }

  async logout(userId: string) {
    await this.db.user.update({
      where: { id: userId },
      data: { lastLogoutAt: new Date() },
    });

    this.logger.info({ userId }, '用户登出');
    return { success: true };
  }

  private generateToken(userId: string, email: string, username: string) {
    return this.jwtService.sign(
      { sub: userId, email, username },
      {
        secret: this.config.jwtSecret,
        expiresIn: this.config.jwtExpiresIn as SignOptions['expiresIn'],
      },
    );
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    username: string;
    avatar: string | null;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
