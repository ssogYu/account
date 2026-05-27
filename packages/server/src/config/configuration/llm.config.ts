import { registerAs } from '@nestjs/config';
import { parseNumber } from './helpers';

export const llmConfig = registerAs('llm', () => {
  const provider = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase();

  return {
    /** 当前使用的 LLM 提供商: openai | gemini | ollama */
    provider,

    /** OpenAI 配置 */
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL ?? undefined,
      temperature: parseNumber(process.env.OPENAI_TEMPERATURE, 0),
      maxTokens: parseNumber(process.env.OPENAI_MAX_TOKENS, 1024),
    },

    /** Google Gemini 配置 */
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      temperature: parseNumber(process.env.GEMINI_TEMPERATURE, 0),
      maxTokens: parseNumber(process.env.GEMINI_MAX_TOKENS, 1024),
    },

    /** Ollama 本地部署配置 */
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
      temperature: parseNumber(process.env.OLLAMA_TEMPERATURE, 0),
    },
  };
});
