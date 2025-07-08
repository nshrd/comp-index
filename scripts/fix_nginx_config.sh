#!/bin/bash

# Скрипт для исправления nginx конфигурации
# Устраняет предупреждения: duplicate MIME type и deprecated http2 directive
# Автор: AI Assistant
# Дата: $(date +%Y-%m-%d)

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Исправление nginx конфигурации${NC}"
echo "======================================"

NGINX_CONFIG="nginx/nginx.conf"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Файл $NGINX_CONFIG не найден${NC}"
    exit 1
fi

# Создаем резервную копию
BACKUP_FILE="$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Создана резервная копия: $BACKUP_FILE${NC}"

# Исправляем deprecated http2 directive
if grep -q "listen.*ssl.*http2" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}🔄 Исправляю deprecated http2 directive...${NC}"
    
    # Просто заменяем "listen 443 ssl http2;" на "listen 443 ssl;" и добавляем "http2 on;"
    sed -i.tmp '
        s/listen 443 ssl http2;/listen 443 ssl;\n        http2 on;/g
    ' "$NGINX_CONFIG"
    
    rm -f "$NGINX_CONFIG.tmp"
    echo -e "${GREEN}✅ Исправлена deprecated http2 directive${NC}"
else
    echo -e "${BLUE}ℹ️ Deprecated http2 directive не найдена${NC}"
fi

# Исправляем duplicate MIME type warning
# Эта проблема возникает из-за того, что в gzip_types указан text/html, но он уже включен по умолчанию
if grep -A 20 "gzip_types" "$NGINX_CONFIG" | grep -q "text/html"; then
    echo -e "${YELLOW}🔄 Исправляю duplicate MIME type...${NC}"
    
    # Удаляем text/html из gzip_types (он включен по умолчанию)
    sed -i.tmp '/gzip_types$/,/;$/{
        /text\/html/d
    }' "$NGINX_CONFIG"
    
    rm -f "$NGINX_CONFIG.tmp"
    echo -e "${GREEN}✅ Исправлена duplicate MIME type${NC}"
else
    echo -e "${BLUE}ℹ️ Duplicate MIME type не найдена${NC}"
fi

# Проверяем синтаксис конфигурации
echo -e "${YELLOW}🔍 Проверка синтаксиса nginx...${NC}"
if docker compose exec nginx nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Синтаксис nginx корректен${NC}"
    
    # Перезагружаем nginx
    echo -e "${YELLOW}🔄 Перезагрузка nginx...${NC}"
    docker compose exec nginx nginx -s reload
    echo -e "${GREEN}✅ Nginx перезагружен${NC}"
else
    echo -e "${RED}❌ Ошибка в конфигурации nginx${NC}"
    echo "Восстанавливаю резервную копию..."
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    echo -e "${YELLOW}⚠️ Конфигурация восстановлена из резервной копии${NC}"
    exit 1
fi

echo
echo -e "${GREEN}🎉 Nginx конфигурация исправлена успешно!${NC}"
echo "Теперь можно протестировать:"
echo "curl -I http://localhost"
echo "make debug-server" 