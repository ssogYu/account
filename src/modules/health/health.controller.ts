import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '健康检查',
    description: '返回服务及各基础设施模块（数据库、缓存、队列等）的运行状态。',
  })
  @ApiResponse({ status: 200, description: '服务运行正常' })
  getHealthSummary() {
    return this.healthService.getHealthSummary();
  }
}
