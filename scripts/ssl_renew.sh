#!/bin/bash

# SSL Renewal Script for charts.expert
# Автоматическое обновление SSL сертификата Let's Encrypt

set -e

DOMAIN="charts.expert"
SSL_CERT_PATH="/etc/ssl/certs"
SSL_KEY_PATH="/etc/ssl/private"
WEBROOT_PATH="/tmp/letsencrypt-webroot"
COMPOSE_FILE="$(dirname "$(realpath "$0")")/../docker-compose.yml"
LOG_FILE="/var/log/letsencrypt-renewal.log"

# Логирование
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🔄 Запуск процедуры обновления SSL сертификата для $DOMAIN"

# Проверка существования сертификата
if [ ! -f "$SSL_CERT_PATH/charts.expert.crt" ]; then
    log "❌ Сертификат не найден. Сначала запустите ssl_setup.sh"
    exit 1
fi

# Проверка срока действия сертификата (обновляем за 30 дней до истечения)
if openssl x509 -checkend 2592000 -noout -in "$SSL_CERT_PATH/charts.expert.crt"; then
    log "✅ Сертификат действителен более 30 дней. Обновление не требуется."
    exit 0
fi

log "⚠️  Сертификат истекает в течение 30 дней. Запуск обновления..."

# Создание директории для webroot
mkdir -p $WEBROOT_PATH

# Временная остановка nginx
log "🛑 Остановка nginx для обновления сертификата..."
cd "$(dirname "$COMPOSE_FILE")"
docker-compose stop nginx

# Запуск временного nginx для challenge
log "🚀 Запуск временного nginx для ACME challenge..."
cat > /tmp/nginx_renewal.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root $WEBROOT_PATH;
        }
        
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
}
EOF

docker run -d --name nginx-renewal \
    -p 80:80 \
    -v /tmp/nginx_renewal.conf:/etc/nginx/nginx.conf:ro \
    -v $WEBROOT_PATH:$WEBROOT_PATH \
    nginx:1.25-alpine

# Ожидание запуска nginx
sleep 5

# Обновление сертификата
log "🔐 Обновление сертификата Let's Encrypt..."
if docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt:rw \
    -v $WEBROOT_PATH:/var/www/html \
    certbot/certbot:latest \
    renew \
    --webroot \
    --webroot-path=/var/www/html \
    --cert-name $DOMAIN \
    --deploy-hook "echo 'Certificate renewed successfully'"; then
    
    log "✅ Сертификат успешно обновлен"
    
    # Копирование обновленных сертификатов
    log "📋 Копирование обновленных сертификатов..."
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_CERT_PATH/charts.expert.crt
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_KEY_PATH/charts.expert.key
    
    # Установка правильных прав доступа
    sudo chown root:root $SSL_CERT_PATH/charts.expert.crt $SSL_KEY_PATH/charts.expert.key
    sudo chmod 644 $SSL_CERT_PATH/charts.expert.crt
    sudo chmod 600 $SSL_KEY_PATH/charts.expert.key
    
    RENEWAL_SUCCESS=true
else
    log "❌ Ошибка при обновлении сертификата"
    RENEWAL_SUCCESS=false
fi

# Остановка временного nginx
log "🛑 Остановка временного nginx..."
docker stop nginx-renewal
docker rm nginx-renewal

# Очистка временных файлов
rm -f /tmp/nginx_renewal.conf
rm -rf $WEBROOT_PATH

# Перезапуск основного приложения
log "🚀 Перезапуск приложения..."
docker-compose up -d nginx

if [ "$RENEWAL_SUCCESS" = true ]; then
    log "✅ Процедура обновления SSL сертификата завершена успешно"
    
    # Проверка доступности сайта
    sleep 10
    if curl -k https://$DOMAIN/health &> /dev/null; then
        log "✅ Сайт доступен по HTTPS"
    else
        log "⚠️  Внимание: сайт может быть недоступен по HTTPS"
    fi
else
    log "❌ Обновление сертификата не удалось"
    exit 1
fi 