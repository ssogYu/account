import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { BillType } from '@prisma/client';

/** 统计时间维度 */
export enum StatisticsPeriod {
  day = 'day',
  week = 'week',
  month = 'month',
  year = 'year',
  all = 'all',
}

/** 排行榜类型 */
export enum RankingType {
  expense = 'expense',
  income = 'income',
}

export class QueryStatisticsDto {
  @ApiProperty({
    enum: StatisticsPeriod,
    example: StatisticsPeriod.month,
    description: '时间维度：day/week/month/year',
  })
  @IsEnum(StatisticsPeriod)
  period: StatisticsPeriod;

  @ApiPropertyOptional({
    example: '2026-08',
    description:
      '锚点日期。day: YYYY-MM-DD，week: YYYY-MM-DD（取该日所在周），month: YYYY-MM，year: YYYY。不传则使用当前时间。',
  })
  @IsOptional()
  @IsString()
  anchor?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: '按家庭成员筛选（仅在家庭组模式下有效）。不传则查全家汇总。',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class QueryCategoryStatsDto {
  @ApiProperty({
    enum: StatisticsPeriod,
    example: StatisticsPeriod.month,
    description: '时间维度：day/week/month/year',
  })
  @IsEnum(StatisticsPeriod)
  period: StatisticsPeriod;

  @ApiPropertyOptional({
    enum: BillType,
    example: BillType.expense,
    description: '类型筛选：expense 支出 / income 收入，默认 expense',
  })
  @IsOptional()
  @IsEnum(BillType)
  type?: BillType = BillType.expense;

  @ApiPropertyOptional({
    example: '2026-08',
    description: '锚点日期，同 QueryStatisticsDto',
  })
  @IsOptional()
  @IsString()
  anchor?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: '按家庭成员筛选',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class QueryTrendDto {
  @ApiProperty({
    enum: StatisticsPeriod,
    example: StatisticsPeriod.month,
    description:
      '聚合粒度：day 按日 / month 按月。week 按日聚合，year 按月聚合。',
  })
  @IsEnum(StatisticsPeriod)
  period: StatisticsPeriod;

  @ApiPropertyOptional({
    example: '2026-08',
    description: '锚点日期，同 QueryStatisticsDto',
  })
  @IsOptional()
  @IsString()
  anchor?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: '按家庭成员筛选',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class QueryRankingDto {
  @ApiProperty({
    enum: StatisticsPeriod,
    example: StatisticsPeriod.month,
    description: '时间维度：day/week/month/year',
  })
  @IsEnum(StatisticsPeriod)
  period: StatisticsPeriod;

  @ApiPropertyOptional({
    enum: RankingType,
    example: RankingType.expense,
    description: '排行榜类型：expense 支出 / income 收入，默认 expense',
  })
  @IsOptional()
  @IsEnum(RankingType)
  type?: RankingType = RankingType.expense;

  @ApiPropertyOptional({
    example: '2026-08',
    description: '锚点日期，同 QueryStatisticsDto',
  })
  @IsOptional()
  @IsString()
  anchor?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: '按家庭成员筛选',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
