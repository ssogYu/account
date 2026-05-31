import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerErrorInterceptor } from 'nestjs-pino';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './modules/logger';
import { PrismaModule } from './modules/prisma';
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { FamilyModule } from './modules/family';
import { UploadModule } from './modules/upload';
import { BillModule } from './modules/bill';
import { CategoryModule } from './modules/category';
import { AccountModule } from './modules/account';
import { ChatModule } from './modules/chat';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { HealthController } from './health.controller';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    AuthModule,
    FamilyModule,
    UploadModule,
    BillModule,
    CategoryModule,
    AccountModule,
    ChatModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggerErrorInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
