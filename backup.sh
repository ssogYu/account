#!/bin/bash

# ==============================
# 账一下 - 数据库 & 文件备份脚本
# 用法: ./backup.sh
# 建议添加到 cron: 0 3 * * * /srv/account/backup.sh >> /srv/backups/backup.log 2>&1
# ==============================

BACKUP_DIR=/srv/backups
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

cd /srv/account

echo "========================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份"

# 1. 备份 PostgreSQL 数据库
echo "→ 备份数据库..."
if docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U account account > "$BACKUP_DIR/db_$DATE.sql" 2>/dev/null; then
    echo "  完成: db_$DATE.sql ($(du -h "$BACKUP_DIR/db_$DATE.sql" | cut -f1))"
else
    echo "  失败: 数据库备份出错"
fi

# 2. 备份 MinIO 文件
echo "→ 备份文件..."
# 自动查找 MinIO 数据卷（兼容不同项目名）
MINIO_VOLUME=$(docker volume ls --format '{{.Name}}' | grep '_minio_data$' | head -1)
if [ -n "$MINIO_VOLUME" ]; then
    MOUNTPOINT=$(docker volume inspect "$MINIO_VOLUME" --format '{{.Mountpoint}}' 2>/dev/null)
    if [ -n "$MOUNTPOINT" ] && [ -d "$MOUNTPOINT" ]; then
        if tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" -C "$MOUNTPOINT" . 2>/dev/null; then
            echo "  完成: files_$DATE.tar.gz ($(du -h "$BACKUP_DIR/files_$DATE.tar.gz" | cut -f1))"
        else
            echo "  失败: 文件打包出错"
        fi
    else
        echo "  跳过: MinIO 挂载点不存在"
    fi
else
    echo "  跳过: MinIO 数据卷未找到"
fi

# 3. 清理过期备份
echo "→ 清理 ${RETENTION_DAYS} 天前的旧备份..."
find "$BACKUP_DIR" -name "db_*.sql" -mtime "+$RETENTION_DAYS" -delete -print 2>/dev/null || true
find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime "+$RETENTION_DAYS" -delete -print 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成"
echo "========================================"
