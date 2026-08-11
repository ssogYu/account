import { Inject, Injectable } from '@nestjs/common';
import type {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import { PinoLogger } from 'nestjs-pino';
import type { z } from 'zod';

import { aiConfig } from '../../config/configuration/ai.config';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { DeepSeekAdapter } from './adapters/deepseek.adapter';
import { QwenAdapter } from './adapters/qwen.adapter';
import type {
  AdapterProvider,
  AiConfig,
  IAiAdapter,
  ProviderConfig,
} from './types';
import { mapProvider } from './types';

const adapterRegistry: Record<
  AdapterProvider,
  new (config: ProviderConfig) => IAiAdapter
> = {
  openai: OpenAiAdapter,
  anthropic: AnthropicAdapter,
  deepseek: DeepSeekAdapter,
  qwen: QwenAdapter,
};

/**
 * 视觉识别服务 —— 独立于 AiService，专管图片识别。
 *
 * 使用独立的视觉模型配置（AI_VISION_*），默认走 Qwen 视觉模型。
 * 当未配置视觉模型时，服务不初始化，调用方可通过 isReady 判断。
 */
@Injectable()
export class VisionService {
  /** 视觉专用适配器（仅当配置了 AI_VISION_MODEL 时创建） */
  private readonly adapter: IAiAdapter | undefined;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(aiConfig.KEY)
    config: AiConfig,
  ) {
    this.logger.setContext('VisionService');

    if (!config.visionModel) {
      this.logger.warn('未配置 AI_VISION_MODEL，视觉识别服务不可用');
      return;
    }

    const provider = config.visionProvider ?? config.provider;
    this.adapter = this.createAdapter({
      provider: mapProvider(provider),
      model: config.visionModel,
      apiKey: config.visionApiKey ?? config.apiKey,
      baseUrl: config.visionBaseUrl ?? config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });

    this.logger.info(
      {
        provider,
        visionModel: config.visionModel,
      },
      '视觉识别服务初始化完成',
    );
  }

  /** 视觉服务是否可用（已配置视觉模型） */
  get isReady(): boolean {
    return this.adapter !== undefined;
  }

  /**
   * 结构化图片识别：要求视觉模型按 schema 输出结构化结果。
   * @param messages 含 image_url content 块的消息
   * @param schema 输出的 Zod schema
   */
  async structuredInvoke<T extends z.ZodSchema>(
    messages: BaseMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    if (!this.adapter) {
      throw new Error('视觉识别服务未配置，无法识别图片');
    }

    return this.adapter.structuredInvoke(messages, schema);
  }

  /** 普通图片调用（返回原始文本/内容） */
  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    if (!this.adapter) {
      throw new Error('视觉识别服务未配置，无法识别图片');
    }
    return this.adapter.invoke(messages);
  }

  /** 流式图片调用 */
  stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>> {
    if (!this.adapter) {
      throw new Error('视觉识别服务未配置，无法识别图片');
    }
    return this.adapter.stream(messages);
  }

  // -- 私有 -- //

  private createAdapter(
    config: Omit<ProviderConfig, 'model'> & {
      provider: AdapterProvider;
      model?: string;
    },
  ): IAiAdapter {
    const Adapter = adapterRegistry[config.provider];
    if (!Adapter) {
      throw new Error(
        `不支持的 AI 厂商: ${config.provider}。` +
          `当前支持: ${Object.keys(adapterRegistry).join(', ')}`,
      );
    }
    return new Adapter({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model ?? '',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
  }
}
