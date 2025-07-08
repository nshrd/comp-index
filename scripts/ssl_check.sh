#!/bin/bash

# SSL Prerequisites Check Script
# Проверка предварительных условий для получения SSL сертификата

set -e

DOMAIN="charts.expert"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Проверка предварительных условий для получения SSL сертификата"
echo "Домен: $DOMAIN"
echo ""

# Переменные для отслеживания ошибок
HAS_ERRORS=false

# Функция для проверки
check_requirement() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    printf "%-40s" "$name"
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        if [ -n "$expected" ]; then
            echo "   Ожидается: $expected"
        fi
        HAS_ERRORS=true
        return 1
    fi
}

# Проверка установленных утилит
echo "📦 Проверка установленных утилит:"
check_requirement "Docker" "command -v docker" "sudo apt install docker.io"
check_requirement "Docker Compose" "command -v docker-compose" "sudo apt install docker-compose"
check_requirement "OpenSSL" "command -v openssl" "sudo apt install openssl"
check_requirement "Curl" "command -v curl" "sudo apt install curl"
check_requirement "sudo права" "sudo -n true" "Добавьте пользователя в группу sudo"

echo ""

# Проверка сетевых условий
echo "🌐 Проверка сетевых условий:"
check_requirement "DNS резолюция ($DOMAIN)" "nslookup $DOMAIN" "Настройте DNS записи"
check_requirement "Доступность порта 80" "sudo ss -tulpn | grep ':80 '" "Освободите порт 80"
check_requirement "Доступность порта 443" "sudo ss -tulpn | grep ':443 '" "Освободите порт 443"

echo ""

# Проверка доступности Let's Encrypt
echo "🔐 Проверка доступности Let's Encrypt:"
check_requirement "Доступность ACME API" "curl -s https://acme-v02.api.letsencrypt.org/directory" "Проверьте интернет соединение"

echo ""

# Проверка файловой системы
echo "📁 Проверка файловой системы:"
check_requirement "Директория /etc/ssl/certs" "test -d /etc/ssl/certs" "sudo mkdir -p /etc/ssl/certs"
check_requirement "Директория /etc/ssl/private" "test -d /etc/ssl/private" "sudo mkdir -p /etc/ssl/private"
check_requirement "Права записи в /etc/ssl" "sudo test -w /etc/ssl" "sudo chmod 755 /etc/ssl"

echo ""

# Проверка Docker
echo "🐳 Проверка Docker:"
check_requirement "Docker сервис запущен" "systemctl is-active docker" "sudo systemctl start docker"
check_requirement "Docker доступен без sudo" "docker ps" "sudo usermod -aG docker $USER && newgrp docker"

echo ""

# Проверка существующих сертификатов
echo "📜 Проверка существующих сертификатов:"
if [ -f "/etc/ssl/certs/charts.expert.crt" ]; then
    echo -e "${YELLOW}⚠️  Существующий сертификат найден${NC}"
    echo "   Срок действия:"
    openssl x509 -in /etc/ssl/certs/charts.expert.crt -text -noout | grep -A 2 Validity | sed 's/^/   /'
    
    if openssl x509 -checkend 86400 -noout -in /etc/ssl/certs/charts.expert.crt; then
        echo -e "   ${GREEN}✓ Сертификат действителен более 24 часов${NC}"
    else
        echo -e "   ${RED}⚠️  Сертификат истекает в течение 24 часов${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Сертификат не найден (это нормально для первой настройки)${NC}"
fi

echo ""

# Проверка конфигурации приложения
echo "⚙️  Проверка конфигурации приложения:"
check_requirement "docker-compose.yml существует" "test -f docker-compose.yml"
check_requirement "nginx конфигурация существует" "test -f nginx/nginx.conf"
check_requirement "Скрипт ssl_setup.sh существует" "test -f scripts/ssl_setup.sh"

echo ""

# Финальная проверка
if [ "$HAS_ERRORS" = true ]; then
    echo -e "${RED}❌ Обнаружены проблемы. Устраните их перед получением сертификата.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Все предварительные условия выполнены!${NC}"
    echo ""
    echo "🚀 Для получения SSL сертификата запустите:"
    echo "   ./scripts/ssl_setup.sh"
    echo ""
    echo "📝 Или используйте Makefile:"
    echo "   make ssl-setup"
    exit 0
fi 