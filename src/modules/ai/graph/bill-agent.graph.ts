import { Annotation, END, StateGraph } from '@langchain/langgraph';
import type { PinoLogger } from 'nestjs-pino';
import type { AiService } from '../../../infra/ai/ai.service';
import type { DbService } from '../../../infra/db/db.service';
import type { FamilyService } from '../../family/family.service';
import type { GraphState } from './state';
import { createInputProcessor } from './nodes/input-processor.node';
import { createIntentClassifier } from './nodes/intent-classifier.node';
import { createExtractor } from './nodes/extractor.node';
import { createConfidenceScorer } from './nodes/confidence-scorer.node';
import { createMixedHandler } from './nodes/mixed-handler.node';
import { createQueryHandler } from './nodes/query-handler.node';
import { createChatHandler } from './nodes/chat-handler.node';

/** LangGraph Annotation 定义 */
const GraphAnnotation = Annotation.Root({
  userId: Annotation<string>,
  messages: Annotation<any[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  content: Annotation<string>,
  conversationId: Annotation<string>(),
  intent: Annotation<'bookkeeping' | 'query' | 'chat'>(),
  intentConfidence: Annotation<number>(),
  extractedBills: Annotation<GraphState['extractedBills']>(),
  billEvaluations: Annotation<GraphState['billEvaluations']>(),
  confidence: Annotation<number>(),
  status: Annotation<
    'auto_created' | 'pending_confirm' | 'mixed' | 'replied' | 'error'
  >(),
  reply: Annotation<string>(),
  sessionId: Annotation<string>(),
  createdBill: Annotation<Record<string, unknown>>(),
  createdBills: Annotation<Record<string, unknown>[]>(),
  confirmationCards: Annotation<GraphState['confirmationCards']>(),
  error: Annotation<string>(),
});

export type BillAgentGraph = ReturnType<typeof compileGraph>;

export interface GraphDeps {
  aiService: AiService;
  db: DbService;
  familyService: FamilyService;
  logger: PinoLogger;
}

/**
 * 编译账单 AI Agent 图
 *
 * 流程：
 *  START → inputProcessor
 *    ├─ 有效 → intentClassifier
 *    │     ├─ bookkeeping → extractor → confidenceScorer → mixedHandler → END
 *    │     │      逐笔判断：高置信度自动入库，低置信度生成确认卡片
 *    │     ├─ query → queryHandler → END
 *    │     ├─ chat  → chatHandler  → END
 *    │     └─ error → END
 *    └─ 空输入/extractor失败 → END
 */
export function compileGraph(deps: GraphDeps) {
  const { aiService, db, familyService, logger } = deps;

  const workflow = new StateGraph(GraphAnnotation)
    .addNode('inputProcessor', createInputProcessor(logger))
    .addNode('intentClassifier', createIntentClassifier(aiService, logger))
    .addNode('extractor', createExtractor(db, aiService, logger))
    .addNode('confidenceScorer', createConfidenceScorer(logger))
    .addNode('mixedHandler', createMixedHandler(db, familyService, logger))
    .addNode('queryHandler', createQueryHandler(db, familyService, logger))
    .addNode('chatHandler', createChatHandler(aiService, logger))

    // 入口
    .addEdge('__start__', 'inputProcessor')

    // 输入预处理：有效→意图识别，空输入→终止
    .addConditionalEdges('inputProcessor', afterInputProcess, {
      ok: 'intentClassifier',
      error: END,
    })

    // 意图路由（含错误终止）
    .addConditionalEdges('intentClassifier', afterIntentClassify, {
      bookkeeping: 'extractor',
      query: 'queryHandler',
      chat: 'chatHandler',
      error: END,
    })

    // 提取：成功→评分，失败→终止
    .addConditionalEdges('extractor', afterExtract, {
      ok: 'confidenceScorer',
      error: END,
    })

    // 评分后统一进入混合处理节点：逐笔判断自动入库或确认
    .addEdge('confidenceScorer', 'mixedHandler')

    // 终端节点 → END
    .addEdge('mixedHandler', '__end__')
    .addEdge('queryHandler', '__end__')
    .addEdge('chatHandler', '__end__');

  return workflow.compile();
}

/** 输入预处理路由：空内容 → 直接返回提示，不浪费 LLM 调用 */
function afterInputProcess(state: GraphState): string {
  return state.error ? 'error' : 'ok';
}

/** 意图路由：若节点出错则终止，否则按 intent 分发 */
function afterIntentClassify(state: GraphState): string {
  if (state.error) return 'error';
  return state.intent ?? 'chat';
}

/** 提取路由：节点失败或未提取到任何账单时终止 */
function afterExtract(state: GraphState): string {
  if (state.error) return 'error';
  return state.extractedBills && state.extractedBills.length > 0
    ? 'ok'
    : 'error';
}
