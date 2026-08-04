import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { User } from '../../common/decorators/user.decorator';
import { BillService } from './bill.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { QueryBillDto } from './dto/query-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@ApiTags('bills')
@Controller('bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get()
  @ApiOperation({
    summary: '查询账单列表',
    description:
      '分页查询当前用户的个人账单，支持按分类、类型、日期、关键字筛选。参数由 DTO 自动生成文档。',
  })
  @ApiResponse({ status: 200, description: '返回分页账单列表' })
  findAll(@User('userId') userId: string, @Query() query: QueryBillDto) {
    return this.billService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询账单详情' })
  @ApiParam({ name: 'id', description: '账单 ID' })
  @ApiResponse({ status: 200, description: '返回账单详情' })
  @ApiResponse({ status: 404, description: '账单不存在' })
  findById(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billService.findById(userId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建账单' })
  @ApiResponse({ status: 200, description: '账单创建成功' })
  create(@User('userId') userId: string, @Body() dto: CreateBillDto) {
    return this.billService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新账单',
    description: '仅更新传入的字段，至少传一个。',
  })
  @ApiParam({ name: 'id', description: '账单 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '账单不存在' })
  update(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillDto,
  ) {
    return this.billService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除账单' })
  @ApiParam({ name: 'id', description: '账单 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '账单不存在' })
  remove(
    @User('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billService.remove(userId, id);
  }
}
