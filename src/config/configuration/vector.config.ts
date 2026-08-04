import { registerAs } from '@nestjs/config';

import { parseNumber } from './helpers';

export const vectorConfig = registerAs('vector', () => ({
  provider: process.env.VECTOR_PROVIDER ?? 'pgvector',
  dimensions: parseNumber(process.env.VECTOR_DIMENSIONS, 1024),
}));
