import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { User } from '../../common/decorators/user.decorator';
import { StatisticsService } from './statistics.service';
import type {
  Summary,
  ProfileSummary,
  CategoryStats,
  TrendData,
  RankingData,
} from './statistics.service';
import {
  QueryStatisticsDto,
  QueryCategoryStatsDto,
  QueryTrendDto,
  QueryRankingDto,
} from './dto/query-statistics.dto';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  @ApiOperation({
    summary: '收支汇总概览',
    description:
      '获取指定时间维度的总收入、总支出、结余和账单笔数。支持日/周/月/年/全部五个维度。',
  })
  @ApiResponse({ status: 200, description: '返回汇总数据' })
  async getSummary(
    @User('userId') userId: string,
    @Query() query: QueryStatisticsDto,
  ): Promise<Summary> {
    return this.statisticsService.getSummary(userId, query);
  }

  @Get('profile-summary')
  @ApiOperation({
    summary: '个人主页统计',
    description: '返回记账天数、账单总数、累计金额。用于"我的"页面用户卡片。',
  })
  @ApiResponse({ status: 200, description: '返回个人主页统计数据' })
  async getProfileSummary(
    @User('userId') userId: string,
  ): Promise<ProfileSummary> {
    return this.statisticsService.getProfileSummary(userId);
  }

  @Get('category-stats')
  @ApiOperation({
    summary: '分类统计（饼图数据）',
    description:
      '获取各分类的金额和占比，支持按支出/收入筛选。用于饼图和图例展示。',
  })
  @ApiResponse({ status: 200, description: '返回分类统计数据' })
  async getCategoryStats(
    @User('userId') userId: string,
    @Query() query: QueryCategoryStatsDto,
  ): Promise<CategoryStats> {
    return this.statisticsService.getCategoryStats(userId, query);
  }

  @Get('trend')
  @ApiOperation({
    summary: '收支趋势（柱状图数据）',
    description: '日/周/月视图按天聚合，年视图按月聚合，全部视图按年聚合。',
  })
  @ApiResponse({ status: 200, description: '返回趋势数据' })
  async getTrend(
    @User('userId') userId: string,
    @Query() query: QueryTrendDto,
  ): Promise<TrendData> {
    return this.statisticsService.getTrend(userId, query);
  }

  @Get('ranking')
  @ApiOperation({
    summary: '分类排行榜',
    description: '获取支出或收入分类的金额排名。用于 Top N 排行榜展示。',
  })
  @ApiResponse({ status: 200, description: '返回排行榜数据' })
  async getRanking(
    @User('userId') userId: string,
    @Query() query: QueryRankingDto,
  ): Promise<RankingData> {
    return this.statisticsService.getRanking(userId, query);
  }
}
