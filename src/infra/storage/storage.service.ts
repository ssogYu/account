import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    return {
      provider: this.configService.get<string>('storage.provider') ?? 'minio',
      configured: Boolean(this.configService.get<string>('storage.accessKey')),
      endpoint:
        this.configService.get<string>('storage.endpoint') ?? '127.0.0.1',
      port: this.configService.get<number>('storage.port') ?? 9000,
      bucket: this.configService.get<string>('storage.bucket') ?? 'common-dev',
    };
  }
}
