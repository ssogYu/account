import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { loggerConfig } from './logger.config';

/**
 * 全局日志模块，基于 pino + nestjs-pino。
 *
 * 特性：
 * - 生产环境：纯 JSON 输出，可直接接入 ELK / Datadog / CLS 等日志平台
 * - 开发环境：通过 pino-pretty transport 美化输出（彩色 + 时间戳）
 * - 自动注入 requestId（复用 Fastify 的 req.id）
 * - HTTP 请求自动日志（请求方法、URL、响应耗时、状态码）
 * - 生产环境静默成功响应，只记录 warn 及以上级别
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [loggerConfig.KEY],
      useFactory: (config: ConfigType<typeof loggerConfig>) => {
        const isProduction = process.env.NODE_ENV === 'production';

        const pinoHttp: Record<string, unknown> = {
          level: config.level,

          // 生产环境静默成功响应，只记录 ≥ warn 的 HTTP 日志
          quietReqLogger: isProduction,
        };

        // 开发环境：通过 pino transport 接入 pino-pretty
        // 优点：不走 shell pipe，不会影响 nest --watch 热重载
        if (!isProduction && config.pretty) {
          pinoHttp.transport = {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              singleLine: true,
              ignore: 'pid,hostname',
            },
          };
        }

        return {
          pinoHttp,
          renameContext: 'context',
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class AppLoggerModule {}
