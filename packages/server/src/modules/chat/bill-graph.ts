import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

// ── 图状态定义 ──

/** 记账图的状态 */
export const BillState = Annotation.Root({
  /** 用户原始输入 */
  input: Annotation<string>,
  /** 用户ID */
  userId: Annotation<string>,
  /** 可用分类列表（JSON字符串） */
  categoriesJson: Annotation<string>,

  // ── 语义解析结果 ──
  /** 解析是否成功 */
  parsed: Annotation<boolean>,
  /** 收支类型 */
  type: Annotation<'expense' | 'income' | null>,
  /** 金额 */
  amount: Annotation<number | null>,
  /** 备注 */
  note: Annotation<string>,
  /** 日期（YYYY-MM-DD） */
  date: Annotation<string>,
  /** 分类名 */
  categoryName: Annotation<string>,

  // ── 置信度评估 ──
  confidence: Annotation<'high' | 'medium' | 'low'>,
  /** 异常提示 */
  warning: Annotation<string>,

  // ── 最终输出 ──
  /** 是否需要用户确认 */
  needsConfirm: Annotation<boolean>,
  /** 解析错误信息 */
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

可用分类：
${state.categoriesJson}

当前日期：${today}`;

  try {
    const structuredModel = chatModel.withStructuredOutput(ParseOutputSchema);
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
    return {
      categoryName: '其他',
      confidence: 'medium',
    };
  }

  // 校验 LLM 返回的分类名是否真实存在于可用分类中
  const matched = findCategoryInList(state.categoryName, state.categoriesJson);

  if (!matched) {
    // LLM 幻觉了自创分类，回退到"其他"并降低置信度
    return {
      categoryName: '其他',
      confidence: 'medium',
    };
  }

  // 分类名大小写可能不一致，用数据库中的标准名称替换
  return { categoryName: matched.name };
}

/** Step 3: 置信度评估 — 决定是否需要用户确认 */
function evaluateAndReply(state: BillStateType): Partial<BillStateType> {
  if (!state.parsed) {
    return { needsConfirm: false };
  }

  // 有异常提示 或 置信度非 high 时需要用户确认
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
 * 流程：用户输入 → LLM语义解析 → 分类匹配 → 置信度评估+回复生成
 */
export function createBillGraph(chatModel: BaseChatModel) {
  // 创建状态图，所有节点共享 BillState 中定义的状态字段
  const workflow = new StateGraph(BillState)
    // 注册三个处理节点：
    // 1. semanticParse — 调用 LLM 从用户输入中提取结构化记账数据（金额、分类、日期等）
    // 2. matchCategory  — 校验 LLM 返回的分类名是否在可用列表中，防止幻觉自创分类
    // 3. evaluateAndReply — 根据置信度决定是否需要用户确认
    .addNode('semanticParse', (state) => semanticParse(state, chatModel))
    .addNode('matchCategory', matchCategory)
    .addNode('evaluateAndReply', evaluateAndReply)

    // 定义执行路径：
    // 入口 → semanticParse（所有请求先经过 LLM 解析）
    .addEdge(START, 'semanticParse')
    // semanticParse 之后根据解析结果走不同路径：
    //   - 解析成功(parsed=true) → matchCategory（先校验分类再评估）
    //   - 解析失败(parsed=false) → evaluateAndReply（直接结束）
    .addConditionalEdges('semanticParse', routeAfterParse)
    // matchCategory → evaluateAndReply（分类校验完成后评估置信度）
    .addEdge('matchCategory', 'evaluateAndReply')
    // evaluateAndReply → 结束（评估完毕，流程结束）
    .addEdge('evaluateAndReply', END);

  // compile() 将图定义编译为可执行的 Runnable，调用时传入初始状态即可运行
  return workflow.compile();
}
