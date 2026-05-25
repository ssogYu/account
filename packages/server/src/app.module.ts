import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './logger/logger.module';

@Module({
  imports: [AppConfigModule, AppLoggerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
