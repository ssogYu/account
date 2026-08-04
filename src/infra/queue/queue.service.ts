import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    return {
      provider: this.configService.get<string>('queue.provider') ?? 'bullmq',
      prefix: this.configService.get<string>('queue.prefix') ?? 'common',
      redisHost:
        this.configService.get<string>('queue.redisHost') ?? '127.0.0.1',
      redisPort: this.configService.get<number>('queue.redisPort') ?? 6379,
    };
  }
}
