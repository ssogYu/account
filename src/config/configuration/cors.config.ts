import { registerAs } from '@nestjs/config';

import { parseCsv } from './helpers';

export const corsConfig = registerAs('cors', () => ({
  origins: parseCsv(process.env.CORS_ORIGINS, ['http://localhost:5173']),
}));
