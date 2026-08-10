# CommonServer

AI 自动记账应用后端服务（NestJS + Fastify + Prisma）。

## 快速开始

```bash
# 1. 启动基础设施（PostgreSQL + MinIO）
docker compose up -d

# 2. 初始化数据库
npm run db:generate
npm run db:migrate

# 3. 启动开发服务
npm run dev
```

## 文件存储（MinIO）

项目使用 MinIO 作为对象存储（S3 兼容），用于账单识别图片、用户头像等文件。

### 启动

`docker-compose.yml` 已包含 MinIO 服务：

```bash
docker compose up -d minio
```

- API 端口：`9000`
- 控制台端口：`9001`（默认账号 `common` / `common123456`）

### 配置

在 `.env.development` 中配置存储相关变量：

```ini
STORAGE_PROVIDER=minio
STORAGE_ENDPOINT=127.0.0.1
STORAGE_PORT=9000
STORAGE_USE_SSL=false
STORAGE_REGION=us-east-1
STORAGE_BUCKET=common-dev
STORAGE_PUBLIC_URL=http://127.0.0.1:9000
STORAGE_ACCESS_KEY=common
STORAGE_SECRET_KEY=common123456
```

应用启动时会自动创建 bucket，并设置为**公开读**策略，便于前端直接通过 URL 访问图片。

### 通用文件上传接口

```
POST /api/v1/upload
Content-Type: multipart/form-data
```

| 表单字段 | 类型   | 必填 | 说明                                       |
| -------- | ------ | ---- | ------------------------------------------ |
| `file`   | file   | 是   | 图片文件（jpeg/png/webp/heic，最大 10MB）   |
| `scene`  | string | 否   | `bill`=账单识别图片 / `avatar`=用户头像，默认 `bill` |

**请求示例：**

```bash
curl -X POST http://127.0.0.1:8080/api/v1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.png;type=image/png" \
  -F "scene=bill"
```

**响应：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "fileId": "bill/2026/08/1786338022941-170b22a6-lz0u39lq.png",
    "url": "http://127.0.0.1:9000/common-dev/bill/2026/08/1786338022941-170b22a6-lz0u39lq.png",
    "filename": "image.png",
    "size": 70,
    "mimetype": "image/png",
    "scene": "bill"
  }
}
```

`fileId` 即 MinIO 对象名，供后续场景（如 AI 对话 `fileId` 字段）引用；`url` 为公网可访问的文件地址。

文件按 `{scene}/{yyyy}/{mm}/{唯一id}{扩展名}` 组织存放。
