import { ChatAnthropic } from '@langchain/anthropic';
import type {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import type { z } from 'zod';

import type { AdapterProvider, IAiAdapter, ProviderConfig } from '../types';

/**
 * Anthropic 适配器
 *
 * 适用于 Claude 系列模型。
 */
export class AnthropicAdapter implements IAiAdapter {
  public readonly provider: AdapterProvider = 'anthropic';

  /** 底层 ChatAnthropic 实例 */
  private readonly client: ChatAnthropic;

  constructor(config: ProviderConfig) {
    this.model = config.model;

    this.client = new ChatAnthropic({
      model: config.model,
      apiKey: config.apiKey,
      anthropicApiUrl: config.baseUrl.length > 0 ? config.baseUrl : undefined,
      temperature: config.temperature ?? 1,
      maxTokens: config.maxTokens ?? 4096,
    });
  }

  public readonly model: string;

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    return await this.client.invoke(messages);
  }

  stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>> {
    return this.client.stream(messages);
  }

  async structuredInvoke<T extends z.ZodSchema>(
    messages: BaseMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    const runnable = this.client.withStructuredOutput(schema, {
      name: 'extract',
    });

    return await runnable.invoke(messages);
  }
}
