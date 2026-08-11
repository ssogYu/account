import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { VisionService } from './vision.service';

@Module({
  providers: [AiService, VisionService],
  exports: [AiService, VisionService],
})
export class AiModule {}
