import { registerAs } from '@nestjs/config';
import { LevelWithSilent } from 'pino';

import { parseBoolean, parseCsv } from './helpers';

export const DEFAULT_LOG_IGNORED_PATHS = [
  '/health',
  '/healthz',
  '/metrics',
  '/favicon.ico',
] as const;

export const LOGGER_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const satisfies readonly LevelWithSilent[];

export const loggerConfig = registerAs('logger', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  return {
    level: (process.env.LOG_LEVEL ??
      (isProduction ? 'info' : 'debug')) as LevelWithSilent,
    pretty: parseBoolean(process.env.LOG_PRETTY, !isProduction),
    ignoredPaths: parseCsv(process.env.LOG_IGNORED_PATHS, [
      ...DEFAULT_LOG_IGNORED_PATHS,
    ]),
  };
});
