#!/bin/bash

# SSL Setup Script for charts.expert using DNS-01 Challenge
# Получение SSL сертификата Let's Encrypt через DNS записи

set -e

DOMAIN="charts.expert"
EMAIL="admin@charts.expert"  # Замените на ваш email
SSL_CERT_PATH="/etc/ssl/certs"
SSL_KEY_PATH="/etc/ssl/private"

echo "🔒 Настройка SSL сертификата для домена: $DOMAIN (DNS-01 метод)"

# Проверка наличия docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден. Установите Docker."
    exit 1
fi

# Создание директорий для сертификатов
echo "📁 Создание директорий для сертификатов..."
sudo mkdir -p $SSL_CERT_PATH
sudo mkdir -p $SSL_KEY_PATH

# Удаление проблемных директорий, если они существуют
echo "🧹 Очистка проблемных директорий..."
sudo rm -rf $SSL_CERT_PATH/charts.expert.crt/
sudo rm -rf $SSL_KEY_PATH/charts.expert.key/

echo "🌐 Запуск DNS-01 challenge..."
echo "⚠️  ВНИМАНИЕ: Вам нужно будет добавить TXT записи в DNS!"

# Запуск certbot в ручном режиме DNS (используем более новую версию)
sudo docker run --rm -it \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot:v2.11.0 \
  certonly \
  --manual \
  --preferred-challenges dns \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --domains $DOMAIN,www.$DOMAIN \
  --cert-name $DOMAIN \
  --manual-public-ip-logging-ok

echo ""
echo "📋 Копирование сертификатов..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_CERT_PATH/charts.expert.crt
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_KEY_PATH/charts.expert.key
    
    # Установка правильных прав доступа
    sudo chown root:root $SSL_CERT_PATH/charts.expert.crt $SSL_KEY_PATH/charts.expert.key
    sudo chmod 644 $SSL_CERT_PATH/charts.expert.crt
    sudo chmod 600 $SSL_KEY_PATH/charts.expert.key
    
    echo "✅ SSL сертификат успешно получен и установлен!"
    echo "📝 Теперь запустите приложение: docker-compose up -d"
    
    # Проверка сертификата
    echo "🔍 Информация о сертификате:"
    openssl x509 -in $SSL_CERT_PATH/charts.expert.crt -text -noout | grep -A 2 Validity
else
    echo "❌ Сертификат не был создан. Проверьте логи выше."
    exit 1
fi 