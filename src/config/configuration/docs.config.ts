import { registerAs } from '@nestjs/config';

import { parseBoolean } from './helpers';

export const docsConfig = registerAs('docs', () => ({
  enabled: parseBoolean(process.env.DOCS_ENABLED, false),
  path: process.env.DOCS_PATH ?? 'docs',
  title: process.env.DOCS_TITLE ?? 'CommonServer API',
  description: process.env.DOCS_DESCRIPTION ?? 'CommonServer backend API scaffold',
}));
