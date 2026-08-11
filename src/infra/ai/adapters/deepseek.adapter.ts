import { ChatOpenAI } from '@langchain/openai';
import type {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import type { z } from 'zod';

import type { AdapterProvider, IAiAdapter, ProviderConfig } from '../types';

/**
 * DeepSeek 适配器
 *
 * DeepSeek 完全兼容 OpenAI API，图片通过标准 content 数组传递
 * （image_url 块），统一走 ChatOpenAI.withStructuredOutput（function calling）。
 */
export class DeepSeekAdapter implements IAiAdapter {
  public readonly provider: AdapterProvider = 'deepseek';

  private readonly client: ChatOpenAI;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    const baseUrl = (config.baseUrl ?? '').replace(/\/+$/, '');

    this.client = new ChatOpenAI({
      model: config.model,
      apiKey: config.apiKey,
      configuration: { baseURL: baseUrl },
      temperature: config.temperature ?? 1,
      maxTokens: config.maxTokens ?? 4096,
      modelKwargs: { thinking: { type: 'disabled' } },
    });
  }

  public readonly model: string;

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    return this.client.invoke(messages);
  }

  stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>> {
    return this.client.stream(messages) as any;
  }

  async structuredInvoke<T extends z.ZodSchema>(
    messages: BaseMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    // 显式指定 functionCalling 模式，兼容图片与文本统一走结构化输出。
    const runnable = this.client.withStructuredOutput(schema, {
      name: 'extract',
      method: 'functionCalling',
    });

    return runnable.invoke(messages);
  }
}
