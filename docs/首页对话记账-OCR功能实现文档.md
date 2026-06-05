# 首页对话记账 OCR 功能实现文档

## 1. 文档说明

本文档用于说明“首页对话记账支持 OCR 账单识别”功能的当前实现状态。

与 `首页对话记账-OCR账单识别最佳实践方案.md` 的区别：

- 方案文档：描述推荐架构、设计思路、最佳实践方向
- 实现文档：描述当前已经完成的代码实现、支持能力、实际工作流程和配置方式

本文档内容以当前代码实现为准。

---

## 2. 功能目标

当前 OCR 功能的目标是：

- 用户可以在首页对话记账中选择图片
- 用户可以在首页对话记账中拍照上传账单图片
- 用户可以发送“图片 + 文本”混合输入
- 服务端对图片执行 OCR 识别
- OCR 抽文结果统一进入 LangGraph 编排
- OCR 结果继续进入现有“确认卡片 -> 用户确认 -> 入库”链路
- 对话历史中可以回显图片消息

---

## 3. 当前已实现功能

## 3.1 首页输入能力

已实现：

- 首页底部输入区增加 `图片` 入口
- 首页底部输入区增加 `拍照` 入口
- 支持纯图片发送
- 支持纯文字发送
- 支持图片 + 文字混合发送
- 支持发送前图片预览
- 支持移除待发送图片

## 3.2 图片上传能力

已实现：

- 新增聊天账单图片上传接口：`POST /upload/chat-image`
- 图片上传采用私有 MinIO 存储
- 返回聊天附件对象，而不是公开永久 URL
- 历史消息和实时消息通过签名 URL 回显图片

支持的图片格式：

- JPG
- PNG
- WebP

当前限制：

- 聊天账单图片最大 8MB

## 3.3 OCR 能力

已实现：

- 服务端新增独立 `ocr` 模块
- OCR 已抽象为 provider 架构
- 当前支持两个 provider：
  - `llm_vision`
  - `baidu`
- 已接入百度 OCR
- 已实现百度 OCR `access_token` 缓存
- 已实现 OCR 请求超时控制
- 已实现 OCR 识别失败的明确错误反馈

## 3.4 对话记账链路集成

已实现：

- `chat/send` 支持 `attachments`
- 用户消息可携带图片附件
- OCR 识别结果会先转换为 LangGraph 输入
- 图片记账与文本记账统一复用 LangGraph
- OCR 结果继续复用现有确认卡片
- 用户确认后继续复用现有 `Bill` 入库逻辑
- 用户取消后继续复用现有取消逻辑

## 3.5 对话展示能力

已实现：

- 用户侧图片消息展示
- AI 侧 OCR 结果消息展示
- OCR 结果确认卡片展示
- 对话历史图片回显

---

## 4. 当前技术实现总览

当前实际采用的是：

`移动端选择图片/拍照 -> 上传私有图片 -> chat/send 携带 attachments -> OCR provider 抽文 -> 组合 OCR 文本上下文 -> LangGraph 解析 -> 确认卡片 -> 用户确认 -> 创建 Bill`

与方案文档一致的部分：

- 账单图片不复用头像公开上传链路
- OCR 不直接入库
- OCR 最终仍回到确认卡片体系
- OCR 与聊天主链路解耦

当前实际实现与方案文档相比的阶段定位：

- 已实现一期可用版
- 已具备百度 OCR 主路径
- 尚未实现异步 OCR 任务表、独立媒体表、独立 OCR 任务表

---

## 5. 模块划分

## 5.1 Mobile 端

涉及模块：

- 首页输入页
- 上传服务
- 聊天服务
- 聊天气泡组件
- 聊天状态管理

主要职责：

- 调用相册/相机选择图片
- 上传图片到服务端
- 调用 `chat/send`
- 渲染图片消息
- 渲染 OCR 返回的确认卡片

## 5.2 Server 端

涉及模块：

- `upload` 模块
- `ocr` 模块
- `chat` 模块
- `llm` 模块
- `MinioService`

主要职责：

- 私有图片存储
- 图片签名 URL 生成
- OCR provider 调度
- OCR 文本抽取
- 与现有聊天记账链路对接

---

## 6. OCR Provider 架构

当前 OCR 模块已经采用 provider 架构，方便后续继续扩展其他 OCR 服务商。

## 6.1 当前支持的 provider

### `llm_vision`

说明：

- 使用支持视觉输入的 LLM 直接读取图片并抽取 OCR 文本
- 适合开发阶段或兜底场景

特点：

- 实现简单
- 依赖视觉模型能力
- 稳定性通常弱于专业 OCR

### `baidu`

说明：

- 先用百度 OCR 抽取图片文字
- 再将 OCR 文本交给 LangGraph 做统一记账解析

特点：

- 更适合中文账单生产场景
- 对支付截图、小票、订单截图更稳定
- 与文本记账共用同一套 LangGraph 编排逻辑

## 6.2 当前推荐使用方式

当前生产推荐：

- `OCR_PROVIDER=baidu`

当前兜底或开发调试可用：

- `OCR_PROVIDER=llm_vision`

---

## 7. 详细工作流程

## 7.1 用户发送图片的完整链路

### Step 1. 用户选择图片或拍照

用户在首页底部输入区点击：

- `图片`
- `拍照`

移动端通过 `expo-image-picker` 获取图片资源。

得到的数据包括：

- `uri`
- `fileName`
- `mimeType`
- `width`
- `height`

### Step 2. 前端展示待发送图片预览

图片选择完成后：

- 不会立即发送
- 先展示待发送预览卡片
- 用户可继续输入补充文字
- 用户也可以移除该图片

这一步可以支持：

- 纯图片发送
- 图片 + 文本混合发送

### Step 3. 前端上传聊天图片

用户点击发送后：

- 前端先调用 `POST /upload/chat-image`
- 服务端进行文件类型校验
- 服务端进行图片魔数校验
- 服务端将图片写入私有 MinIO 路径

当前对象路径格式：

```text
chat-bills/{userId}/{year}/{month}/{uuid}.{ext}
```

上传成功后，接口返回：

- `attachment.type`
- `attachment.bucket`
- `attachment.objectKey`
- `attachment.mimeType`
- `attachment.fileName`
- `attachment.fileSize`
- `attachment.width`
- `attachment.height`
- `attachment.previewUrl`

### Step 4. 前端发送聊天消息

上传完成后，前端调用 `POST /chat/send`。

当前请求支持：

```json
{
  "content": "这是昨天晚饭",
  "attachments": [
    {
      "type": "image",
      "bucket": "private",
      "objectKey": "chat-bills/xxx/2026/06/xxx.jpg",
      "mimeType": "image/jpeg"
    }
  ]
}
```

### Step 5. 服务端创建用户消息

服务端 `ChatService.sendMessage()` 会先创建用户消息：

- `content` 写入用户文字
- 如果是纯图片消息，则使用默认内容：`发送了一张账单图片`
- `metadata.attachments` 中保存附件信息

### Step 6. 服务端进入 OCR 分流

当 `attachments.length > 0` 时：

- 不再走纯文本 `LangGraph` 解析主路径
- 转而进入 `runOcrFlow()`

此阶段会把以下信息一起传给 OCR 层：

- 用户补充文字
- 图片附件列表

### Step 7. OCR Provider 执行识别

#### 情况 A：`OCR_PROVIDER=baidu`

服务端执行顺序如下：

1. 检查百度 OCR 配置是否存在
2. 获取百度 `access_token`
3. 使用 `access_token` 调用百度 OCR 接口
4. 读取 `words_result`
5. 合并为原始 OCR 文本
6. 通过规则初步提取：
   - 金额候选
   - 日期候选
   - 账户候选
   - 商户候选
7. 返回 OCR 文本和初步匹配字段给聊天模块

#### 情况 B：`OCR_PROVIDER=llm_vision`

服务端执行顺序如下：

1. 从 MinIO 读取图片
2. 转换为 base64 data URL
3. 交给支持视觉的 LLM
4. 由 LLM 输出 OCR 文本、场景类型和初步字段
5. 返回 OCR 结果给聊天模块

### Step 8. OCR 文本进入 LangGraph

OCR 结果不会直接入库，而是会先拼装为统一的 LangGraph 输入文本。

当前拼装内容包括：

- 用户补充说明
- OCR 初步字段
- OCR 全文

然后统一调用现有 `runBillGraph()`，让图片和文本都走同一套解析规则。

LangGraph 负责：

- 判断收入还是支出
- 提取主金额
- 选择分类
- 匹配账户
- 生成备注
- 评估置信度
- 生成 warning

### Step 9. LangGraph 输出 ParseResult

### Step 10. 生成确认卡片

服务端根据 OCR 输出判断是否需要确认：

满足以下任一情况时需要确认：

- `confidence !== high`
- 有 `warning`
- 缺少金额
- 缺少分类
- 支出类型但缺少账户

当前 OCR 结果默认倾向于进入确认卡片。

确认卡片消息中会带上：

- `source: "ocr"`
- `parseResults`
- `attachments`
- `ocrEvidence`

### Step 11. 前端渲染结果

前端收到响应后：

- 用户消息显示图片气泡
- AI 消息显示确认卡片或引导消息
- 历史消息中图片通过签名 URL 回显

### Step 12. 用户确认入库

用户点击确认后：

- 继续复用现有 `confirmBill`
- 或 `confirmAllBills`

最终创建 `Bill` 数据。

---

## 8. 百度 OCR 详细流程

## 8.1 鉴权流程

当前百度 OCR 使用的是服务端鉴权方式：

- 服务端通过 `API Key + Secret Key`
- 获取 `access_token`
- 将 `access_token` 缓存在内存中

缓存策略：

- token 未过期时直接复用
- 过期前预留缓冲时间后自动重新获取

## 8.2 当前调用的百度接口

当前使用：

- 百度 OCR 高精度通用文字识别接口

当前用途：

- 优先保障中文账单抽文质量
- 为后续账单结构化提供稳定文本输入

## 8.3 百度 OCR 之后为什么还要过一层 LLM

原因：

- 百度 OCR 擅长“识别图片中的文字”
- 账单记账还需要“理解哪个金额才是主金额、这是收入还是支出、分类应该是什么”
- 这些判断现在统一交给 LangGraph 内部的 LLM 语义解析节点完成

因此当前最佳实现不是：

- `百度 OCR -> 直接入库`

而是：

- `百度 OCR -> LangGraph -> 确认卡片 -> 入库`

---

## 9. 数据流说明

## 9.1 用户消息 metadata

用户消息当前会在 `metadata` 中保存：

```json
{
  "attachments": [
    {
      "type": "image",
      "bucket": "private",
      "objectKey": "chat-bills/xxx/2026/06/xxx.jpg",
      "mimeType": "image/jpeg"
    }
  ]
}
```

## 9.2 AI 消息 metadata

AI OCR 消息当前会在 `metadata` 中保存：

```json
{
  "type": "confirm_card",
  "source": "ocr",
  "attachments": [],
  "ocrEvidence": {
    "provider": "baidu",
    "sceneType": "payment_screenshot",
    "extractedText": "...",
    "matchedFields": {
      "merchant": "美团外卖",
      "amount": "实付金额 32.00",
      "date": "2026-06-05 18:22",
      "account": "微信支付"
    }
  },
  "parseResults": []
}
```

---

## 10. 当前配置说明

## 10.1 OCR Provider 配置

环境变量：

```env
OCR_PROVIDER=baidu
```

可选值：

- `baidu`
- `llm_vision`

## 10.2 百度 OCR 配置

环境变量：

```env
BAIDU_OCR_API_KEY=your_api_key
BAIDU_OCR_SECRET_KEY=your_secret_key
BAIDU_OCR_TIMEOUT_MS=12000
```

说明：

- `BAIDU_OCR_API_KEY`：百度 OCR API Key
- `BAIDU_OCR_SECRET_KEY`：百度 OCR Secret Key
- `BAIDU_OCR_TIMEOUT_MS`：百度 OCR 请求超时毫秒数

## 10.3 MinIO 相关配置

聊天图片依赖私有桶配置：

```env
MINIO_PRIVATE_BUCKET=account-private
MINIO_SIGNED_URL_EXPIRES_IN=3600
```

---

## 11. 当前已实现的前端交互细节

已实现：

- 发送前待发送图片预览
- 发送失败时保留待发送图片和文本
- 用户消息图片展示
- AI 消息图片展示
- 历史消息签名 URL 回显

说明：

- 当前尚未做上传进度条
- 当前尚未做 OCR 处理中间态气泡
- 当前发送体验为“先上传，再发送聊天消息”

---

## 12. 当前已实现的错误处理

服务端已处理：

- 未上传图片
- 百度 OCR 未配置
- 百度 OCR 鉴权失败
- 百度 OCR 识别失败
- OCR 未识别到有效文字

前端已处理：

- 拍照权限未授权
- 上传失败 toast 提示
- 发送失败不清空输入内容

---

## 13. 当前边界与未完成项

当前未完成：

- OCR 异步任务队列
- OCR 处理中间态消息
- 独立 `MediaAsset` 表
- 独立 `OcrTask` 表
- OCR 原始结果持久化
- OCR 质量打分体系
- 多模态 LLM 自动兜底切换
- 确认卡片中的 OCR 证据字段 UI 展示
- 上传压缩进度与识别进度展示

当前已知实现边界：

- 百度 OCR 现在使用的是通用高精度文字识别，不是票据专用接口
- 账单语义仍依赖 LangGraph 内部的 LLM 解析能力
- 复杂长图、多订单混排仍不是当前强项

---

## 14. 推荐联调顺序

建议联调时按如下顺序验证：

1. 测试 `POST /upload/chat-image` 是否能正常返回附件对象
2. 测试纯图片发送是否能走 OCR 链路
3. 测试图片 + 文本发送是否能提升识别结果
4. 测试支付成功截图、订单详情页、小票图、收入截图
5. 测试确认单笔、确认全部、取消
6. 测试历史消息回显是否能正常看到图片
7. 测试百度 OCR 未配置、鉴权失败、超时、无文字场景

---

## 15. 一句话总结

当前 OCR 功能已经完成首页对话记账的一期落地：用户可以上传图片或拍照发起记账，服务端通过私有上传、OCR provider 抽文、LangGraph 统一解析和确认卡片链路完成账单识别，并且已经支持百度 OCR 作为主识别路径。
