import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

export interface BillItem {
  type: 'expense' | 'income' | null;
  amount: number | null;
  note: string;
  date: string;
  categoryName: string;
  categoryId: string;
  categoryIcon: string;
  accountName: string;
  accountId: string;
  confidence: 'high' | 'medium' | 'low';
  warning: string;
}

export const BillState = Annotation.Root({
  input: Annotation<string>,
  userId: Annotation<string>,
  categoriesJson: Annotation<string>,
  accountsJson: Annotation<string>,

  parsed: Annotation<boolean>,
  bills: Annotation<BillItem[]>,
  needsConfirm: Annotation<boolean>,
  error: Annotation<string>,
});

export type BillStateType = typeof BillState.State;

const SingleBillSchema = z.object({
  type: z.enum(['expense', 'income']).describe('收支类型'),
  amount: z.number().describe('金额，必须为正数'),
  note: z.string().describe('备注/描述'),
  date: z.string().describe('日期，格式 YYYY-MM-DD'),
  categoryName: z.string().describe('分类名称，必须从可用分类中选择'),
  accountName: z
    .string()
    .describe('账户名称，如微信/支付宝/现金，未提及则为空字符串'),
  confidence: z.enum(['high', 'medium', 'low']).describe('解析置信度'),
  warning: z.string().describe('异常提示，无异常则为空字符串'),
});

const ParseOutputSchema = z.object({
  parsed: z.boolean().describe('是否成功解析为记账意图'),
  bills: z
    .array(SingleBillSchema)
    .describe(
      '解析出的账单列表，单笔消费返回1项，多笔消费返回多项。如"午饭25和打车15"应返回2项',
    ),
});

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

function getFallbackNote(input: string): string {
  const merchantMatch = input.match(/"merchant"\s*:\s*"([^"]+)"/);
  if (merchantMatch?.[1]) {
    return merchantMatch[1];
  }

  const ocrTextMatch = input.match(/OCR 全文：\n([\s\S]+)/);
  if (ocrTextMatch?.[1]) {
    const firstMeaningfulLine = ocrTextMatch[1]
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);
    if (firstMeaningfulLine) {
      return firstMeaningfulLine;
    }
  }

  return input;
}

async function semanticParse(
  state: BillStateType,
  chatModel: BaseChatModel,
): Promise<Partial<BillStateType>> {
  if (!chatModel) {
    return { parsed: false, error: 'LLM 模型未配置' };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  const systemPrompt = `你是一个智能记账助手。输入可能来自用户直接输入，也可能来自账单图片 OCR 抽文，你需要从中提取结构化记账数据。

规则：
1. 如果用户输入不包含记账意图（如闲聊、提问等），设置 parsed=false，bills 为空数组
2. 分类名必须从下面的可用分类中选择，不要自创分类
3. 日期格式为 YYYY-MM-DD，"今天"用${today}，"昨天"用${yesterday}
4. 如果金额看起来异常（如午饭500），在warning中提醒
5. confidence: high=金额+分类都明确, medium=金额明确但分类不确定, low=信息不完整
6. 账户名必须从下面的可用账户中选择，仅支出类型需要账户，收入类型accountName设为空字符串
7. 用户可能一次输入多笔消费（如"午饭25，打车15，奶茶8"），必须将每笔消费拆分为 bills 数组中的独立项
8. 如果用户只输入了一笔消费，bills 数组中只有一项
9. 账单名称note不能直接使用用户输入，比如“买了奶茶”不能直接设置“买了奶茶”，而要提取“奶茶”，比如我今天在淘宝买了衣服，要提取“衣服”
10. 如果输入中包含“OCR 全文”“OCR 初步字段”等段落，应将其视为图片提取结果，优先依据明确的金额、日期、商户、支付方式进行判断
11. OCR 文本可能包含噪音、重复行或无关字段，你需要忽略噪音，只提取最可信的账单信息

可用分类：
${state.categoriesJson}

可用账户：
${state.accountsJson}

当前日期：${today}`;

  try {
    const structuredModel = chatModel.withStructuredOutput(ParseOutputSchema);
    const result = await structuredModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.input),
    ]);

    if (!result.parsed || result.bills.length === 0) {
      return {
        parsed: false,
        bills: [],
        needsConfirm: false,
        error: '',
      };
    }

    const bills: BillItem[] = result.bills.map((b) => ({
      type: b.type,
      amount: b.amount,
      note: b.note || getFallbackNote(state.input),
      date: b.date || today,
      categoryName: b.categoryName,
      accountName: b.accountName || '',
      categoryId: '',
      categoryIcon: '',
      accountId: '',
      confidence: b.confidence,
      warning: b.warning || '',
    }));

    return {
      parsed: true,
      bills,
      error: '',
    };
  } catch (err) {
    return {
      parsed: false,
      bills: [],
      error: `解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      needsConfirm: false,
    };
  }
}

function matchCategoryAndAccount(state: BillStateType): Partial<BillStateType> {
  const updatedBills: BillItem[] = state.bills.map((bill) => {
    let categoryName = bill.categoryName;
    let categoryId = '';
    let categoryIcon = '';
    let confidence = bill.confidence;

    if (!bill.categoryName) {
      const fallback = findCategoryInList('其他', state.categoriesJson);
      categoryName = '其他';
      categoryId = fallback?.id ?? '';
      categoryIcon = fallback?.icon ?? '';
      confidence = 'medium';
    } else {
      const matched = findCategoryInList(
        bill.categoryName,
        state.categoriesJson,
      );
      if (!matched) {
        const fallback = findCategoryInList('其他', state.categoriesJson);
        categoryName = '其他';
        categoryId = fallback?.id ?? '';
        categoryIcon = fallback?.icon ?? '';
        confidence = 'medium';
      } else {
        categoryName = matched.name;
        categoryId = matched.id;
        categoryIcon = matched.icon;
      }
    }

    let accountName = bill.accountName;
    let accountId = '';
    if (bill.accountName) {
      const matched = findAccountInList(bill.accountName, state.accountsJson);
      if (matched) {
        accountName = matched.name;
        accountId = matched.id;
      } else {
        accountName = '';
        accountId = '';
        confidence = 'medium';
      }
    }

    return {
      ...bill,
      categoryName,
      categoryId,
      categoryIcon,
      accountName,
      accountId,
      confidence,
    };
  });

  return { bills: updatedBills };
}

function evaluateAndReply(state: BillStateType): Partial<BillStateType> {
  if (!state.parsed || state.bills.length === 0) {
    return { needsConfirm: false };
  }

  const needsConfirm = state.bills.some(
    (b) =>
      b.confidence !== 'high' ||
      !!b.warning ||
      !b.amount ||
      !b.categoryId ||
      (b.type === 'expense' && !b.accountName),
  );

  return { needsConfirm };
}

function routeAfterParse(
  state: BillStateType,
): 'matchCategoryAndAccount' | 'evaluateAndReply' {
  if (!state.parsed || state.bills.length === 0) return 'evaluateAndReply';
  return 'matchCategoryAndAccount';
}

export function createBillGraph(chatModel: BaseChatModel) {
  const workflow = new StateGraph(BillState)
    .addNode('semanticParse', (state) => semanticParse(state, chatModel))
    .addNode('matchCategoryAndAccount', matchCategoryAndAccount)
    .addNode('evaluateAndReply', evaluateAndReply)

    .addEdge(START, 'semanticParse')
    .addConditionalEdges('semanticParse', routeAfterParse)
    .addEdge('matchCategoryAndAccount', 'evaluateAndReply')
    .addEdge('evaluateAndReply', END);

  return workflow.compile();
}
