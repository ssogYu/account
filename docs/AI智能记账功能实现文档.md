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
                              [确认卡片 → 用户确认 → 创建账单]
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

| 厂商          | 配置键   | 模型示例         | 说明                           |
| ------------- | -------- | ---------------- | ------------------------------ |
| OpenAI        | `openai` | gpt-4o-mini      | 支持 OpenAI 兼容 API           |
| Google Gemini | `gemini` | gemini-2.0-flash | 使用 @langchain/google-genai   |
| Ollama        | `ollama` | qwen2.5:7b       | 本地部署，通过 OpenAI 兼容 API |

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
```

---

### 2.2 LangGraph 记账编排图

**文件**: `packages/server/src/modules/chat/bill-graph.ts`

#### 图状态定义

```typescript
export const BillState = Annotation.Root({
  input: Annotation<string>, // 用户原始输入
  userId: Annotation<string>, // 用户ID
  categoriesJson: Annotation<string>, // 可用分类列表
  parsed: Annotation<boolean>, // 解析是否成功
  type: Annotation<'expense' | 'income' | null>, // 收支类型
  amount: Annotation<number | null>, // 金额
  note: Annotation<string>, // 备注
  date: Annotation<string>, // 日期（YYYY-MM-DD）
  categoryName: Annotation<string>, // 分类名
  confidence: Annotation<'high' | 'medium' | 'low'>, // 置信度
  warning: Annotation<string>, // 异常提示
  needsConfirm: Annotation<boolean>, // 是否需要确认
  error: Annotation<string>, // 错误信息
});
```

> **设计说明**: `categoryId`、`categoryIcon`、`replyText` 已从图状态中移除。`categoryId`/`categoryIcon` 由 `ChatService` 在图外查数据库填充（图内无法访问数据库），`replyText` 由 `ChatService.buildConfirmMessage()` 生成（图内生成的回复文本未被消费方使用，属于死代码）。

#### 节点流程

```
START → semanticParse → [条件边]
                           ├── parsed=false → evaluateAndReply → END
                           └── parsed=true  → matchCategory → evaluateAndReply → END
```

**节点1: semanticParse (LLM 语义解析)**

- 使用 `chatModel.withStructuredOutput()` 让 LLM 输出结构化数据
- Schema 包含: parsed, type, amount, note, date, categoryName, confidence, warning
- Prompt 中注入可用分类列表，确保 LLM 选择正确分类
- 如果非记账意图，返回 parsed=false 和引导消息

**节点2: matchCategory (分类匹配校验)**

- 校验 LLM 返回的 `categoryName` 是否真实存在于可用分类列表中（防止 LLM 幻觉自创分类）
- 使用 `findCategoryInList()` 对 `categoriesJson` 做大小写不敏感匹配
- 匹配成功时用数据库标准名称替换（处理大小写不一致）
- 匹配失败或 `categoryName` 为空时回退到"其他"分类，并降低置信度为 medium

**节点3: evaluateAndReply (置信度评估)**

- 根据 confidence 和 warning 决定是否需要用户确认
- high + 无 warning → 自动确认（needsConfirm=false）
- medium/low/有 warning → 需要用户确认（needsConfirm=true）
- 回复文本由 `ChatService.buildConfirmMessage()` 在图外生成，图内只输出 `needsConfirm`

#### LLM 结构化输出 Schema

```typescript
const ParseOutputSchema = z.object({
  parsed: z.boolean(),
  type: z.enum(['expense', 'income']).nullable(),
  amount: z.number().nullable(),
  note: z.string(),
  date: z.string(),
  categoryName: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  warning: z.string(),
});
```

---

### 2.3 ChatService 集成

**文件**: `packages/server/src/modules/chat/chat.service.ts`

#### 核心流程

```
sendMessage(userId, dto):
  1. 保存用户消息
  2. 获取用户可用分类
  3. 调用 LangGraph 编排图 (runBillGraph)
     ├── 成功: 返回 ParseResult
     └── 失败: 降级到本地关键词解析 (localParse)
  4. 生成 AI 回复 (确认卡片 or 引导消息)
  5. 保存 AI 消息 (含 metadata)
  6. 返回结果
```

#### 降级策略

当 LLM 调用失败时（网络错误、API 限流、模型不可用等），自动降级到本地关键词解析：

1. **金额提取**: 正则匹配 `数字+元/块/¥` 或 `动词+数字`
2. **收支判断**: 关键词匹配（收入/工资/红包 → income）
3. **分类推荐**: 关键词映射到分类名
4. **日期解析**: 支持"今天/昨天/前天"，统一输出 `YYYY-MM-DD` 格式（与 LLM 解析和 `confirmBill` 保持一致）

#### 确认/取消流程

```
confirmBill(userId, messageId, edits?):
  1. 查找 AI 消息，验证 metadata.type === 'confirm_card'
  2. 合并用户修改 (edits)
  3. 创建账单 (source: 'ai')
  4. 更新消息 metadata → type: 'confirmed'
  5. 创建确认消息 + 已记录消息

rejectBill(userId, messageId):
  1. 验证消息类型
  2. 更新 metadata → type: 'rejected'
  3. 创建取消消息
```

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

**关键设计点**:

- 支出用红色系 (error)，收入用绿色系 (success)
- 分类图标带彩色背景圆
- 金额使用大号加粗字体
- 分隔线区分信息区和操作区
- 确认按钮带 check 图标
- 已确认状态显示 ✓ 徽章

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

```
1. 用户输入 "午饭花了25"
2. → POST /api/v1/chat/send { content: "午饭花了25" }
3. → ChatService.sendMessage()
4. → LangGraph: semanticParse (LLM 解析)
5. → LangGraph: matchCategory (分类校验)
6. → LangGraph: evaluateAndReply (回复生成)
7. → 返回 { assistantMessage: { metadata: { type: 'confirm_card', parseResult: {...} } } }
8. → 前端渲染确认卡片
9. 用户点击"确认记账"
10. → POST /api/v1/chat/confirm/:messageId
11. → ChatService.confirmBill()
12. → 创建 Bill 记录 (source: 'ai')
13. → 前端刷新账单列表和今日汇总
```

### 4.2 降级流程

```
1. LLM 调用失败 (网络错误/API 限流)
2. → ChatService 捕获异常
3. → 降级到 localParse() 关键词解析
4. → 返回结果 (置信度可能为 medium/low)
5. → 前端正常显示确认卡片
```

---

## 5. 文件清单

### Server 端新增/修改文件

| 文件                                     | 说明                        |
| ---------------------------------------- | --------------------------- |
| `src/modules/llm/llm.service.ts`         | LLM 统一适配服务            |
| `src/modules/llm/llm.module.ts`          | LLM NestJS 模块             |
| `src/modules/llm/index.ts`               | 导出                        |
| `src/modules/chat/bill-graph.ts`         | LangGraph 记账编排图        |
| `src/modules/chat/chat.service.ts`       | 重构：集成 LangGraph + 降级 |
| `src/modules/chat/chat.module.ts`        | 导入 LlmModule              |
| `src/config/configuration/llm.config.ts` | LLM 配置定义                |
| `src/config/config.module.ts`            | 注册 llmConfig              |
| `.env.example`                           | 新增 LLM 环境变量           |

### Mobile 端修改文件

| 文件                       | 说明               |
| -------------------------- | ------------------ |
| `src/app/(tabs)/index.tsx` | 首页对话界面重设计 |

---

## 6. 依赖说明

### Server 端新增依赖

| 包名                      | 版本    | 说明                     |
| ------------------------- | ------- | ------------------------ |
| `@langchain/core`         | ^1.1.48 | LangChain 核心抽象       |
| `@langchain/openai`       | ^1.4.7  | OpenAI Chat Model        |
| `@langchain/google-genai` | ^2.1.31 | Google Gemini Chat Model |
| `@langchain/langgraph`    | ^1.3.2  | LangGraph 编排框架       |
| `langchain`               | ^1.4.2  | LangChain 主包           |
| `zod`                     | -       | Schema 验证 (结构化输出) |

---

## 7. 使用指南

### 7.1 配置 LLM

1. 复制 `.env.example` 为 `.env`
2. 设置 `LLM_PROVIDER` 为 `openai`、`gemini` 或 `ollama`
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
