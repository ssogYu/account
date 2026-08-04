import { registerAs } from '@nestjs/config';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  level: LogLevel;
  /** 是否启用 pino-pretty 美化输出（仅开发环境） */
  pretty: boolean;
}

export const loggerConfig = registerAs('logger', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    level: (process.env.LOG_LEVEL as LogLevel) ?? 'info',
    // 开发环境默认启用 pretty，生产环境强制关闭
    pretty:
      nodeEnv === 'production' ? false : process.env.LOG_PRETTY !== 'false',
  } satisfies LoggerConfig;
});
