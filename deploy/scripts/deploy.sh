#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${BLUE}[STEP]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"

cd "$PROJECT_DIR"

echo "============================================"
echo "  Account Server - 部署脚本"
echo "  Domain: account.tankswift.top"
echo "============================================"
echo ""

if [ ! -f "${DEPLOY_DIR}/.env.production" ]; then
    log_error ".env.production 文件不存在!"
    log_info "请复制 .env.production.example 并填写配置:"
    echo "  cp ${DEPLOY_DIR}/.env.production.example ${DEPLOY_DIR}/.env.production"
    exit 1
fi

log_step "1. 拉取最新代码"
git pull origin main 2>/dev/null || log_warn "无法拉取代码 (可能不是 git 仓库或未配置 remote)"
log_info "代码已就绪"

log_step "2. 构建应用镜像"
docker compose -f "${DEPLOY_DIR}/docker-compose.prod.yml" build --no-cache server
log_info "应用镜像构建完成"

log_step "3. 停止旧服务并启动新服务"
docker compose -f "${DEPLOY_DIR}/docker-compose.prod.yml" up -d
log_info "服务已启动"

log_step "4. 等待服务健康检查"
sleep 5

MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if docker compose -f "${DEPLOY_DIR}/docker-compose.prod.yml" ps | grep -q "unhealthy"; then
        log_warn "有服务不健康，第 $((RETRY+1)) 次检查..."
    else
        log_info "所有服务健康检查通过"
        break
    fi
    if [ $RETRY -eq $((MAX_RETRIES-1)) ]; then
        log_error "服务健康检查超时，请查看日志:"
        docker compose -f "${DEPLOY_DIR}/docker-compose.prod.yml" logs --tail=50
        exit 1
    fi
    sleep 2
    RETRY=$((RETRY+1))
done

log_step "5. 运行数据库迁移"
docker compose -f "${DEPLOY_DIR}/docker-compose.prod.yml" exec -T server \
    npx prisma migrate deploy --schema=packages/server/prisma/schema.prisma 2>/dev/null || \
    log_warn "数据库迁移可能需要手动执行"
log_info "数据库迁移完成"

echo ""
echo "============================================"
log_info "部署完成! 访问地址: https://account.tankswift.top"
echo ""
log_info "服务状态:"
docker compose -f "${DEPLOY_DIR}/docker-compose.prod.yml" ps
echo ""
log_info "查看日志:"
echo "  docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml logs -f"
log_info "重启服务:"
echo "  docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml restart"
echo ""