import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { User } from '../../common/decorators/user.decorator';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';
import { PaymentAccountService } from './payment-account.service';

@ApiTags('payment-accounts')
@Controller('payment-accounts')
export class PaymentAccountController {
  constructor(private readonly paymentAccountService: PaymentAccountService) {}

  @Get()
  @ApiOperation({
    summary: '获取支付账户列表',
    description: '返回系统默认账户 + 当前用户的账户。',
  })
  @ApiResponse({ status: 200, description: '支付账户列表' })
  findAll(@User('userId') userId: string) {
    return this.paymentAccountService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: '创建自定义支付账户' })
  @ApiResponse({ status: 200, description: '支付账户创建成功' })
  @ApiResponse({ status: 409, description: '账户名已存在' })
  create(@User('userId') userId: string, @Body() dto: CreatePaymentAccountDto) {
    return this.paymentAccountService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '修改自定义支付账户',
    description: '系统默认账户不可修改。',
  })
  @ApiParam({ name: 'id', description: '支付账户 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '系统账户不可修改' })
  @ApiResponse({ status: 404, description: '支付账户不存在' })
  update(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentAccountDto,
  ) {
    return this.paymentAccountService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除自定义支付账户',
    description: '系统默认账户 或 有关联账单的账户不可删除。',
  })
  @ApiParam({ name: 'id', description: '支付账户 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '系统账户不可删除' })
  @ApiResponse({ status: 404, description: '支付账户不存在' })
  @ApiResponse({ status: 409, description: '账户下存在账单，无法删除' })
  remove(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentAccountService.remove(userId, id);
  }
}
