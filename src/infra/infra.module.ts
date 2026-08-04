import { Global, Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { CacheService } from './cache/cache.service';
import { DbService } from './db/db.service';
import { QueueService } from './queue/queue.service';
import { SeedService } from './seed/seed.service';
import { StorageService } from './storage/storage.service';
import { VectorService } from './vector/vector.service';

@Global()
@Module({
  imports: [AiModule],
  providers: [
    CacheService,
    DbService,
    QueueService,
    SeedService,
    StorageService,
    VectorService,
  ],
  exports: [
    AiModule,
    CacheService,
    DbService,
    QueueService,
    StorageService,
    VectorService,
  ],
})
export class InfraModule {}
