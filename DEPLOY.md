# Account Server 部署文档

> **域名**: `account.tankswift.top`  
> **服务器路径**: `/srv/ai-account`  
> **技术栈**: NestJS + PostgreSQL + MinIO + Nginx (Docker 容器化)

## 一、项目架构概览

```
┌──────────────────────────────────────────────────────┐
│                     用户 / 客户端                      │
└─────────────────────┬────────────────────────────────┘
                      │ HTTPS (443)
                      ▼
┌──────────────────────────────────────────────────────┐
│                   Nginx (反向代理)                     │
│            - SSL/TLS 终止                             │
│            - 静态资源缓存                              │
│            - 请求转发 @ account.tankswift.top          │
└─────────────────────┬────────────────────────────────┘
                      │ HTTP (docker network)
                      ▼
┌──────────────────────────────────────────────────────┐
│              NestJS Server (Node.js)                   │
│            - REST API 服务                             │
│            - JWT 身份认证                              │
│            - Swagger API 文档                          │
│            - Pino 日志                                 │
└───────┬──────────────────────────────┬───────────────┘
        │                              │
        ▼                              ▼
┌───────────────┐            ┌──────────────────┐
│  PostgreSQL 16 │            │   MinIO (OSS)     │
│   (数据库)     │            │   (文件存储)       │
└───────────────┘            └──────────────────┘
```

## 二、部署文件说明

```
项目根目录/
├── deploy/                           # 部署配置目录
│   ├── Dockerfile                    # 应用多阶段构建镜像
│   ├── docker-compose.prod.yml       # 生产环境编排文件（4 个服务）
│   ├── .dockerignore                 # Docker 构建忽略文件
│   ├── .env.production.example       # 环境变量模板
│   ├── nginx/
│   │   ├── nginx.conf                # Nginx 主配置
│   │   ├── ssl/                      # SSL 证书存放目录（需手动创建）
│   │   │   ├── fullchain.pem
│   │   │   └── privkey.pem
│   │   └── conf.d/
│   │       └── account.conf          # 站点反向代理配置
│   └── scripts/
│       ├── setup-server.sh           # 服务器初始化脚本
│       └── deploy.sh                 # 一键部署/更新脚本
└── DEPLOY.md                         # 本文档
```

## 三、部署步骤

---

### 步骤 1：登录阿里云服务器

```bash
ssh root@你的服务器公网IP
```

---

### 步骤 2：上传项目代码到服务器

**方式 A：使用 git clone（推荐）**

```bash
mkdir -p /srv/ai-account
cd /srv/ai-account
git clone https://github.com/你的用户名/仓库名.git .
```

**方式 B：使用 rsync 上传**

在本地终端执行（不要在服务器上）：

```bash
cd /Users/ssngyu/Desktop/my-workspace/account
rsync -avz --exclude 'node_modules' \
            --exclude 'dist' \
            --exclude '.git' \
            --exclude 'mobile' \
            ./ root@你的服务器公网IP:/srv/ai-account/
```

---

### 步骤 3：服务器初始化（首次部署必须执行）

```bash
cd /srv/ai-account
chmod +x deploy/scripts/setup-server.sh
bash deploy/scripts/setup-server.sh
```

该脚本会自动完成：

- 系统包更新
- 安装 Docker & Docker Compose
- 配置防火墙（开放 22/80/443 端口）
- 设置上海时区
- 创建 `/srv/ai-account` 目录结构
- 优化系统内核参数

---

### 步骤 4：配置环境变量

```bash
cd /srv/ai-account/deploy

# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量
vim .env.production
```

**必须修改的配置项：**

| 变量名               | 说明         | 如何生成               |
| -------------------- | ------------ | ---------------------- |
| `POSTGRES_PASSWORD`  | 数据库密码   | 自行设置强密码         |
| `JWT_ACCESS_SECRET`  | JWT 签名密钥 | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥 | `openssl rand -hex 32` |
| `MINIO_ROOT_PASSWORD` | MinIO 密码   | 自行设置强密码         |
| `DEEPSEEK_API_KEY`   | LLM API Key  | 从 DeepSeek 平台获取   |

> `APP_ORIGIN` 和域名已预填为 `https://account.tankswift.top`，无需修改。  
> `DATABASE_URL` 中的 `host=postgres` 不用改，这是 Docker 内部网络的服务名。

---

### 步骤 5：放置 SSL 证书

你已经有了 SSL 证书，直接将证书文件放到指定目录即可。

在服务器上创建目录，然后把证书文件（Nginx 格式）放进去：

```bash
mkdir -p /srv/ai-account/deploy/nginx/ssl
```

需要放入两个文件：

| 文件名          | 说明               |
| --------------- | ------------------ |
| `fullchain.pem` | 完整证书链（公钥） |
| `privkey.pem`   | 私钥               |

**在本地用 scp 上传：**

```bash
scp /path/to/your/fullchain.pem root@服务器IP:/srv/ai-account/deploy/nginx/ssl/
scp /path/to/your/privkey.pem   root@服务器IP:/srv/ai-account/deploy/nginx/ssl/
```

> 如果证书文件是 `.crt` / `.key` 后缀，重命名为 `.pem` 即可，内容是一样的。

---

### 步骤 6：配置阿里云安全组（防火墙）

登录阿里云控制台 → ECS 实例 → 安全组 → 配置规则，确保 **入方向** 开放以下端口：

| 端口 | 协议 | 用途                |
| ---- | ---- | ------------------- |
| 22   | TCP  | SSH 远程连接        |
| 80   | TCP  | HTTP → HTTPS 重定向 |
| 443  | TCP  | HTTPS 服务          |

> 安全建议：SSH 端口（22）只对你的办公 IP 段开放。

---

### 步骤 7：配置 DNS 解析

在阿里云 DNS 控制台添加 A 记录：

| 主机记录 | 记录类型 | 记录值            |
| -------- | -------- | ----------------- |
| account  | A        | 你的服务器公网 IP |

---

### 步骤 8：构建和启动服务

```bash
cd /srv/ai-account

# 构建应用镜像（首次部署）
docker compose -f deploy/docker-compose.prod.yml build --no-cache server

# 启动所有服务
docker compose -f deploy/docker-compose.prod.yml up -d
```

---

### 步骤 9：等待服务就绪并检查状态

```bash
# 查看服务状态
docker compose -f deploy/docker-compose.prod.yml ps

# 实时查看日志
docker compose -f deploy/docker-compose.prod.yml logs -f
```

等待所有服务状态变为 `healthy`：

```
NAME                STATUS
account-postgres    healthy
account-minio       healthy
account-server      healthy
account-nginx       healthy
```

---

### 步骤 10：执行数据库迁移

```bash
cd /srv/ai-account
docker compose -f deploy/docker-compose.prod.yml exec server \
  npx prisma migrate deploy --schema=prisma/schema.prisma
```

---

### 步骤 11：验证部署

```bash
# 1. 健康检查
curl http://localhost:3000/health
# 预期输出: {"status":"ok","database":"connected",...}

# 2. HTTPS 访问
curl https://account.tankswift.top/health

# 3. API 文档（浏览器打开）
# https://account.tankswift.top/api/docs
```

---

## 四、常用运维命令

### 服务管理

```bash
cd /srv/ai-account

# 启动所有服务
docker compose -f deploy/docker-compose.prod.yml up -d

# 停止所有服务
docker compose -f deploy/docker-compose.prod.yml stop

# 重启所有服务
docker compose -f deploy/docker-compose.prod.yml restart

# 重启单个服务
docker compose -f deploy/docker-compose.prod.yml restart server

# 查看服务状态
docker compose -f deploy/docker-compose.prod.yml ps

# 查看日志（最近 100 行 + 实时跟踪）
docker compose -f deploy/docker-compose.prod.yml logs -f --tail=100 server

# 进入容器调试
docker compose -f deploy/docker-compose.prod.yml exec server sh
```

### 更新部署

```bash
cd /srv/ai-account

# 拉取最新代码
git pull origin main

# 重新构建镜像
docker compose -f deploy/docker-compose.prod.yml build --no-cache server

# 重启服务
docker compose -f deploy/docker-compose.prod.yml up -d

# 执行数据库迁移（如有新的 migration）
docker compose -f deploy/docker-compose.prod.yml exec server \
  npx prisma migrate deploy --schema=prisma/schema.prisma

# 清理旧镜像释放空间
docker image prune -f
```

### 数据库备份与恢复

```bash
cd /srv/ai-account

# 手动备份数据库
docker compose -f deploy/docker-compose.prod.yml exec postgres \
    pg_dump -U accountAdmin account > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
    psql -U accountAdmin account < backups/backup_20250101_120000.sql
```

### 自动备份

项目提供了自动备份脚本，支持 PostgreSQL 数据库和 MinIO 文件存储的定时备份，并自动清理过期备份。

**备份内容：**

| 备份项     | 文件格式                          | 说明                        |
| ---------- | --------------------------------- | --------------------------- |
| PostgreSQL | `postgres_YYYYMMDD_HHMMSS.sql.gz` | 数据库全量导出，gzip 压缩   |
| MinIO      | `minio_YYYYMMDD_HHMMSS.tar.gz`    | 文件存储目录打包，gzip 压缩 |

**手动执行备份：**

```bash
cd /srv/ai-account
bash deploy/scripts/backup.sh
```

**配置定时自动备份（cron）：**

```bash
# 编辑 crontab
crontab -e

# 添加以下内容：每天凌晨 2 点自动备份
0 2 * * * /bin/bash /srv/ai-account/deploy/scripts/backup.sh >> /srv/ai-account/backups/cron.log 2>&1
```

**自定义保留天数：**

默认保留 7 天的备份，可通过环境变量修改：

```bash
# 保留 30 天
BACKUP_RETENTION_DAYS=30 bash deploy/scripts/backup.sh
```

或在 crontab 中指定：

```
0 2 * * * BACKUP_RETENTION_DAYS=30 /bin/bash /srv/ai-account/deploy/scripts/backup.sh >> /srv/ai-account/backups/cron.log 2>&1
```

**恢复备份：**

```bash
cd /srv/ai-account

# 1. 恢复 PostgreSQL
gunzip -c backups/postgres_20250101_020000.sql.gz | \
    docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
    psql -U accountAdmin -d account

# 2. 恢复 MinIO（如需恢复文件存储）
# 停止 MinIO 容器确保数据一致性
docker compose -f deploy/docker-compose.prod.yml stop minio

# 解压备份到 MinIO 数据目录
gunzip -c backups/minio_20250101_020000.tar.gz | tar xzf - -C ./data

# 重启 MinIO 容器
docker compose -f deploy/docker-compose.prod.yml start minio
```

### SSL 证书续期

证书到期前替换新证书，然后重启 Nginx：

```bash
# 上传新证书到服务器
scp /path/to/new/fullchain.pem root@服务器IP:/srv/ai-account/deploy/nginx/ssl/
scp /path/to/new/privkey.pem   root@服务器IP:/srv/ai-account/deploy/nginx/ssl/

# 重启 Nginx 加载新证书
docker compose -f /srv/ai-account/deploy/docker-compose.prod.yml restart nginx
```

---

## 五、故障排查

### 服务无法启动

```bash
cd /srv/ai-account
docker compose -f deploy/docker-compose.prod.yml logs server
```

常见原因：

1. **数据库连接失败** → 确认 `DATABASE_URL` 中 host 为 `postgres`（Docker 内部服务名）
2. **端口冲突** → 检查 3000/5432/9000/80/443 是否被占用
3. **环境变量缺失** → 确认 `.env.production` 已配置完整

### Nginx 502 Bad Gateway

```bash
# 检查 server 容器是否正常
docker compose -f deploy/docker-compose.prod.yml ps server

# 测试 Nginx 到 server 的连通性
docker compose -f deploy/docker-compose.prod.yml exec nginx \
  wget -qO- http://server:3000/health
```

### 数据库问题

```bash
# 重新执行所有迁移
docker compose -f deploy/docker-compose.prod.yml exec server \
  npx prisma migrate deploy --schema=prisma/schema.prisma

# 查看迁移状态
docker compose -f deploy/docker-compose.prod.yml exec server \
  npx prisma migrate status --schema=prisma/schema.prisma
```

---

## 六、安全注意事项

1. **`.env.production` 不能提交到 Git** — 已在 `.gitignore` 中排除
2. **所有密钥使用强随机值** — 不低于 32 字符
3. **数据库端口不要暴露到公网** — 安全组只开放 22/80/443
4. **定期备份数据库** — 建议通过 cron 每日自动备份
5. **SSL 证书设置自动续期** — 避免证书过期导致服务不可用
