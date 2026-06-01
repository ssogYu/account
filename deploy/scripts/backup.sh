#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_step()  { echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"

RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

mkdir -p "${BACKUP_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "============================================"
echo "  Account Server - 自动备份"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"

if [ ! -f "${COMPOSE_FILE}" ]; then
    log_error "docker-compose.prod.yml 不存在: ${COMPOSE_FILE}"
    exit 1
fi

if ! docker compose -f "${COMPOSE_FILE}" ps postgres | grep -q "Up\|running"; then
    log_error "PostgreSQL 容器未运行，无法备份"
    exit 1
fi

log_step "1. 备份 PostgreSQL 数据库"

PG_BACKUP_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"

docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    pg_dump -U accountAdmin -d account --no-owner --no-privileges \
    | gzip > "${PG_BACKUP_FILE}"

PG_SIZE=$(du -h "${PG_BACKUP_FILE}" | cut -f1)
log_info "PostgreSQL 备份完成: ${PG_BACKUP_FILE} (${PG_SIZE})"

log_step "2. 备份 MinIO 文件存储"

MINIO_BACKUP_FILE="${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz"

if ! docker compose -f "${COMPOSE_FILE}" ps minio | grep -q "Up\|running"; then
    log_warn "MinIO 容器未运行，跳过文件备份"
else
    docker compose -f "${COMPOSE_FILE}" exec -T minio \
        tar czf - -C /data account \
        > "${MINIO_BACKUP_FILE}" 2>&1 || {
        EXIT_CODE=$?
        log_error "MinIO 备份失败，tar 返回码: ${EXIT_CODE}"
        rm -f "${MINIO_BACKUP_FILE}"
        MINIO_BACKUP_FILE=""
    }
fi

if [ -n "${MINIO_BACKUP_FILE}" ] && [ -f "${MINIO_BACKUP_FILE}" ]; then
    FILE_SIZE=$(stat -f%z "${MINIO_BACKUP_FILE}" 2>/dev/null || stat -c%s "${MINIO_BACKUP_FILE}" 2>/dev/null || echo "0")
    if [ "${FILE_SIZE}" -eq 0 ]; then
        log_warn "MinIO 备份文件为空，删除"
        rm -f "${MINIO_BACKUP_FILE}"
        MINIO_BACKUP_FILE=""
    else
        MINIO_SIZE=$(du -h "${MINIO_BACKUP_FILE}" | cut -f1)
        log_info "MinIO 备份完成: ${MINIO_BACKUP_FILE} (${MINIO_SIZE})"
    fi
else
    log_warn "MinIO 无数据或备份失败，已跳过"
fi

log_step "3. 清理过期备份 (保留 ${RETENTION_DAYS} 天)"

DELETED_COUNT=0

for OLD_FILE in "${BACKUP_DIR}"/postgres_*.sql.gz "${BACKUP_DIR}"/minio_*.tar.gz "${BACKUP_DIR}"/backup_*.log; do
    if [ ! -f "${OLD_FILE}" ]; then
        continue
    fi

    FILE_DATE=$(echo "${OLD_FILE}" | grep -oP '\d{8}' | head -1)

    if [ -z "${FILE_DATE}" ]; then
        continue
    fi

    FILE_TIMESTAMP=$(date -j -f "%Y%m%d" "${FILE_DATE}" "+%s" 2>/dev/null || echo "0")

    if [ "${FILE_TIMESTAMP}" = "0" ]; then
        continue
    fi

    CUTOFF_TIMESTAMP=$(date -v-${RETENTION_DAYS}d "+%s")

    if [ "${FILE_TIMESTAMP}" -lt "${CUTOFF_TIMESTAMP}" ]; then
        rm -f "${OLD_FILE}"
        DELETED_COUNT=$((DELETED_COUNT + 1))
        log_info "已删除过期文件: $(basename "${OLD_FILE}")"
    fi
done

if [ "${DELETED_COUNT}" -eq 0 ]; then
    log_info "没有需要清理的过期备份"
else
    log_info "已清理 ${DELETED_COUNT} 个过期备份文件"
fi

log_step "4. 备份摘要"

echo ""
echo "============================================"
log_info "备份完成!"
echo ""
log_info "备份目录: ${BACKUP_DIR}"
log_info "保留策略: ${RETENTION_DAYS} 天"
echo ""
log_info "备份文件:"
ls -lh "${BACKUP_DIR}"/*"${TIMESTAMP}"* 2>/dev/null || echo "  (无)"
echo ""
log_info "磁盘使用:"
df -h "${BACKUP_DIR}" | tail -1 | awk '{print "  总量: "$2", 已用: "$3", 可用: "$4", 使用率: "$5}'
echo "============================================"
