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
};

/**
 * AI 调用服务 —— 统一入口，屏蔽厂商 API 差异。
 *
 * ## 使用示例
 *
 * ```ts
 * // 普通调用（跟随环境变量配置的厂商）
 * const reply = await aiService.invoke([new HumanMessage('你好')]);
 *
 * // 流式调用
 * for await (const chunk of await aiService.stream(messages)) { ... }
 *
 * // 结构化提取
 * const bill = await aiService.structuredInvoke(messages, BillSchema);
 *
 * // 动态切换厂商（A/B 测试、不同任务用不同模型）
 * const adapter = aiService.createAdapter({ provider: 'anthropic', ... });
 * ```
 */
@Injectable()
export class AiService {
  private readonly defaultAdapter: IAiAdapter;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(aiConfig.KEY)
    config: AiConfig,
  ) {
    this.logger.setContext('AiService');
    this.defaultAdapter = this.createAdapter({
      provider: mapProvider(config.provider),
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });

    this.logger.info(
      { provider: config.provider, model: config.model },
      'AI 服务初始化完成',
    );
  }

  // -- 工厂 -- //

  /**
   * 按配置创建适配器实例。
   */
  createAdapter(
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

  // -- 委托调用（使用默认适配器） -- //

  /** 普通调用 */
  invoke(messages: BaseMessage[]): Promise<AIMessage> {
    return this.defaultAdapter.invoke(messages);
  }

  /** 流式调用 */
  stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>> {
    return this.defaultAdapter.stream(messages);
  }

  /** 结构化输出（Zod schema → 类型安全的解析结果） */
  structuredInvoke<T extends z.ZodSchema>(
    messages: BaseMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    return this.defaultAdapter.structuredInvoke(messages, schema);
  }
}
