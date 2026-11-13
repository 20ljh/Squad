#!/usr/bin/env bash
# 이 PC에서 실행: 웹 이미지를 빌드해 VM에 올리고 다시 띄움
#   bash infra/deploy.sh            (이미지 + 설정 파일)
#   bash infra/deploy.sh --config   (설정 파일만, 이미지 빌드 없이)
# 필요: Docker Desktop, ~/.ssh/squad_azure, VM의 /opt/squad/.env (infra/env.prod.example 참고, 비밀값이라 직접 올림)
set -euo pipefail
HOST="${DEPLOY_HOST:-azureuser@squad-dku.eastasia.cloudapp.azure.com}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/squad_azure}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST")

"${SSH[@]}" "mkdir -p /opt/squad/nginx"
scp -i "$KEY" "$ROOT/infra/docker-compose.prod.yml" "$ROOT/infra/init-letsencrypt.sh" "$HOST:/opt/squad/"
scp -i "$KEY" "$ROOT/infra/nginx/default.conf.template" "$HOST:/opt/squad/nginx/"

if [ "${1:-}" != "--config" ]; then
  echo "== 이미지 빌드 (linux/amd64)"
  docker build --platform linux/amd64 -t squad-web:latest "$ROOT/apps/web"
  echo "== VM으로 보내기"
  docker save squad-web:latest | gzip | "${SSH[@]}" "gunzip | docker load"
fi

echo "== VM에서 다시 띄우기"
"${SSH[@]}" "cd /opt/squad && docker compose -f docker-compose.prod.yml up -d db web && docker image prune -f >/dev/null && docker compose -f docker-compose.prod.yml ps --format 'table {{.Service}}\t{{.Status}}'"
