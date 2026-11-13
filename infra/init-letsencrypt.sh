#!/bin/sh
# 처음 한 번: HTTPS 인증서 발급 (VM의 /opt/squad 에서 실행)
# 인증서가 없으면 nginx가 켜지지 않으므로, 임시 인증서로 nginx를 띄운 뒤 진짜 인증서로 바꿈
set -eu
cd "$(dirname "$0")"
. ./.env
: "${DOMAIN:?.env에 DOMAIN이 없어요}"
LIVE="certbot/conf/live/$DOMAIN"
DC="docker compose -f docker-compose.prod.yml"

if [ -f "$LIVE/fullchain.pem" ] && [ ! -f "$LIVE/.dummy" ]; then
  echo "이미 인증서가 있어요: $LIVE"
  exit 0
fi

echo "1) 임시 인증서 만들기"
mkdir -p "$LIVE" certbot/www
$DC run --rm --entrypoint sh certbot -c "openssl req -x509 -nodes -newkey rsa:2048 -days 1 -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj /CN=localhost && touch /etc/letsencrypt/live/$DOMAIN/.dummy"

echo "2) nginx 켜기"
$DC up -d nginx

echo "3) 임시 인증서를 치우고 Let's Encrypt에서 발급"
$DC run --rm --entrypoint sh certbot -c "rm -r /etc/letsencrypt/live/$DOMAIN"
$DC run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --register-unsafely-without-email --agree-tos --non-interactive

echo "4) nginx 다시 읽기"
$DC exec nginx nginx -s reload
$DC up -d certbot
echo "완료: https://$DOMAIN"
