import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * 数据库服务 —— 封装 PrismaClient，管理连接生命周期。
 *
 * Prisma 7 推荐通过 driver adapter 连接数据库，
 * 使用 @prisma/adapter-pg + pg (node-postgres)。
 */
@Injectable()
export class DbService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const dbUrl = configService.get<string>('database.url');
    if (!dbUrl) {
      throw new Error('DATABASE_URL 未配置');
    }

    const pool = new Pool({ connectionString: dbUrl });

    // 如果 DATABASE_URL 中没有 timezone 参数，则在新连接建立时设置
    if (!dbUrl.includes('timezone=')) {
      pool.on('connect', (client) => {
        void client.query("SET timezone = 'Asia/Shanghai'");
      });
    }

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['error'],
    });

    this.pool = pool;
  }

  async onModuleInit() {
    // adapter 方式不需要手动 $connect
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /** 健康检查 */
  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  getStatus() {
    return {
      provider:
        this.configService.get<string>('database.provider') ?? 'postgresql',
      configured: Boolean(this.configService.get<string>('database.url')),
      schema: this.configService.get<string>('database.schema') ?? 'public',
    };
  }
}
