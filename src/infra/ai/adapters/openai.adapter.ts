import { ChatOpenAI } from '@langchain/openai';
import type {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import type { z } from 'zod';

import type { AdapterProvider, IAiAdapter, ProviderConfig } from '../types';

/**
 * OpenAI 兼容适配器
 *
 * 适用于所有兼容 OpenAI API 的厂商（OpenAI 官方、DeepSeek、Qwen、Kimi 等）。
 * 只需传入不同的 baseUrl 和 apiKey 即可切换。
 */
export class OpenAiAdapter implements IAiAdapter {
  public readonly provider: AdapterProvider = 'openai';

  /** 底层 ChatOpenAI 实例 */
  private readonly client: ChatOpenAI;

  constructor(config: ProviderConfig) {
    this.model = config.model;

    this.client = new ChatOpenAI({
      model: config.model,
      apiKey: config.apiKey,
      configuration: { baseURL: config.baseUrl },
      temperature: config.temperature ?? 1,
      maxTokens: config.maxTokens ?? 4096,
      // DeepSeek 需要关闭 thinking 模式，否则会输出 reasoning_content，
      // 破坏 LangChain 对 function calling 返回值的解析
      modelKwargs: { thinking: { type: 'disabled' } },
    });
  }

  public readonly model: string;

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    return await this.client.invoke(messages);
  }

  async stream(
    messages: BaseMessage[],
  ): Promise<AsyncIterable<AIMessageChunk>> {
    return await this.client.stream(messages);
  }

  async structuredInvoke<T extends z.ZodSchema>(
    messages: BaseMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    // 显式指定 functionCalling 模式。
    // 不指定 method 时，LangChain 可能根据模型名自动选 jsonSchema/jsonMode，
    // 但 DeepSeek 不支持 response_format，只能用 function calling。
    const runnable = this.client.withStructuredOutput(schema, {
      name: 'extract',
      method: 'functionCalling',
    });

    return await runnable.invoke(messages);
  }
}
