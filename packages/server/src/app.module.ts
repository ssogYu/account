import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerErrorInterceptor } from 'nestjs-pino';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

@Module({
  imports: [AppConfigModule, AppLoggerModule, PrismaModule],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggerErrorInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
