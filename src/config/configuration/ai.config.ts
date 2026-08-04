import { registerAs } from '@nestjs/config';

/** 单模型配置项（适配器构造函数入参） */
export interface AiModelItem {
  id: string;
  name: string;
  provider: 'openai-compatible' | 'anthropic' | 'deepseek';
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

type AiConfig = {
  provider: AiModelItem['provider'];
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
};

export const aiConfig = registerAs(
  'ai',
  (): AiConfig => ({
    provider:
      (process.env.AI_PROVIDER as AiConfig['provider']) ?? 'openai-compatible',
    model: process.env.AI_MODEL ?? '',
    apiKey: process.env.AI_API_KEY ?? '',
    baseUrl: process.env.AI_BASE_URL ?? '',
    temperature: process.env.AI_TEMPERATURE
      ? Number(process.env.AI_TEMPERATURE)
      : undefined,
    maxTokens: process.env.AI_MAX_TOKENS
      ? Number(process.env.AI_MAX_TOKENS)
      : undefined,
  }),
);
