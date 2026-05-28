import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

// ── 图状态定义 ──

/** 记账图的状态 */
export const BillState = Annotation.Root({
  input: Annotation<string>,
  userId: Annotation<string>,
  categoriesJson: Annotation<string>,
  accountsJson: Annotation<string>,

  parsed: Annotation<boolean>,
  type: Annotation<'expense' | 'income' | null>,
  amount: Annotation<number | null>,
  note: Annotation<string>,
  date: Annotation<string>,
  categoryName: Annotation<string>,
  categoryId: Annotation<string>,
  categoryIcon: Annotation<string>,
  accountName: Annotation<string>,
  accountId: Annotation<string>,

  confidence: Annotation<'high' | 'medium' | 'low'>,
  warning: Annotation<string>,

  needsConfirm: Annotation<boolean>,
  error: Annotation<string>,
});

export type BillStateType = typeof BillState.State;

// ── LLM 输出 Schema ──

const ParseOutputSchema = z.object({
  parsed: z.boolean().describe('是否成功解析为记账意图'),
  type: z.enum(['expense', 'income']).nullable().describe('收支类型'),
  amount: z.number().nullable().describe('金额'),
  note: z.string().describe('备注/描述'),
  date: z.string().describe('日期，格式 YYYY-MM-DD'),
  categoryName: z.string().describe('分类名称，必须从可用分类中选择'),
  accountName: z
    .string()
    .describe('账户名称，如微信/支付宝/现金，未提及则为空字符串'),
  confidence: z.enum(['high', 'medium', 'low']).describe('解析置信度'),
  warning: z.string().describe('异常提示，无异常则为空字符串'),
});

// ── 辅助函数 ──

/** 从 categoriesJson 中查找匹配的分类，返回 null 表示未匹配 */
function findCategoryInList(
  categoryName: string,
  categoriesJson: string,
): { name: string; type: string; icon: string; id: string } | null {
  try {
    const categories = JSON.parse(categoriesJson) as Array<{
      name: string;
      type: string;
      icon: string;
      id: string;
    }>;
    return (
      categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      ) ?? null
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return null;
  }
}

function findAccountInList(
  accountName: string,
  accountsJson: string,
): { name: string; id: string } | null {
  try {
    const accounts = JSON.parse(accountsJson) as Array<{
      name: string;
      id: string;
    }>;
    return (
      accounts.find(
        (a) => a.name.toLowerCase() === accountName.toLowerCase(),
      ) ?? null
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return null;
  }
}

// ── 节点函数 ──

/** Step 1: LLM 语义解析 */
async function semanticParse(
  state: BillStateType,
  chatModel: BaseChatModel,
): Promise<Partial<BillStateType>> {
  if (!chatModel) {
    return { parsed: false, error: 'LLM 模型未配置' };
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const systemPrompt = `你是一个智能记账助手。用户会告诉你消费信息，你需要从中提取结构化数据。

规则：
1. 如果用户输入不包含记账意图（如闲聊、提问等），设置 parsed=false
2. 金额必须为正数
3. 分类名必须从下面的可用分类中选择，不要自创分类
4. 日期格式为 YYYY-MM-DD，"今天"用${today}，"昨天"用${yesterday}
5. 如果金额看起来异常（如午饭500），在warning中提醒
6. confidence: high=金额+分类都明确, medium=金额明确但分类不确定, low=信息不完整
7. 账户名必须从下面的可用账户中选择，用户未提及账户时accountName设为空字符串

可用分类：
${state.categoriesJson}

可用账户：
${state.accountsJson}

当前日期：${today}`;

  try {
    // withStructuredOutput 是 LangChain 的"结构化输出"能力：
    // 它将 Zod Schema（ParseOutputSchema）转换为 LLM 的 function/tool calling 参数，
    // 让 LLM 的输出不再是自由文本，而是严格符合 Schema 定义的 JSON 对象。
    // 底层原理：根据 Schema 自动生成 JSON Schema → 作为 tool 传给 LLM → LLM 调用该 tool → 解析返回值
    const structuredModel = chatModel.withStructuredOutput(ParseOutputSchema);
    // invoke 发送消息给 LLM 并获取结构化结果：
    // - SystemMessage: 系统提示词，定义 LLM 的角色和行为规则
    // - HumanMessage: 用户输入（如"午饭花了25"）
    // LLM 返回的 result 类型由 ParseOutputSchema 决定，TypeScript 可自动推断
    const result = await structuredModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.input),
    ]);

    if (!result.parsed) {
      return {
        parsed: false,
        needsConfirm: false,
        error: '',
      };
    }

    return {
      parsed: true,
      type: result.type,
      amount: result.amount,
      note: result.note || state.input,
      date: result.date || today,
      categoryName: result.categoryName,
      accountName: result.accountName || '',
      confidence: result.confidence,
      warning: result.warning || '',
      error: '',
    };
  } catch (err) {
    return {
      parsed: false,
      error: `解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      needsConfirm: false,
    };
  }
}

/** Step 2: 分类匹配校验 — 验证 LLM 返回的分类名是否在可用列表中 */
function matchCategory(state: BillStateType): Partial<BillStateType> {
  if (!state.categoryName) {
    const fallback = findCategoryInList('其他', state.categoriesJson);
    return {
      categoryName: '其他',
      categoryId: fallback?.id ?? '',
      categoryIcon: fallback?.icon ?? '',
      confidence: 'medium',
    };
  }

  const matched = findCategoryInList(state.categoryName, state.categoriesJson);

  if (!matched) {
    const fallback = findCategoryInList('其他', state.categoriesJson);
    return {
      categoryName: '其他',
      categoryId: fallback?.id ?? '',
      categoryIcon: fallback?.icon ?? '',
      confidence: 'medium',
    };
  }

  return {
    categoryName: matched.name,
    categoryId: matched.id,
    categoryIcon: matched.icon,
  };
}

function matchAccount(state: BillStateType): Partial<BillStateType> {
  if (!state.accountName) {
    return {
      accountName: '',
      accountId: '',
      confidence: 'medium',
    };
  }

  const matched = findAccountInList(state.accountName, state.accountsJson);

  if (!matched) {
    return {
      accountName: '',
      accountId: '',
      confidence: 'medium',
    };
  }

  return {
    accountName: matched.name,
    accountId: matched.id,
  };
}

/** Step 3: 置信度评估 — 决定是否需要用户确认 */
function evaluateAndReply(state: BillStateType): Partial<BillStateType> {
  if (!state.parsed) {
    return { needsConfirm: false };
  }

  const needsConfirm = state.confidence !== 'high' || !!state.warning;

  return { needsConfirm };
}

// ── 条件边 ──

/** 决定解析后走哪条路径 */
function routeAfterParse(
  state: BillStateType,
): 'matchCategory' | 'evaluateAndReply' {
  if (!state.parsed) return 'evaluateAndReply';
  return 'matchCategory';
}

// ── 构建图 ──

/**
 * 创建记账 LangGraph 编排图
 *
 * 流程：用户输入 → LLM语义解析 → 分类匹配 → 账户匹配 → 置信度评估+回复生成
 */
export function createBillGraph(chatModel: BaseChatModel) {
  const workflow = new StateGraph(BillState)
    .addNode('semanticParse', (state) => semanticParse(state, chatModel))
    .addNode('matchCategory', matchCategory)
    .addNode('matchAccount', matchAccount)
    .addNode('evaluateAndReply', evaluateAndReply)

    .addEdge(START, 'semanticParse')
    .addConditionalEdges('semanticParse', routeAfterParse)
    .addEdge('matchCategory', 'matchAccount')
    .addEdge('matchAccount', 'evaluateAndReply')
    .addEdge('evaluateAndReply', END);

  return workflow.compile();
}
