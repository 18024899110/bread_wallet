#!/usr/bin/env bash
# EUDI Wallet — AWS EC2 one-click deploy script
# Usage: bash deploy.sh [key-pair-name] [region]
# Example: bash deploy.sh my-key ap-southeast-2
set -euo pipefail

KEY_NAME="${1:-eudi-key}"
REGION="${2:-ap-southeast-2}"
INSTANCE_TYPE="t2.micro"   # AWS Free Tier — 1 GB RAM + swap
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║    EUDI Issuer — AWS Deploy          ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. 检查工具 ─────────────────────────────────────────────────────────────
for cmd in aws ssh scp rsync; do
  command -v "$cmd" &>/dev/null || { echo "ERROR: $cmd not found. Install it first."; exit 1; }
done

# ── 2. 检查 AWS 认证 ────────────────────────────────────────────────────────
aws sts get-caller-identity --region "$REGION" &>/dev/null || {
  echo "ERROR: AWS CLI not authenticated. Run: aws configure"
  exit 1
}

# ── 3. 获取/创建 Key Pair ───────────────────────────────────────────────────
KEY_FILE="$HOME/.ssh/${KEY_NAME}.pem"
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
  echo "Creating key pair: $KEY_NAME"
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --query 'KeyMaterial' \
    --output text \
    --region "$REGION" > "$KEY_FILE"
  chmod 400 "$KEY_FILE"
  echo "  Key saved to: $KEY_FILE"
else
  echo "Using existing key pair: $KEY_NAME"
  [ -f "$KEY_FILE" ] || { echo "ERROR: Key file $KEY_FILE not found locally."; exit 1; }
fi

# ── 4. Security Group ───────────────────────────────────────────────────────
SG_NAME="eudi-issuer-sg"
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' \
  --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  echo "Creating security group: $SG_NAME"
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "EUDI Issuer ports" \
    --region "$REGION" \
    --query 'GroupId' --output text)

  for PORT in 22 80 4000 7002; do
    aws ec2 authorize-security-group-ingress \
      --group-id "$SG_ID" \
      --protocol tcp --port "$PORT" --cidr 0.0.0.0/0 \
      --region "$REGION" &>/dev/null
  done
  echo "  Security group created: $SG_ID (ports 22,80,4000,7002 open)"
else
  echo "Using existing security group: $SG_ID"
fi

# ── 5. 获取最新 Ubuntu 22.04 AMI ────────────────────────────────────────────
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
            "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text --region "$REGION")
echo "Using AMI: $AMI_ID (Ubuntu 22.04)"

# ── 6. 启动 EC2 ─────────────────────────────────────────────────────────────
echo "Launching EC2 instance ($INSTANCE_TYPE)..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=eudi-issuer}]' \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' --output text)

echo "  Instance ID: $INSTANCE_ID"
echo "  Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

EC2_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text --region "$REGION")
echo "  Public IP: $EC2_IP"

# ── 7. 更新 .env.prod ────────────────────────────────────────────────────────
sed -i.bak \
  "s|WALTID_PUBLIC_URL=.*|WALTID_PUBLIC_URL=http://${EC2_IP}:7002|" \
  "$PROJECT_DIR/.env.prod"
sed -i.bak \
  "s|FRONTEND_URL=.*|FRONTEND_URL=http://${EC2_IP}|" \
  "$PROJECT_DIR/.env.prod"
echo "  .env.prod updated with EC2 IP"

# ── 8. 等 SSH 就绪 ───────────────────────────────────────────────────────────
echo "  Waiting for SSH to become available..."
for i in $(seq 1 30); do
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$KEY_FILE" \
    "ubuntu@${EC2_IP}" "echo ok" &>/dev/null && break
  sleep 6
done

# ── 9. 安装 Docker + 开启 2GB Swap（t2.micro 内存不足时用）────────────────────
echo "Installing Docker + swap on EC2..."
ssh -o StrictHostKeyChecking=no -i "$KEY_FILE" "ubuntu@${EC2_IP}" bash <<'REMOTE'
set -e
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
sudo systemctl enable docker

# 2 GB swap（walt.id JVM 需要）
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
  sudo sysctl -p
fi
REMOTE

# ── 10. 上传项目文件 ──────────────────────────────────────────────────────────
echo "Uploading project files..."
rsync -az --progress \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_FILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='moving_wallet' \
  --exclude='data' \
  --exclude='*.rar' \
  --exclude='*.pdf' \
  --exclude='*.docx' \
  "$PROJECT_DIR/" \
  "ubuntu@${EC2_IP}:/home/ubuntu/eudi/"

# 上传 .env.prod
scp -o StrictHostKeyChecking=no -i "$KEY_FILE" \
  "$PROJECT_DIR/.env.prod" \
  "ubuntu@${EC2_IP}:/home/ubuntu/eudi/.env"

# ── 11. 远程启动 ──────────────────────────────────────────────────────────────
echo "Starting services on EC2..."
ssh -o StrictHostKeyChecking=no -i "$KEY_FILE" "ubuntu@${EC2_IP}" bash <<'REMOTE'
set -e
cd /home/ubuntu/eudi
sudo docker compose -f docker-compose.prod.yml --env-file .env up -d --build
sudo docker compose -f docker-compose.prod.yml ps
REMOTE

# ── 12. 完成 ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Deploy complete!                                    ║"
echo "╠══════════════════════════════════════════════════════╣"
printf  "║  Issuer Frontend  →  http://%-24s║\n" "${EC2_IP}/"
printf  "║  Issuer API       →  http://%-24s║\n" "${EC2_IP}:4000/api"
printf  "║  Walt.id Issuer   →  http://%-24s║\n" "${EC2_IP}:7002"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Wallet .env — update moving_wallet/.env:            ║"
printf  "║  EXPO_PUBLIC_ISSUER_API_URL=http://%-18s║\n" "${EC2_IP}:4000"
printf  "║  EXPO_PUBLIC_WALTID_WALLET_URL=http://%-15s║\n" "${EC2_IP}:7001"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "SSH:  ssh -i $KEY_FILE ubuntu@${EC2_IP}"
echo "Logs: ssh -i $KEY_FILE ubuntu@${EC2_IP} 'cd eudi && sudo docker compose -f docker-compose.prod.yml logs -f'"
