import { ChatOpenAI } from '@langchain/openai';
import type {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import type { z } from 'zod';

import type { AdapterProvider, IAiAdapter, ProviderConfig } from '../types';

/**
 * Qwen（通义千问）适配器
 *
 * 基于 LangChain ChatOpenAI，接入阿里云百炼 DashScope 的 OpenAI 兼容接口。
 * Qwen 支持标准 content 数组多模态（image_url 块），因此文本与图片
 * 统一走 ChatOpenAI.withStructuredOutput（function calling）。
 *
 * 注意：部分 Qwen 模型（如专用 OCR 模型 qwen3.5-ocr）可能不支持
 * function calling，此时 withStructuredOutput 会失败，自动 fallback
 * 到普通调用 + 手动 JSON 解析。
 */
export class QwenAdapter implements IAiAdapter {
  public readonly provider: AdapterProvider = 'qwen';

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
    // 优先使用 function calling 结构化输出。
    // Qwen 等模型可能不支持 withStructuredOutput，尝试后 fallback 到手动解析。
    try {
      const runnable = this.client.withStructuredOutput(schema, {
        name: 'extract',
        method: 'functionCalling',
      });
      return await runnable.invoke(messages);
    } catch {
      // withStructuredOutput 失败，fallback 到普通调用 + 手动 JSON 解析
      const response = await this.client.invoke(messages);
      const text = response.content as string;
      return schema.parse(parseJsonFromText(text)) as z.infer<T>;
    }
  }
}

/**
 * 从响应文本中提取 JSON（兼容 markdown 代码块包裹）。
 * 无法提取时抛出明确错误，便于上层定位。
 */
function parseJsonFromText(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI 未返回有效 JSON，结构化输出解析失败');
  }
  return JSON.parse(match[0]);
}
