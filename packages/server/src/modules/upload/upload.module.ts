import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { MinioService } from './minio.service';

@Module({
  controllers: [UploadController],
  providers: [MinioService],
  exports: [MinioService],
})
export class UploadModule {}
