import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../infra/cache/cache.service';
import { DbService } from '../../infra/db/db.service';
import { QueueService } from '../../infra/queue/queue.service';
import { StorageService } from '../../infra/storage/storage.service';
import { VectorService } from '../../infra/vector/vector.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly dbService: DbService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly vectorService: VectorService,
  ) {}

  getHealthSummary() {
    return {
      status: 'ok',
      service: this.configService.get<string>('app.name') ?? 'common-server',
      env: this.configService.get<string>('app.nodeEnv') ?? 'development',
      modules: {
        cache: this.cacheService.getStatus(),
        database: this.dbService.getStatus(),
        queue: this.queueService.getStatus(),
        storage: this.storageService.getStatus(),
        vector: this.vectorService.getStatus(),
      },
    };
  }
}
