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
    .default('http://localhost:3001'),
  DATABASE_URL: Joi.string().trim().required(),
};

const loggerConfigSchema = {
  LOG_LEVEL: Joi.string()
    .valid(...LOGGER_LEVELS)
    .default('debug'),
  LOG_PRETTY: Joi.boolean().default(true),
  LOG_IGNORED_PATHS: Joi.string().allow('').default(''),
};

const jwtConfigSchema = {
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
};

const minioConfigSchema = {
  MINIO_ENDPOINT: Joi.string().trim().default('localhost'),
  MINIO_PORT: Joi.number().port().default(9000),
  MINIO_ACCESS_KEY: Joi.string().trim().default('minioadmin'),
  MINIO_SECRET_KEY: Joi.string().trim().default('minioadmin'),
  MINIO_USE_SSL: Joi.string().valid('true', 'false').default('false'),
  MINIO_BUCKET: Joi.string().trim().default('account'),
};

export const envValidationSchema = Joi.object({
  ...appConfigSchema,
  ...loggerConfigSchema,
  ...jwtConfigSchema,
  ...minioConfigSchema,
});
