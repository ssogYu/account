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

echo "============================================"
echo "  Account Server - 服务器初始化脚本"
echo "============================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
    log_error "请使用 root 用户运行此脚本"
    exit 1
fi

log_step "1. 更新系统包"
apt-get update -y && apt-get upgrade -y
log_info "系统包更新完成"

log_step "2. 安装基础依赖"
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release
log_info "基础依赖安装完成"

log_step "3. 安装 Docker"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh
    systemctl enable docker
    systemctl start docker
    log_info "Docker 安装完成"
else
    log_info "Docker 已安装，跳过"
fi

log_step "4. 安装 Docker Compose"
if ! docker compose version &> /dev/null 2>&1; then
    log_warn "Docker Compose 插件未安装，尝试安装"
    apt-get install -y docker-compose-plugin
    log_info "Docker Compose 安装完成"
else
    log_info "Docker Compose 已安装，跳过"
fi

log_step "5. 配置防火墙"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log_info "防火墙配置完成"

log_step "6. 配置时区"
timedatectl set-timezone Asia/Shanghai
log_info "时区已设置为 Asia/Shanghai"

log_step "7. 创建应用目录"
mkdir -p /srv/ai-account/{deploy/nginx/ssl,backups}
log_info "应用目录创建完成"

log_step "8. 配置系统参数"
cat >> /etc/sysctl.conf << 'EOF'

net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 1024
net.ipv4.ip_local_port_range = 1024 65000
vm.swappiness = 10
EOF
sysctl -p
log_info "系统参数配置完成"

echo ""
echo "============================================"
log_info "服务器初始化完成!"
echo ""
log_info "下一步:"
echo "  1. 将项目代码上传到 /srv/ai-account/"
echo "  2. 配置 deploy/.env.production"
echo "  3. 配置 SSL 证书到 deploy/nginx/ssl/"
echo "  4. 运行 deploy/scripts/deploy.sh"
echo "============================================"