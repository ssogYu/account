import { registerAs } from '@nestjs/config';
import { parseNumber } from './helpers';

export const llmConfig = registerAs('llm', () => {
  const provider = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase();

  return {
    provider,

    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL ?? undefined,
      temperature: parseNumber(process.env.OPENAI_TEMPERATURE, 0),
      maxTokens: parseNumber(process.env.OPENAI_MAX_TOKENS, 1024),
    },

    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY ?? '',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash',
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      temperature: parseNumber(process.env.DEEPSEEK_TEMPERATURE, 0),
      maxTokens: parseNumber(process.env.DEEPSEEK_MAX_TOKENS, 4096),
    },

    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      temperature: parseNumber(process.env.GEMINI_TEMPERATURE, 0),
      maxTokens: parseNumber(process.env.GEMINI_MAX_TOKENS, 1024),
    },

    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
      temperature: parseNumber(process.env.OLLAMA_TEMPERATURE, 0),
    },
  };
});
