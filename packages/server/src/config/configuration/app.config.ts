import { registerAs } from '@nestjs/config';
import { parseNumber } from './helpers';

export const appConfig = registerAs('app', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    name: process.env.APP_NAME ?? 'account-server',
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: parseNumber(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:3001',
  };
});
