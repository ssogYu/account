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
  MINIO_ROOT_USER: Joi.string().trim().default('minioadmin'),
  MINIO_ROOT_PASSWORD: Joi.string().trim().default('minioadmin'),
  MINIO_USE_SSL: Joi.string().valid('true', 'false').default('false'),
  MINIO_BUCKET: Joi.string().trim().default('account'),
  MINIO_PRIVATE_BUCKET: Joi.string().trim().default('account-private'),
  MINIO_SIGNED_URL_EXPIRES_IN: Joi.number().integer().min(60).default(3600),
};

const ocrConfigSchema = {
  OCR_PROVIDER: Joi.string().valid('llm_vision', 'baidu').default('llm_vision'),
  LLM_VISION_OCR_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),
  LLM_VISION_OCR_MAX_IMAGES: Joi.number().integer().min(1).max(10).default(3),
  LLM_VISION_OCR_MAX_IMAGE_BYTES: Joi.number()
    .integer()
    .min(1024)
    .default(5 * 1024 * 1024),
  BAIDU_OCR_API_KEY: Joi.string().allow('').default(''),
  BAIDU_OCR_SECRET_KEY: Joi.string().allow('').default(''),
  BAIDU_OCR_TIMEOUT_MS: Joi.number().integer().min(1000).default(12000),
};

export const envValidationSchema = Joi.object({
  ...appConfigSchema,
  ...loggerConfigSchema,
  ...jwtConfigSchema,
  ...minioConfigSchema,
  ...ocrConfigSchema,
});
