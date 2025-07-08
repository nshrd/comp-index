#!/bin/bash

# SSL Setup Script for charts.expert
# Получение и настройка SSL сертификата Let's Encrypt

set -e

DOMAIN="charts.expert"
EMAIL="admin@charts.expert"  # Замените на ваш email
NGINX_CONF_PATH="./nginx/nginx.conf"
SSL_CERT_PATH="/etc/ssl/certs"
SSL_KEY_PATH="/etc/ssl/private"
WEBROOT_PATH="/tmp/letsencrypt-webroot"

echo "🔒 Настройка SSL сертификата для домена: $DOMAIN"

# Проверка наличия docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не найден. Установите Docker Compose."
    exit 1
fi

# Создание директорий для сертификатов
echo "📁 Создание директорий для сертификатов..."
sudo mkdir -p $SSL_CERT_PATH
sudo mkdir -p $SSL_KEY_PATH
sudo mkdir -p $WEBROOT_PATH

# Временно создаем самоподписанный сертификат для nginx
echo "📜 Создание временного самоподписанного сертификата..."
if [ ! -f "$SSL_CERT_PATH/charts.expert.crt" ]; then
    sudo openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout "$SSL_KEY_PATH/charts.expert.key" \
        -out "$SSL_CERT_PATH/charts.expert.crt" \
        -subj "/CN=$DOMAIN"
fi

# Создание временной конфигурации nginx для challenge
echo "⚙️  Создание временной конфигурации nginx..."
cat > /tmp/nginx_letsencrypt.conf << EOF
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

# Остановка существующего nginx контейнера
echo "🛑 Остановка существующего nginx..."
docker-compose down nginx || true

# Запуск временного nginx для challenge
echo "🚀 Запуск временного nginx для получения сертификата..."
docker run -d --name nginx-letsencrypt \
    -p 80:80 \
    -v /tmp/nginx_letsencrypt.conf:/etc/nginx/nginx.conf:ro \
    -v $WEBROOT_PATH:$WEBROOT_PATH \
    nginx:1.25-alpine

# Ожидание запуска nginx
sleep 5

# Получение сертификата с помощью certbot
echo "🔐 Получение сертификата Let's Encrypt..."
docker run --rm \
    -v $SSL_CERT_PATH:/etc/letsencrypt/live:rw \
    -v $SSL_KEY_PATH:/etc/letsencrypt/keys:rw \
    -v $WEBROOT_PATH:/var/www/html \
    certbot/certbot:latest \
    certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN,www.$DOMAIN \
    --cert-name $DOMAIN

# Остановка временного nginx
echo "🛑 Остановка временного nginx..."
docker stop nginx-letsencrypt
docker rm nginx-letsencrypt

# Копирование сертификатов в нужные места
echo "📋 Копирование сертификатов..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_CERT_PATH/charts.expert.crt
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_KEY_PATH/charts.expert.key

# Установка правильных прав доступа
sudo chown root:root $SSL_CERT_PATH/charts.expert.crt $SSL_KEY_PATH/charts.expert.key
sudo chmod 644 $SSL_CERT_PATH/charts.expert.crt
sudo chmod 600 $SSL_KEY_PATH/charts.expert.key

# Очистка временных файлов
rm -f /tmp/nginx_letsencrypt.conf
sudo rm -rf $WEBROOT_PATH

echo "✅ SSL сертификат успешно получен и установлен!"
echo "📝 Теперь запустите приложение: docker-compose up -d"
echo "🔄 Не забудьте настроить автоматическое обновление сертификата!" 