import { registerAs } from '@nestjs/config';

import { parseBoolean } from './helpers';

export const swaggerConfig = registerAs('swagger', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  return {
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, !isProduction),
    path: process.env.SWAGGER_PATH ?? 'docs',
    title: process.env.SWAGGER_TITLE ?? 'Account API',
    description:
      process.env.SWAGGER_DESCRIPTION ?? 'Account service API documentation',
    version: process.env.SWAGGER_VERSION ?? '1.0.0',
  };
});
