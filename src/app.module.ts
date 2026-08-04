import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './infra/logger/logger.module';
import { InfraModule } from './infra/infra.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillModule } from './modules/bill/bill.module';
import { CategoryModule } from './modules/category/category.module';
import { FamilyModule } from './modules/family/family.module';
import { HealthModule } from './modules/health/health.module';
import { PaymentAccountModule } from './modules/payment-account/payment-account.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    InfraModule,
    AiModule,
    AuthModule,
    BillModule,
    CategoryModule,
    FamilyModule,
    HealthModule,
    PaymentAccountModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
