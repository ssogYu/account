import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'common-dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
}));
