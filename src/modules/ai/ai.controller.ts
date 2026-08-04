import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '../../common/decorators/user.decorator';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { ConfirmDto } from './dto/confirm.dto';

@ApiTags('AI 对话')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'AI 对话',
    description:
      '发送自然语言消息，AI 自动识别意图（记账/查询/闲聊），' +
      '记账意图会提取结构化信息并返回确认卡片或自动创建。' +
      '首次对话不传 conversationId，响应中会返回新对话 ID。',
  })
  @ApiResponse({ status: 200, description: '对话结果' })
  chat(@User('userId') userId: string, @Body() dto: ChatDto) {
    return this.aiService.chat(userId, dto);
  }

  @Post('confirm')
  @ApiOperation({
    summary: '确认/取消记账',
    description: '对 AI 返回的待确认账单进行确认或取消。',
  })
  @ApiResponse({ status: 200, description: '操作结果' })
  confirm(@User('userId') userId: string, @Body() dto: ConfirmDto) {
    return this.aiService.confirm(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: '对话列表',
    description: '获取当前用户的所有 AI 对话，按最近活跃排序。',
  })
  @ApiResponse({ status: 200, description: '对话列表' })
  listConversations(@User('userId') userId: string) {
    return this.aiService.listConversations(userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: '对话消息记录',
    description: '获取指定对话的全部消息（按时间升序）。',
  })
  @ApiResponse({ status: 200, description: '消息列表' })
  getMessages(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiService.getMessages(userId, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({
    summary: '删除对话',
    description: '删除指定对话及其所有消息。',
  })
  @ApiResponse({ status: 200, description: '删除结果' })
  async deleteConversation(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.aiService.deleteConversation(userId, id);
    return { deleted: true };
  }
}
