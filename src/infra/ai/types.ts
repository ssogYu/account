import type {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import type { z } from 'zod';

// ---- 厂商枚举 ----

/** 适配器内部使用的厂商标识 */
export type AdapterProvider = 'openai' | 'anthropic';

/** ai.config.ts 中 AI_PROVIDER 环境变量的合法值 */
export type ConfigProvider = 'openai-compatible' | 'anthropic' | 'deepseek';

/** 将配置中的 provider 值映射为适配器类型 */
export function mapProvider(raw: ConfigProvider): AdapterProvider {
  return raw === 'anthropic' ? 'anthropic' : 'openai';
}

// ---- 配置接口 ----

/** 单个厂商的连接配置 */
export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/** ai.config.ts 中导出的配置 shape */
export interface AiConfig {
  provider: ConfigProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
}

// ---- 适配器接口 ----

/** 每个厂商适配器需要实现的统一接口 */
export interface IAiAdapter {
  /** 当前适配器对应的厂商 */
  readonly provider: AdapterProvider;

  /** 当前使用的模型名 */
  readonly model: string;

  /**
   * 一次性调用，返回完整消息
   * @param messages 对话消息列表
   */
  invoke(messages: BaseMessage[]): Promise<AIMessage>;

  /**
   * 流式调用，返回异步可迭代流
   * @param messages 对话消息列表
   */
  stream(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>>;

  /**
   * 结构化输出：要求 AI 按照 Zod schema 返回数据
   * @param messages 对话消息列表
   * @param schema 输出的 Zod schema
   * @returns schema 推导类型的实例
   */
  structuredInvoke<T extends z.ZodSchema>(
    messages: BaseMessage[],
    schema: T,
  ): Promise<z.infer<T>>;
}
