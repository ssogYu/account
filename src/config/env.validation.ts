import * as Joi from 'joi';

// ---- 通用规则 ----

/** CSV 格式的 URL 列表（如 http://a.com,http://b.com） */
const csvUrls = Joi.string()
  .trim()
  .pattern(/^(https?:\/\/[^\s,]+)(,\s*https?:\/\/[^\s,]+)*$/)
  .messages({
    'string.pattern.base':
      'CORS_ORIGINS 格式错误，应为逗号分隔的完整 URL，如：http://a.com,http://b.com',
  });

/** 可选但非空的字符串 */
const optionalString = (fallback: string) =>
  Joi.string().trim().allow('').default(fallback);

// ---- 各模块 Schema ----

const appConfigSchema = {
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development')
    .messages({
      'any.only': 'NODE_ENV 必须是 development / test / production 之一',
    }),

  APP_NAME: Joi.string().trim().default('common-server'),

  PORT: Joi.number().port().default(3000).messages({
    'number.port': 'PORT 必须是有效端口号 (1-65535)',
  }),

  API_PREFIX: Joi.string().trim().default('api/v1'),

  APP_ORIGIN: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3001')
    .messages({ 'string.uri': 'APP_ORIGIN 必须是合法的 http/https 地址' }),

  CORS_ORIGINS: csvUrls.default('http://localhost:5173'),
};

const docsConfigSchema = {
  DOCS_ENABLED: Joi.boolean()
    .truthy('true', '1', 'yes', 'on')
    .falsy('false', '0', 'no', 'off')
    .default(false),

  DOCS_PATH: Joi.string().trim().default('docs'),

  DOCS_TITLE: Joi.string().trim().default('CommonServer API'),

  DOCS_DESCRIPTION: Joi.string().trim().default('CommonServer backend API scaffold'),
};

const databaseConfigSchema = {
  DB_PROVIDER: Joi.string().trim().default('postgresql'),

  DATABASE_URL: Joi.string()
    .trim()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .default(
      'postgresql://common:common123@localhost:5432/common?schema=public',
    )
    .messages({
      'string.uri': 'DATABASE_URL 必须是合法的 postgresql:// 连接地址',
      'string.empty': 'DATABASE_URL 不能为空',
    }),

  DATABASE_DIRECT_URL: optionalString(''),

  DATABASE_SCHEMA: Joi.string().trim().default('public'),
};

const queueConfigSchema = {
  QUEUE_PROVIDER: Joi.string().trim().default('bullmq'),

  REDIS_HOST: Joi.string().trim().default('127.0.0.1').messages({
    'string.empty': 'REDIS_HOST 不能为空',
  }),

  REDIS_PORT: Joi.number().port().default(6379),

  QUEUE_PREFIX: Joi.string().trim().default('common'),
};

const storageConfigSchema = {
  STORAGE_PROVIDER: Joi.string().trim().default('minio'),

  STORAGE_ENDPOINT: Joi.string().trim().default('127.0.0.1'),

  STORAGE_PORT: Joi.number().port().default(9000),

  STORAGE_USE_SSL: Joi.boolean()
    .truthy('true', '1', 'yes', 'on')
    .falsy('false', '0', 'no', 'off')
    .default(false),

  STORAGE_BUCKET: Joi.string().trim().default('common-dev'),

  STORAGE_ACCESS_KEY: optionalString(''),

  STORAGE_SECRET_KEY: optionalString(''),
};

const vectorConfigSchema = {
  VECTOR_PROVIDER: Joi.string().trim().default('pgvector'),

  VECTOR_DIMENSIONS: Joi.number().integer().positive().default(1024).messages({
    'number.positive': 'VECTOR_DIMENSIONS 必须是正整数',
  }),
};

const aiConfigSchema = {
  AI_PROVIDER: Joi.string()
    .trim()
    .valid('openai-compatible', 'anthropic', 'deepseek')
    .default('openai-compatible')
    .messages({
      'any.only':
        'AI_PROVIDER 必须是 openai-compatible / anthropic / deepseek 之一',
    }),

  AI_MODEL: Joi.string().trim().default(''),

  AI_BASE_URL: optionalString(''),

  AI_API_KEY: optionalString(''),

  AI_TEMPERATURE: Joi.string()
    .trim()
    .allow('')
    .pattern(/^[0-9]*\.?[0-9]+$/)
    .optional(),

  AI_MAX_TOKENS: Joi.string().trim().allow('').pattern(/^\d+$/).optional(),
};

const authConfigSchema = {
  JWT_SECRET: Joi.string()
    .trim()
    .min(16)
    .default('common-dev-secret-key')
    .messages({
      'string.min': 'JWT_SECRET 长度不能少于 16 个字符',
    }),

  JWT_EXPIRES_IN: Joi.string()
    .trim()
    .pattern(/^\d+[smhd]$/)
    .default('7d')
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN 格式错误，例如：7d / 24h / 60m',
    }),
};

const loggerConfigSchema = {
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info')
    .messages({
      'any.only':
        'LOG_LEVEL 必须是 trace / debug / info / warn / error / fatal 之一',
    }),

  LOG_PRETTY: Joi.boolean()
    .truthy('true', '1', 'yes', 'on')
    .falsy('false', '0', 'no', 'off')
    .default(false),
};

export const envValidationSchema = Joi.object({
  ...appConfigSchema,
  ...authConfigSchema,
  ...docsConfigSchema,
  ...databaseConfigSchema,
  ...queueConfigSchema,
  ...storageConfigSchema,
  ...vectorConfigSchema,
  ...aiConfigSchema,
  ...loggerConfigSchema,
});
