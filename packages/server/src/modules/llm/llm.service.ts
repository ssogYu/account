import { Injectable, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatDeepSeek } from '@langchain/deepseek';
import { llmConfig } from '../../config/configuration/llm.config';

/**
 * LLM 统一适配服务
 *
 * 根据配置自动创建对应的 LLM 实例，统一请求/响应参数。
 * 支持 OpenAI (含兼容 API)、DeepSeek、Google Gemini、Ollama 本地部署。
 */
@Injectable()
export class LlmService {
  private readonly chatModel: BaseChatModel;
  private readonly config: ConfigType<typeof llmConfig>;

  constructor(
    @Inject(llmConfig.KEY)
    config: ConfigType<typeof llmConfig>,
  ) {
    this.config = config;
    this.chatModel = this.createChatModel();
  }

  getModel(): BaseChatModel {
    return this.chatModel;
  }

  getProvider(): string {
    return this.config.provider;
  }

  private createChatModel(): BaseChatModel {
    switch (this.config.provider) {
      case 'deepseek':
        return new ChatDeepSeek({
          apiKey: this.config.deepseek.apiKey,
          model: this.config.deepseek.model,
          temperature: this.config.deepseek.temperature,
          maxTokens: this.config.deepseek.maxTokens,
          modelKwargs: { thinking: { type: 'disabled' } },
        });

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          apiKey: this.config.gemini.apiKey,
          model: this.config.gemini.model,
          temperature: this.config.gemini.temperature,
          maxOutputTokens: this.config.gemini.maxTokens,
        });

      case 'ollama':
        return new ChatOpenAI({
          modelName: this.config.ollama.model,
          temperature: this.config.ollama.temperature,
          configuration: {
            baseURL: `${this.config.ollama.baseUrl}/v1`,
          },
        });

      case 'openai':
      default:
        return new ChatOpenAI({
          openAIApiKey: this.config.openai.apiKey,
          modelName: this.config.openai.model,
          temperature: this.config.openai.temperature,
          maxTokens: this.config.openai.maxTokens,
          configuration: this.config.openai.baseUrl
            ? { baseURL: this.config.openai.baseUrl }
            : undefined,
        });
    }
  }
}
