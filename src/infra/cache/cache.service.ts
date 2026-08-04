import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    const redisHost =
      this.configService.get<string>('queue.redisHost') ?? '127.0.0.1';
    const redisPort = this.configService.get<number>('queue.redisPort') ?? 6379;

    return {
      provider: 'redis',
      configured: Boolean(redisHost),
      redisHost,
      redisPort,
    };
  }
}
