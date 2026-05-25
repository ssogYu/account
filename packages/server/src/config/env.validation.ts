import * as Joi from 'joi';
import { LOGGER_LEVELS } from './configuration/logger.config';

const appConfigSchema = {
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  APP_NAME: Joi.string().trim().default('account-server'),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().trim().default('api/v1'),
  APP_ORIGIN: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000'),
};

const loggerConfigSchema = {
  LOG_LEVEL: Joi.string()
    .valid(...LOGGER_LEVELS)
    .default('debug'),
  LOG_PRETTY: Joi.boolean().default(true),
  LOG_IGNORED_PATHS: Joi.string().allow('').default(''),
};

export const envValidationSchema = Joi.object({
  ...appConfigSchema,
  ...loggerConfigSchema,
});
