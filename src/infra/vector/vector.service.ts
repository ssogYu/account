import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    return {
      provider: this.configService.get<string>('vector.provider') ?? 'pgvector',
      dimensions: this.configService.get<number>('vector.dimensions') ?? 1024,
      configured: true,
    };
  }
}
