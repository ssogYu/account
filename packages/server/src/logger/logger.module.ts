import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { LoggerModule as NestjsPinoLoggerModule } from 'nestjs-pino';

import { AppConfigModule } from '../config/config.module';
import { appConfig } from '../config/configuration/app.config';
import { createLoggerModuleConfig } from './logger.config';
import { loggerConfig } from 'src/config/configuration/logger.config';

// 将 nestjs-pino 封装成全局日志模块：
// - 应用只注册一次
// - 所有模块都能直接复用同一套日志能力
// - 配置统一从 AppConfigModule 注入，避免散落读取环境变量
@Global()
@Module({
  imports: [
    // 依赖全局配置模块，为异步日志配置工厂提供 app/logger 配置源。
    AppConfigModule,
    NestjsPinoLoggerModule.forRootAsync({
      // 显式声明依赖模块，保证工厂执行时相关配置 provider 已可用。
      imports: [AppConfigModule],
      // 直接注入 registerAs 生成的命名配置，而不是手动使用 ConfigService.get。
      inject: [appConfig.KEY, loggerConfig.KEY],
      useFactory: (
        app: ConfigType<typeof appConfig>,
        logger: ConfigType<typeof loggerConfig>,
        // 根据应用级配置和日志配置动态生成 nestjs-pino 参数。
      ) => createLoggerModuleConfig({ app, logger }),
    }),
  ],
  exports: [NestjsPinoLoggerModule],
})
export class AppLoggerModule {}
