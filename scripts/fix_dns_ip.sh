#!/bin/bash

# Скрипт для обновления DNS записей
# Автор: AI Assistant
# Дата: $(date +%Y-%m-%d)

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Проверка DNS записей и IP адресов${NC}"
echo "================================================="

# Получаем текущий IP сервера
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Не удалось получить IP")
echo -e "${BLUE}Текущий IP сервера:${NC} $CURRENT_IP"

# Проверяем DNS записи
DNS_IP=$(dig +short charts.expert 2>/dev/null || echo "Не удалось получить DNS")
echo -e "${BLUE}DNS запись для charts.expert:${NC} $DNS_IP"

WWW_DNS_IP=$(dig +short www.charts.expert 2>/dev/null || echo "Не удалось получить DNS")
echo -e "${BLUE}DNS запись для www.charts.expert:${NC} $WWW_DNS_IP"

echo

# Проверяем соответствие
if [ "$CURRENT_IP" = "$DNS_IP" ]; then
    echo -e "${GREEN}✅ DNS записи корректны!${NC}"
    exit 0
else
    echo -e "${RED}❌ DNS записи не соответствуют IP сервера!${NC}"
    echo -e "${YELLOW}Необходимо обновить DNS записи:${NC}"
    echo
    echo "1. Войдите в панель управления DNS провайдера"
    echo "2. Обновите A запись для charts.expert:"
    echo -e "   ${BLUE}charts.expert${NC} → ${GREEN}$CURRENT_IP${NC}"
    echo "3. Обновите A запись для www.charts.expert:"
    echo -e "   ${BLUE}www.charts.expert${NC} → ${GREEN}$CURRENT_IP${NC}"
    echo
    echo "Проверка доступности после обновления DNS:"
    echo "curl -I http://charts.expert"
    echo "curl -I https://charts.expert"
    echo
    echo -e "${YELLOW}Примечание: Изменения DNS могут занять до 24 часов${NC}"
fi

echo
echo "Дополнительная информация:"
echo "========================="
echo "Тест прямого доступа по IP:"
echo "curl -H 'Host: charts.expert' http://$CURRENT_IP"
echo
echo "Проверка SSL сертификата:"
echo "openssl s_client -connect $CURRENT_IP:443 -servername charts.expert -verify_return_error" 