import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { BillService } from './bill.service';
import { CreateBillDto, UpdateBillDto, QueryBillDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ResponseMessage } from '../../common/decorators';
import {
  ApiResponse as SwaggerApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@Controller('bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  @SwaggerApiResponse({ status: 200, description: '创建账单成功' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ResponseMessage('创建账单成功')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBillDto) {
    return this.billService.create(user.id, dto);
  }

  @Get()
  @SwaggerApiResponse({ status: 200, description: '获取账单列表' })
  @ResponseMessage('获取成功')
  findMany(@CurrentUser() user: { id: string }, @Query() query: QueryBillDto) {
    return this.billService.findMany(user.id, query);
  }

  @Get('summary')
  @SwaggerApiResponse({ status: 200, description: '获取收支汇总' })
  @ResponseMessage('获取成功')
  getSummary(
    @CurrentUser() user: { id: string },
    @Query('month') month?: string,
    @Query('date') date?: string,
    @Query('userId') filterUserId?: string,
  ) {
    return this.billService.getSummary(user.id, month, date, filterUserId);
  }

  @Get('today')
  @SwaggerApiResponse({ status: 200, description: '获取今日收支汇总' })
  @ResponseMessage('获取成功')
  getTodaySummary(@CurrentUser() user: { id: string }) {
    return this.billService.getTodaySummary(user.id);
  }

  @Get('stats/category')
  @SwaggerApiResponse({ status: 200, description: '获取分类汇总统计' })
  @ResponseMessage('获取成功')
  getCategoryStats(
    @CurrentUser() user: { id: string },
    @Query('month') month?: string,
    @Query('date') date?: string,
    @Query('type') type?: string,
    @Query('userId') filterUserId?: string,
  ) {
    return this.billService.getCategoryStats(
      user.id,
      month,
      date,
      type,
      filterUserId,
    );
  }

  @Get('stats/daily')
  @SwaggerApiResponse({ status: 200, description: '获取每日趋势统计' })
  @ResponseMessage('获取成功')
  getDailyStats(
    @CurrentUser() user: { id: string },
    @Query('month') month?: string,
    @Query('userId') filterUserId?: string,
  ) {
    return this.billService.getDailyStats(user.id, month, filterUserId);
  }

  @Get('stats/comparison')
  @SwaggerApiResponse({ status: 200, description: '获取月度对比统计' })
  @ResponseMessage('获取成功')
  getMonthlyComparison(
    @CurrentUser() user: { id: string },
    @Query('month') month?: string,
    @Query('userId') filterUserId?: string,
  ) {
    return this.billService.getMonthlyComparison(user.id, month, filterUserId);
  }

  @Get(':id')
  @SwaggerApiResponse({ status: 200, description: '获取账单详情' })
  @ApiNotFoundResponse({ description: '账单不存在' })
  @ResponseMessage('获取成功')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.billService.findOne(user.id, id);
  }

  @Put(':id')
  @SwaggerApiResponse({ status: 200, description: '更新账单成功' })
  @ApiNotFoundResponse({ description: '账单不存在' })
  @ResponseMessage('更新账单成功')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
  ) {
    return this.billService.update(user.id, id, dto);
  }

  @Delete(':id')
  @SwaggerApiResponse({ status: 200, description: '删除账单成功' })
  @ApiNotFoundResponse({ description: '账单不存在' })
  @ResponseMessage('删除账单成功')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.billService.remove(user.id, id);
  }
}
