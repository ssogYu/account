import { registerAs } from '@nestjs/config';

import { parseNumber } from './helpers';

export const queueConfig = registerAs('queue', () => ({
  provider: process.env.QUEUE_PROVIDER ?? 'bullmq',
  redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
  redisPort: parseNumber(process.env.REDIS_PORT, 6379),
  prefix: process.env.QUEUE_PREFIX ?? 'common',
}));
