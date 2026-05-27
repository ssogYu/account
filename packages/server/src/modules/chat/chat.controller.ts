import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, QueryChatDto, ConfirmBillDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ResponseMessage } from '../../common/decorators';
import {
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ summary: '发送对话消息' })
  @SwaggerApiResponse({ status: 200, description: '发送成功' })
  @ResponseMessage('发送成功')
  sendMessage(
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: '获取对话历史' })
  @SwaggerApiResponse({ status: 200, description: '获取成功' })
  @ResponseMessage('获取成功')
  getHistory(
    @CurrentUser() user: { id: string },
    @Query() query: QueryChatDto,
  ) {
    return this.chatService.getHistory(user.id, query);
  }

  @Post('confirm/:messageId')
  @ApiOperation({ summary: '确认AI生成的账单' })
  @SwaggerApiResponse({ status: 200, description: '确认成功' })
  @ResponseMessage('确认成功')
  confirmBill(
    @CurrentUser() user: { id: string },
    @Param('messageId') messageId: string,
    @Body() dto: ConfirmBillDto,
  ) {
    return this.chatService.confirmBill(user.id, messageId, dto.edits);
  }

  @Post('reject/:messageId')
  @ApiOperation({ summary: '取消AI生成的账单确认卡片' })
  @SwaggerApiResponse({ status: 200, description: '取消成功' })
  @ResponseMessage('取消成功')
  rejectBill(
    @CurrentUser() user: { id: string },
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.rejectBill(user.id, messageId);
  }
}
