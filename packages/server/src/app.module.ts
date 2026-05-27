import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerErrorInterceptor } from 'nestjs-pino';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './modules/logger';
import { PrismaModule } from './modules/prisma';
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { FamilyModule } from './modules/family';
import { UploadModule } from './modules/upload';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    AuthModule,
    FamilyModule,
    UploadModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggerErrorInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
