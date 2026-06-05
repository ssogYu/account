import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmModule } from '../llm';
import { OcrModule } from '../ocr';
import { UploadModule } from '../upload';

@Module({
  imports: [LlmModule, OcrModule, UploadModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
