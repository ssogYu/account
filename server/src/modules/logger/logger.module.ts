import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { LoggerModule as NestjsPinoLoggerModule } from 'nestjs-pino';

import { AppConfigModule } from '../../config/config.module';
import { appConfig } from '../../config/configuration/app.config';
import { createLoggerModuleConfig } from './logger.config';
import { loggerConfig } from 'src/config/configuration/logger.config';

@Global()
@Module({
  imports: [
    AppConfigModule,
    NestjsPinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [appConfig.KEY, loggerConfig.KEY],
      useFactory: (
        app: ConfigType<typeof appConfig>,
        logger: ConfigType<typeof loggerConfig>,
      ) => createLoggerModuleConfig({ app, logger }),
    }),
  ],
  exports: [NestjsPinoLoggerModule],
})
export class AppLoggerModule {}
