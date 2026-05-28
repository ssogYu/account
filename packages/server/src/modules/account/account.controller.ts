import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ResponseMessage } from '../../common/decorators';
import {
  ApiResponse as SwaggerApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @SwaggerApiResponse({ status: 200, description: '获取账户列表' })
  @ResponseMessage('获取成功')
  findMany(@CurrentUser() user: { id: string }) {
    return this.accountService.findMany(user.id);
  }

  @Post()
  @SwaggerApiResponse({ status: 200, description: '创建账户成功' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ResponseMessage('创建账户成功')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAccountDto) {
    return this.accountService.create(user.id, dto);
  }

  @Put(':id')
  @SwaggerApiResponse({ status: 200, description: '更新账户成功' })
  @ApiNotFoundResponse({ description: '账户不存在' })
  @ResponseMessage('更新账户成功')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountService.update(user.id, id, dto);
  }

  @Delete(':id')
  @SwaggerApiResponse({ status: 200, description: '删除账户成功' })
  @ApiNotFoundResponse({ description: '账户不存在' })
  @ResponseMessage('删除账户成功')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.accountService.remove(user.id, id);
  }
}
