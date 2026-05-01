#!/bin/bash
# EUDI Issuer — EC2 User Data bootstrap script
# Paste this into AWS Console > Launch Instance > Advanced > User Data
set -e
exec > /var/log/eudi-deploy.log 2>&1

# ── 1. 系统更新 + 工具 ────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y git curl unzip

# ── 2. 安装 Docker ─────────────────────────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# ── 3. 开启 2GB Swap（walt.id JVM 需要）────────────────────────────────────────
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p

# ── 4. 占位：项目文件由你手动上传（见步骤四）─────────────────────────────────
mkdir -p /home/ubuntu/eudi
chown ubuntu:ubuntu /home/ubuntu/eudi

echo "Bootstrap complete. Upload project files then run: cd /home/ubuntu/eudi && sudo docker compose -f docker-compose.prod.yml --env-file .env up -d --build"
