# AI 智能记账功能实现文档

## 概述

本文档详细说明 AI 智能记账功能的完整实现流程，包括 LLM 统一适配层、LangGraph 编排、对话式记账交互和前端界面设计。

---

## 1. 架构总览

```
用户输入 → [Mobile 对话界面] → [Server ChatController]
                                    ↓
                              [ChatService]
                                    ↓
                              [LangGraph 编排图]
                              ┌─────────────────────────────┐
                              │ semanticParse → matchCategory │
                              │       → evaluateAndReply     │
                              └─────────────────────────────┘
                                    ↓
                              [LlmService 统一适配]
                              ┌─────────────────────────────┐
                              │ OpenAI │ Gemini │ Ollama      │
                              └─────────────────────────────┘
                                    ↓
                        ┌── needsConfirm=false ──→ 直接创建账单入库
                        │                        → 返回 confirmed + billId
                        │
                        └── needsConfirm=true ──→ 确认卡片 → 用户确认 → 创建账单入库
```

---

## 2. Server 端实现

### 2.1 LLM 统一适配模块

**文件**: `packages/server/src/modules/llm/`

#### 设计原则

- **统一接口**: 所有模型厂商通过 `BaseChatModel` 统一抽象，上层代码无需关心具体实现
- **配置驱动**: 通过环境变量 `LLM_PROVIDER` 切换模型，无需修改代码
- **Ollama 兼容**: 利用 OpenAI 兼容 API，直接使用 `ChatOpenAI` 指向 Ollama 端点

#### 核心代码

```typescript
// llm.service.ts
@Injectable()
export class LlmService {
  private readonly chatModel: BaseChatModel;
  private readonly config: ConfigType<typeof llmConfig>;

  constructor(
    @Inject(llmConfig.KEY)
    config: ConfigType<typeof llmConfig>,
  ) {
    this.config = config;
    this.chatModel = this.createChatModel();
  }

  getModel(): BaseChatModel {
    return this.chatModel;
  }

  getProvider(): string {
    return this.config.provider;
  }

  private createChatModel(): BaseChatModel {
    switch (this.config.provider) {
      case 'gemini':
        return new ChatGoogleGenerativeAI({
          apiKey: this.config.gemini.apiKey,
          model: this.config.gemini.model,
          temperature: this.config.gemini.temperature,
          maxOutputTokens: this.config.gemini.maxTokens,
        });
      case 'ollama':
        return new ChatOpenAI({
          modelName: this.config.ollama.model,
          temperature: this.config.ollama.temperature,
          configuration: { baseURL: `${this.config.ollama.baseUrl}/v1` },
        });
      case 'openai':
      default:
        return new ChatOpenAI({
          openAIApiKey: this.config.openai.apiKey,
          modelName: this.config.openai.model,
          temperature: this.config.openai.temperature,
          maxTokens: this.config.openai.maxTokens,
          configuration: this.config.openai.baseUrl
            ? { baseURL: this.config.openai.baseUrl }
            : undefined,
        });
    }
  }
}
```

> **配置注入方式**: 使用 `@Inject(llmConfig.KEY)` + `ConfigType<typeof llmConfig>` 注入，与项目其他模块（如 MinioService）保持一致。相比直接使用 `ConfigService.get('llm.xxx')`，类型安全且无需非空断言。

#### 支持的模型厂商

| 厂商          | 配置键     | 模型示例         | 说明                            |
| ------------- | ---------- | ---------------- | ------------------------------- |
| OpenAI        | `openai`   | gpt-4o-mini      | 支持 OpenAI 兼容 API            |
| Google Gemini | `gemini`   | gemini-2.0-flash | 使用 @langchain/google-genai    |
| DeepSeek      | `deepseek` | deepseek-chat    | 使用 @langchain/deepseek 官方包 |
| Ollama        | `ollama`   | qwen2.5:7b       | 本地部署，通过 OpenAI 兼容 API  |

> **DeepSeek 注意事项**: 使用 `@langchain/deepseek` 官方包的 `ChatDeepSeek` 类（非 `ChatOpenAI + baseURL` 兼容方案）。DeepSeek V4 默认启用思考模式（thinking mode），与 `tool_choice` 参数不兼容，需在构造函数中添加 `modelKwargs: { thinking: { type: 'disabled' } }` 显式禁用思考模式。

#### 环境变量配置

```env
# LLM 提供商选择
LLM_PROVIDER=openai

# OpenAI 配置
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=          # 可选，用于代理或兼容 API
OPENAI_TEMPERATURE=0
OPENAI_MAX_TOKENS=1024

# Gemini 配置
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TEMPERATURE=0
GEMINI_MAX_TOKENS=1024

# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_TEMPERATURE=0

# DeepSeek 配置
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=          # 可选，默认 https://api.deepseek.com
DEEPSEEK_TEMPERATURE=0
```

---

### 2.2 LangGraph 记账编排图

**文件**: `packages/server/src/modules/chat/bill-graph.ts`

#### 图状态定义

```typescript
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
  input: Annotation<string>, // 用户原始输入
  userId: Annotation<string>, // 用户ID
  categoriesJson: Annotation<string>, // 可用分类列表
  accountsJson: Annotation<string>, // 可用账户列表
  parsed: Annotation<boolean>, // 解析是否成功
  bills: Annotation<BillItem[]>, // 解析出的账单列表（支持多笔消费）
  needsConfirm: Annotation<boolean>, // 是否需要确认
  error: Annotation<string>, // 错误信息
});
```

> **设计说明**: 从单消费字段（type/amount/note等）迁移为 `bills: BillItem[]` 数组，支持一次输入多笔消费的场景。`categoryId`/`categoryIcon`/`accountId` 由 `matchCategoryAndAccount` 节点在图内填充（通过 JSON 字符串匹配），`replyText` 由 `ChatService.buildConfirmMessage()` 在图外生成。

#### 节点流程

```
START → semanticParse → [条件边]
                           ├── parsed=false → evaluateAndReply → END
                           └── parsed=true  → matchCategory → evaluateAndReply → END
```

**节点1: semanticParse (LLM 语义解析)**

- 使用 `chatModel.withStructuredOutput()` 让 LLM 输出结构化数据
- Schema 包含: parsed, bills 数组（每项含 type, amount, note, date, categoryName, accountName, confidence, warning）
- Prompt 中注入可用分类列表和账户列表，确保 LLM 选择正确分类和账户
- 支持多笔消费解析：用户输入"午饭25，打车15"时，LLM 一次返回 bills 数组含2项
- 如果非记账意图，返回 parsed=false 和空 bills 数组

**节点2: matchCategoryAndAccount (分类和账户匹配校验)**

- 校验 LLM 返回的每笔 bill 的 `categoryName` 是否真实存在于可用分类列表中（防止 LLM 幻觉自创分类）
- 校验 LLM 返回的每笔 bill 的 `accountName` 是否真实存在于可用账户列表中
- 使用 `findCategoryInList()` / `findAccountInList()` 对 JSON 字符串做大小写不敏感匹配
- 匹配成功时用数据库标准名称替换，并填充 categoryId/categoryIcon/accountId
- 匹配失败或为空时回退到"其他"分类或清空账户，并降低置信度为 medium

**节点3: evaluateAndReply (置信度评估)**

- 根据 confidence 和 warning 决定是否需要用户确认
- high + 无 warning → 自动确认（needsConfirm=false）
- medium/low/有 warning → 需要用户确认（needsConfirm=true）
- 回复文本由 `ChatService.buildConfirmMessage()` 在图外生成，图内只输出 `needsConfirm`

#### LLM 结构化输出 Schema

```typescript
const SingleBillSchema = z.object({
  type: z.enum(['expense', 'income']).describe('收支类型'),
  amount: z.number().describe('金额，必须为正数'),
  note: z.string().describe('备注/描述'),
  date: z.string().describe('日期，格式 YYYY-MM-DD'),
  categoryName: z.string().describe('分类名称，必须从可用分类中选择'),
  accountName: z.string().describe('账户名称，未提及则为空字符串'),
  confidence: z.enum(['high', 'medium', 'low']).describe('解析置信度'),
  warning: z.string().describe('异常提示，无异常则为空字符串'),
});

const ParseOutputSchema = z.object({
  parsed: z.boolean().describe('是否成功解析为记账意图'),
  bills: z.array(SingleBillSchema).describe('解析出的账单列表，单笔消费返回1项，多笔消费返回多项'),
});
```

> **多消费设计**: `bills` 字段定义为 `z.array(SingleBillSchema)`，LLM 一次返回多笔消费数组。单笔消费时数组长度为1，多笔消费时数组长度对应消费笔数。Prompt 中明确要求"用户可能一次输入多笔消费，必须将每笔消费拆分为 bills 数组中的独立项"。

---

### 2.3 ChatService 集成

**文件**: `packages/server/src/modules/chat/chat.service.ts`

#### 核心流程

```
sendMessage(userId, dto):
  1. 保存用户消息
  2. 获取用户可用分类和账户
  3. 调用 LangGraph 编排图 (runBillGraph)
     ├── 成功: 返回 ParseResult[] (含 needsConfirm)
     └── 失败: 降级到本地关键词解析 (localParse, needsConfirm=true)
  4. 根据 needsConfirm 分流:
     ├── needsConfirm=true  → 返回 confirm_card，等用户确认
     └── needsConfirm=false → 调用 createBillFromParse 直接入库，返回 confirmed + billId
  5. 保存 AI 消息 (含 metadata 和 billId)
  6. 返回结果
```

#### 高置信度免确认

当 LLM 解析结果为高置信度（`confidence=high`）且无异常提示（`warning` 为空）时，`evaluateAndReply` 节点设置 `needsConfirm=false`。此时 `ChatService.sendMessage` 会：

1. 调用 `createBillFromParse()` 直接创建账单入库
2. 返回 `metadata: { type: 'confirmed', parseResult }` + `billId`
3. 前端渲染"已记录 ✓"的 ConfirmCard（无操作按钮）

这避免了高置信度场景下用户每次都需要手动确认的繁琐操作。

#### 降级策略

当 LLM 调用失败时（网络错误、API 限流、模型不可用等），自动降级到本地关键词解析：

1. **多消费拆分**: `splitMultiExpense()` 按逗号/分号/顿号/换行符分割输入，仅当每个分段都包含数字时才拆分为多笔（避免误拆）
2. **金额提取**: 正则匹配 `数字+元/块/¥` 或 `动词+数字`
3. **收支判断**: 关键词匹配（收入/工资/红包 → income）
4. **分类推荐**: 关键词映射到分类名
5. **日期解析**: 支持"今天/昨天/前天"，统一输出 `YYYY-MM-DD` 格式（与 LLM 解析和 `confirmBill` 保持一致）
6. **每笔独立解析**: `parseSingleExpense()` 对每个分段独立解析，返回 `ParseResult | null`，最终汇总为 `ParseResult[]`

#### 确认/取消流程

```
confirmBill(userId, messageId, billIndex, edits?):
  1. 查找 AI 消息，验证 metadata.type === 'confirm_card'
  2. 校验 billIndex 不越界
  3. 合并用户修改 (edits) 到 parseResults[billIndex]
  4. 设置 parseResults[billIndex].needsConfirm = false
  5. 创建账单 (source: 'ai')
  6. 检查是否所有 parseResults 都已确认 (allConfirmed)
     ├── allConfirmed=true  → 更新 metadata.type = 'confirmed'
     └── allConfirmed=false → 保持 metadata.type = 'confirm_card'
  7. 更新消息 metadata
  8. 创建用户"确认"消息
  （不再额外创建"已记录"助手消息，原确认卡片已变为已确认状态）

confirmAllBills(userId, messageId):
  1. 查找 AI 消息，验证 metadata.type === 'confirm_card'
  2. 遍历 parseResults，为每笔创建账单 (source: 'ai')
  3. 更新 metadata → type: 'confirmed'，所有 parseResults.needsConfirm = false
  4. 创建用户"全部确认"消息
  5. 返回 { confirmed: true, billIds, bills }

rejectBill(userId, messageId):
  1. 验证消息类型
  2. 更新 metadata → type: 'rejected'
  3. 创建取消消息 + AI 回复消息
```

#### createBillFromParse（高置信度直接入库）

```typescript
private async createBillFromParse(userId: string, parse: ParseResult) {
  // 查询用户家庭组
  const membership = await this.prisma.familyMember.findFirst({ ... });
  // 创建账单
  return this.prisma.bill.create({
    data: {
      userId, familyId, categoryId, type, amount, note, date,
      source: 'ai',
    },
    include: { category: true },
  });
}
```

> **设计说明**: `createBillFromParse` 与 `confirmBill` 中的账单创建逻辑一致（都查询家庭组、创建 Bill 记录、设置 source='ai'），抽为独立方法避免重复。

---

## 3. Mobile 端实现

### 3.1 首页对话界面重设计

**文件**: `packages/mobile/src/app/(tabs)/index.tsx`

#### 设计风格

- **深邃黑底 + 精致灰阶 + 系统蓝点缀** (Apple HIG)
- 消息气泡带入场动画（spring 弹性 + 淡入），非对称圆角模拟真实气泡方向感
- AI 头像使用 MaterialCommunityIcons 的 robot-happy-outline，带半透明蓝色光晕
- 打字指示器使用脉冲动画 (三个蓝色圆点)
- 快捷输入按钮 (午饭/打车/奶茶/工资)

#### 确认卡片设计

**单笔消费确认卡片：**

```
┌──────────────────────────────────┐
│  [图标] 餐饮        支出  ¥25.00 │
│         支出                      │
│ ─────────────────────────────── │
│  📅 今天        ⚠️ 分类待确认    │
│                                  │
│  [  取消  ]  [ ✓ 确认记账  ]     │
└──────────────────────────────────┘
```

**多笔消费确认卡片：**

```
┌──────────────────────────────────┐
│  识别到 3 笔消费     合计 ¥48.00 │
│ ─────────────────────────────── │
│  ¥25.00  支出  餐饮              │
│  📅 今天                         │
│  [确认此笔]                      │
│ ─────────────────────────────── │
│  ¥15.00  支出  交通              │
│  📅 今天                         │
│  [确认此笔]                      │
│ ─────────────────────────────── │
│  ¥8.00   支出  餐饮              │
│  📅 今天                         │
│  [确认此笔]                      │
│ ─────────────────────────────── │
│  [  取消  ]  [ ✓ 全部确认（3笔）]│
└──────────────────────────────────┘
```

**已确认状态：**

- 单笔：显示 "✓ 餐饮 · ¥25.00 · 已记录"
- 多笔：显示 "✓ 3 笔已记录 · 合计 ¥48.00"

**关键设计点**:

- 支出用红色系 (error)，收入用绿色系 (success)
- 分类图标带彩色背景圆
- 金额使用大号加粗字体
- 分隔线区分信息区和操作区
- 确认按钮带 check 图标
- 已确认状态显示 ✓ 徽章
- 多笔消费时自动识别，展示"识别到N笔消费"头部和合计金额
- 多笔消费支持"确认此笔"（单笔确认）和"全部确认"（批量确认）
- 单笔确认后该笔显示 ✓ 徽章，全部确认后卡片整体变为已确认状态

#### 打字指示器

使用 `Animated.loop` + `Animated.timing` 实现三个圆点的脉冲动画：

```typescript
function usePulse(delay: number) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, ... }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, ... }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  return anim;
}
```

#### 顶部导航栏

- 左侧: AI 机器人图标（蓝色圆形背景）+ "AI 记账" 标题
- 右侧: 菜单按钮（汉堡图标），点击展开导航菜单（首页/统计/我的）

#### 底部输入区域

- 输入框与发送按钮整合为胶囊容器（iMessage 风格），发送按钮内嵌右侧
- 快捷输入标签（午饭/打车/奶茶/工资）位于输入框上方
- 使用 `SafeAreaView edges={['top', 'bottom']}` 确保底部安全区间距

#### 悬浮按钮

- 右下角悬浮手动记账按钮（pencil-outline 图标，半透明毛玻璃风格）
- 导航菜单从头部右侧展开，菜单项使用半透明毛玻璃背景

---

## 4. 数据流

### 4.1 完整对话记账流程

#### 高置信度（免确认）

```
1. 用户输入 "午饭花了25"
2. → POST /api/v1/chat/send { content: "午饭花了25" }
3. → ChatService.sendMessage()
4. → LangGraph: semanticParse → matchCategoryAndAccount → evaluateAndReply
5. → evaluateAndReply: confidence=high, warning=空 → needsConfirm=false
6. → ChatService: needsConfirm=false → createBillFromParse() 直接入库
7. → 返回 { assistantMessage: { metadata: { type: 'confirmed', parseResults: [...] }, billId } }
8. → 前端渲染"已记录 ✓"的 ConfirmCard（无操作按钮）
```

#### 中/低置信度（需确认）

```
1. 用户输入 "午饭花了25"
2. → POST /api/v1/chat/send { content: "午饭花了25" }
3. → ChatService.sendMessage()
4. → LangGraph: semanticParse → matchCategoryAndAccount → evaluateAndReply
5. → evaluateAndReply: confidence≠high 或 warning≠空 → needsConfirm=true
6. → 返回 { assistantMessage: { metadata: { type: 'confirm_card', parseResults: [...] } } }
7. → 前端渲染确认卡片（带"确认记账"和"取消"按钮）
8. 用户点击"确认记账"
9. → POST /api/v1/chat/confirm/:messageId { billIndex: 0 }
10. → ChatService.confirmBill()
11. → 创建 Bill 记录 (source: 'ai')
12. → 更新消息 metadata → type: 'confirmed', billId
13. → 前端刷新历史，确认卡片变为"已记录"状态
14. → 前端刷新账单列表和今日汇总
```

#### 多笔消费（批量确认）

```
1. 用户输入 "午饭25，打车15，奶茶8"
2. → POST /api/v1/chat/send { content: "午饭25，打车15，奶茶8" }
3. → ChatService.sendMessage()
4. → LangGraph: semanticParse → LLM 返回 bills 数组（3项）
5. → matchCategoryAndAccount: 每笔独立匹配分类和账户
6. → evaluateAndReply: needsConfirm=true
7. → 返回 { assistantMessage: { metadata: { type: 'confirm_card', parseResults: [3项] } } }
8. → 前端渲染多笔确认卡片（"识别到3笔消费"，每笔可独立确认，底部"全部确认"按钮）
9a. 用户点击"确认此笔" → POST /chat/confirm/:messageId { billIndex: 1 }
    → 仅创建该笔账单，卡片保持 confirm_card 状态（其他笔未确认）
9b. 用户点击"全部确认" → POST /chat/confirm-all/:messageId
    → 创建所有账单，卡片变为 confirmed 状态
10. → 前端刷新账单列表和今日汇总
```

### 4.2 降级流程

```
1. LLM 调用失败 (网络错误/API 限流)
2. → ChatService 捕获异常
3. → 降级到 localParse() 关键词解析
4. → 返回结果 (置信度可能为 medium/low, needsConfirm=true)
5. → 前端正常显示确认卡片
```

> **设计说明**: 降级解析始终设置 `needsConfirm=true`，因为本地关键词解析的准确性低于 LLM，应更谨慎地要求用户确认。

---

## 5. 文件清单

### Server 端新增/修改文件

| 文件                                     | 说明                                          |
| ---------------------------------------- | --------------------------------------------- |
| `src/modules/llm/llm.service.ts`         | LLM 统一适配服务（含 DeepSeek）               |
| `src/modules/llm/llm.module.ts`          | LLM NestJS 模块                               |
| `src/modules/llm/index.ts`               | 导出                                          |
| `src/modules/chat/bill-graph.ts`         | LangGraph 记账编排图（支持多消费 bills 数组） |
| `src/modules/chat/chat.service.ts`       | 重构：集成 LangGraph + 降级 + 多消费确认      |
| `src/modules/chat/chat.controller.ts`    | 新增 confirm-all 接口                         |
| `src/modules/chat/chat.module.ts`        | 导入 LlmModule                                |
| `src/modules/chat/dto/chat.dto.ts`       | 移除 ConfirmAllBillsDto，简化 ConfirmBillDto  |
| `src/config/configuration/llm.config.ts` | LLM 配置定义（含 DeepSeek）                   |
| `src/config/config.module.ts`            | 注册 llmConfig                                |
| `.env.example`                           | 新增 LLM + DeepSeek 环境变量                  |

### Mobile 端修改文件

| 文件                                  | 说明                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `src/app/(tabs)/index.tsx`            | 首页对话界面重设计                                                           |
| `src/services/chat/types.ts`          | ParseResult 新增 needsConfirm 字段，AssistantMetadata 改为 parseResults 数组 |
| `src/services/chat/index.ts`          | 新增 confirmAllBills API 调用                                                |
| `src/stores/chat.ts`                  | 新增 confirmAllBills action，confirmBill 支持 billIndex                      |
| `src/components/chat/ChatBubble.tsx`  | 支持多消费 confirmed/rejected 消息渲染                                       |
| `src/components/chat/ConfirmCard.tsx` | 多消费确认卡片（单笔确认/全部确认/独立编辑）                                 |

---

## 6. 依赖说明

### Server 端新增依赖

| 包名                      | 版本    | 说明                                        |
| ------------------------- | ------- | ------------------------------------------- |
| `@langchain/core`         | ^1.1.48 | LangChain 核心抽象                          |
| `@langchain/openai`       | ^1.4.7  | OpenAI Chat Model                           |
| `@langchain/google-genai` | ^2.1.31 | Google Gemini Chat Model                    |
| `@langchain/deepseek`     | -       | DeepSeek Chat Model（官方包，非 community） |
| `@langchain/langgraph`    | ^1.3.2  | LangGraph 编排框架                          |
| `langchain`               | ^1.4.2  | LangChain 主包                              |
| `zod`                     | -       | Schema 验证 (结构化输出)                    |

---

## 7. 使用指南

### 7.1 配置 LLM

1. 复制 `.env.example` 为 `.env`
2. 设置 `LLM_PROVIDER` 为 `openai`、`gemini`、`deepseek` 或 `ollama`
3. 填写对应厂商的 API Key 和模型配置
4. 重启服务

### 7.2 使用 Ollama 本地部署

```bash
# 安装 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 拉取模型
ollama pull qwen2.5:7b

# 启动 Ollama 服务
ollama serve

# 配置 .env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### 7.3 切换模型

只需修改 `LLM_PROVIDER` 环境变量，无需修改代码。所有模型统一通过 `BaseChatModel` 接口调用，请求和响应参数已统一。
