#!/bin/bash

# CBMA14 Index - Diagnostic Script
# Скрипт для диагностики проблем с развертыванием

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Массивы для отслеживания проблем
ERRORS=()
WARNINGS=()
SUCCESSES=()
TOTAL_CHECKS=0

# Функции для цветного вывода
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
    SUCCESSES+=("$1")
    ((TOTAL_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    WARNINGS+=("$1")
    ((TOTAL_CHECKS++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ERRORS+=("$1")
    ((TOTAL_CHECKS++))
}

print_info() {
    echo -e "${CYAN}[i]${NC} $1"
}

# Проверка системной информации
check_system_info() {
    print_header "Системная информация"
    
    echo "Операционная система:"
    if [ -f /etc/os-release ]; then
        cat /etc/os-release | head -3
    fi
    
    echo -e "\nВерсия Docker:"
    docker --version || print_error "Docker не найден"
    
    echo -e "\nВерсия Docker Compose:"
    if docker compose version &> /dev/null; then
        docker compose version
        echo "Команда: docker compose"
    elif command -v docker-compose &> /dev/null; then
        docker-compose --version
        echo "Команда: docker-compose"
    else
        print_error "Docker Compose не найден"
    fi
    
    echo -e "\nОбщая информация о системе:"
    echo "Время: $(date)"
    echo "Загрузка: $(uptime)"
    echo "Память: $(free -h | grep Mem)"
    echo "Диск: $(df -h / | tail -1)"
}

# Проверка Docker контейнеров
check_docker_containers() {
    print_header "Статус Docker контейнеров"
    
    # Определяем команду Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose не найден"
        return 1
    fi
    
    print_info "Используется команда: $DOCKER_COMPOSE_CMD"
    
    echo -e "\nСтатус всех контейнеров:"
    $DOCKER_COMPOSE_CMD ps || print_error "Не удалось получить статус контейнеров"
    
    echo -e "\nЗапущенные Docker контейнеры:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "\nИспользование ресурсов:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# Проверка логов
check_logs() {
    print_header "Логи контейнеров"
    
    # Определяем команду Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose не найден"
        return 1
    fi
    
    echo -e "\n=== Логи Builder ==="
    $DOCKER_COMPOSE_CMD logs --tail=10 builder 2>/dev/null || print_warning "Builder логи недоступны"
    
    echo -e "\n=== Логи UDF ==="
    $DOCKER_COMPOSE_CMD logs --tail=10 udf 2>/dev/null || print_warning "UDF логи недоступны"
    
    echo -e "\n=== Логи Nginx ==="
    $DOCKER_COMPOSE_CMD logs --tail=10 nginx 2>/dev/null || print_warning "Nginx логи недоступны"
}

# Проверка сетевых портов
check_network_ports() {
    print_header "Сетевые порты"
    
    echo "Слушающие порты:"
    netstat -tlnp | grep -E ':80|:443|:8000' || print_warning "Порты 80, 443, 8000 не слушаются"
    
    echo -e "\nПроверка доступности портов:"
    
    # Проверка порта 80
    if curl -s -I http://localhost:80 >/dev/null 2>&1; then
        print_status "Порт 80 доступен"
    else
        print_error "Порт 80 недоступен"
    fi
    
    # Проверка порта 443
    if curl -s -I -k https://localhost:443 >/dev/null 2>&1; then
        print_status "Порт 443 доступен"
    else
        print_error "Порт 443 недоступен"
    fi
    
    # Проверка порта 8000
    if curl -s -I http://localhost:8000 >/dev/null 2>&1; then
        print_status "Порт 8000 (UDF API) доступен"
    else
        print_error "Порт 8000 (UDF API) недоступен"
    fi
}

# Проверка firewall
check_firewall() {
    print_header "Настройки Firewall"
    
    if command -v ufw &> /dev/null; then
        echo "UFW статус:"
        ufw status
    elif command -v firewall-cmd &> /dev/null; then
        echo "Firewalld статус:"
        firewall-cmd --list-all
    else
        print_warning "UFW или firewalld не найден"
    fi
    
    echo -e "\nПравила iptables для портов 80/443:"
    iptables -L INPUT -n | grep -E ':80|:443' || print_info "Специальных правил для 80/443 не найдено"
}

# Проверка SSL сертификатов
check_ssl_certificates() {
    print_header "SSL сертификаты"
    
    if [ -f "/etc/ssl/certs/charts.expert.crt" ]; then
        print_status "Сертификат найден: /etc/ssl/certs/charts.expert.crt"
        
        echo "Информация о сертификате:"
        openssl x509 -in /etc/ssl/certs/charts.expert.crt -text -noout | grep -E "(Subject|Issuer|Not After)"
    else
        print_warning "Сертификат не найден: /etc/ssl/certs/charts.expert.crt"
    fi
    
    if [ -f "/etc/ssl/private/charts.expert.key" ]; then
        print_status "Приватный ключ найден: /etc/ssl/private/charts.expert.key"
        
        echo "Права доступа:"
        ls -la /etc/ssl/private/charts.expert.key
    else
        print_warning "Приватный ключ не найден: /etc/ssl/private/charts.expert.key"
    fi
}

# Проверка файлов данных
check_data_files() {
    print_header "Файлы данных"
    
    echo "Структура директории data:"
    ls -la /opt/cbma14/data/ 2>/dev/null || print_warning "Директория data не найдена"
    
    if [ -f "/opt/cbma14/data/CBMA14.json" ]; then
        print_status "CBMA14.json найден"
        
        echo "Размер файла: $(du -h /opt/cbma14/data/CBMA14.json | cut -f1)"
        echo "Последнее изменение: $(stat -c %y /opt/cbma14/data/CBMA14.json)"
        
        # Проверка содержимого JSON
        if python3 -c "import json; json.load(open('/opt/cbma14/data/CBMA14.json'))" 2>/dev/null; then
            print_status "JSON файл валиден"
        else
            print_error "JSON файл поврежден"
        fi
    else
        print_error "CBMA14.json не найден"
    fi
    
    if [ -f "/opt/cbma14/data/data.json" ]; then
        print_status "data.json найден"
        echo "Размер файла: $(du -h /opt/cbma14/data/data.json | cut -f1)"
    else
        print_error "data.json не найден"
    fi
}

# Проверка DNS
check_dns() {
    print_header "DNS настройки"
    
    echo "Проверка DNS для charts.expert:"
    nslookup charts.expert 2>/dev/null || print_warning "DNS для charts.expert не найден"
    
    echo -e "\nПроверка доступности домена:"
    if ping -c 1 charts.expert >/dev/null 2>&1; then
        print_status "charts.expert доступен"
    else
        print_warning "charts.expert недоступен"
    fi
}

# Проверка API
check_api() {
    print_header "API проверка"
    
    echo "Проверка API статуса:"
    if curl -s http://localhost:8000/api/status 2>/dev/null; then
        print_status "API доступен"
    else
        print_error "API недоступен"
    fi
    
    echo -e "\nПроверка CBMA14 данных:"
    if curl -s "http://localhost:8000/api/history?symbol=CBMA14&resolution=D&from=0&to=$(date +%s)" 2>/dev/null | head -200; then
        print_status "CBMA14 данные доступны"
    else
        print_error "CBMA14 данные недоступны"
    fi
}

# Проверка универсальных модулей (LEGACY - удалено)
# Common модули были удалены и заменены на встроенные решения

# Проверка nginx конфигурации
check_nginx_config() {
    print_header "Nginx конфигурация"
    
    if [ -f "/opt/cbma14/nginx/nginx.conf" ]; then
        print_status "nginx.conf найден"
        
        echo -e "\nПроверка синтаксиса конфигурации:"
        if docker run --rm -v /opt/cbma14/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.25-alpine nginx -t 2>/dev/null; then
            print_status "Конфигурация nginx корректна"
        else
            print_error "Ошибка в конфигурации nginx"
        fi
        
        echo -e "\nServer names в конфигурации:"
        grep -n "server_name" /opt/cbma14/nginx/nginx.conf || print_info "server_name не найден"
        
        echo -e "\nSSL настройки:"
        grep -n "ssl_certificate" /opt/cbma14/nginx/nginx.conf || print_info "SSL не настроен"
    else
        print_error "nginx.conf не найден"
    fi
}

# Подведение итогов диагностики
show_summary() {
    print_header "ИТОГОВЫЙ ОТЧЕТ"
    
    # Статистика
    local error_count=${#ERRORS[@]}
    local warning_count=${#WARNINGS[@]}
    local success_count=${#SUCCESSES[@]}
    
    echo -e "${CYAN}Общая статистика:${NC}"
    echo "  Всего проверок: $TOTAL_CHECKS"
    echo -e "  ${GREEN}✓ Успешно: $success_count${NC}"
    echo -e "  ${YELLOW}! Предупреждения: $warning_count${NC}"
    echo -e "  ${RED}✗ Ошибки: $error_count${NC}"
    echo ""
    
    # Статус системы
    if [ $error_count -eq 0 ] && [ $warning_count -eq 0 ]; then
        echo -e "${GREEN}🎉 СИСТЕМА РАБОТАЕТ ОТЛИЧНО!${NC}"
        echo "Все проверки прошли успешно. CBMA14 Index готов к работе."
    elif [ $error_count -eq 0 ] && [ $warning_count -gt 0 ]; then
        echo -e "${YELLOW}⚠️  СИСТЕМА РАБОТАЕТ С ПРЕДУПРЕЖДЕНИЯМИ${NC}"
        echo "Основная функциональность работает, но есть рекомендации для улучшения."
    elif [ $error_count -gt 0 ]; then
        echo -e "${RED}🚨 ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ!${NC}"
        echo "Система может работать некорректно. Требуется вмешательство."
    fi
    
    echo ""
    
    # Детальный список ошибок
    if [ $error_count -gt 0 ]; then
        echo -e "${RED}🔴 КРИТИЧЕСКИЕ ОШИБКИ:${NC}"
        for i in "${!ERRORS[@]}"; do
            echo -e "  $((i+1)). ${RED}${ERRORS[i]}${NC}"
        done
        echo ""
    fi
    
    # Детальный список предупреждений
    if [ $warning_count -gt 0 ]; then
        echo -e "${YELLOW}🟡 ПРЕДУПРЕЖДЕНИЯ:${NC}"
        for i in "${!WARNINGS[@]}"; do
            echo -e "  $((i+1)). ${YELLOW}${WARNINGS[i]}${NC}"
        done
        echo ""
    fi
    
    # Приоритетные действия
    if [ $error_count -gt 0 ] || [ $warning_count -gt 0 ]; then
        echo -e "${BLUE}🔧 ПРИОРИТЕТНЫЕ ДЕЙСТВИЯ:${NC}"
        
        # Анализ типов ошибок и специфичные рекомендации
        local port_issues=false
        local docker_issues=false
        local ssl_issues=false
        local api_issues=false
        local common_issues=false
        
        for error in "${ERRORS[@]}"; do
            if [[ "$error" == *"порт"* ]] || [[ "$error" == *"недоступен"* ]]; then
                port_issues=true
            fi
            if [[ "$error" == *"контейнер"* ]] || [[ "$error" == *"Docker"* ]]; then
                docker_issues=true
            fi
            if [[ "$error" == *"SSL"* ]] || [[ "$error" == *"сертификат"* ]]; then
                ssl_issues=true
            fi
            if [[ "$error" == *"API"* ]] || [[ "$error" == *"UDF"* ]]; then
                api_issues=true
            fi
            if [[ "$error" == *"common"* ]] || [[ "$error" == *"модул"* ]] || [[ "$error" == *"импорт"* ]]; then
                common_issues=true
            fi
        done
        
        local priority=1
        
        if [ "$docker_issues" = true ]; then
            echo "  $priority. Перезапустить Docker контейнеры:"
            echo "     docker compose down && docker compose up -d --build"
            ((priority++))
        fi
        
        if [ "$port_issues" = true ]; then
            echo "  $priority. Проверить firewall и порты:"
            echo "     ufw allow 80/tcp && ufw allow 443/tcp"
            echo "     netstat -tlnp | grep -E ':80|:443'"
            ((priority++))
        fi
        
        if [ "$ssl_issues" = true ]; then
            echo "  $priority. Проверить SSL сертификаты:"
            echo "     ls -la /etc/ssl/certs/charts.expert.crt"
            echo "     ls -la /etc/ssl/private/charts.expert.key"
            ((priority++))
        fi
        
        if [ "$api_issues" = true ]; then
            echo "  $priority. Проверить API и данные:"
            echo "     docker compose logs udf"
            echo "     curl -I http://localhost:8000/api/status"
            ((priority++))
        fi
        
# Legacy common modules check removed
        
        echo "  $priority. Посмотреть логи для диагностики:"
        echo "     docker compose logs -f"
        echo ""
    fi
}

# Рекомендации по исправлению
show_recommendations() {
    print_header "Общие рекомендации"
    
    echo -e "${YELLOW}Дополнительные команды для устранения проблем:${NC}"
    echo ""
    echo "1. Перезапуск всей системы:"
    echo "   docker compose down && docker compose up -d --build"
    echo ""
    echo "2. Просмотр всех логов:"
    echo "   docker compose logs -f"
    echo ""
    echo "3. Проверка состояния контейнеров:"
    echo "   docker compose ps"
    echo "   docker stats"
    echo ""
    echo "4. Тестирование подключений:"
    echo "   curl -I http://localhost:8000/api/status"
    echo "   curl -I https://charts.expert"
    echo "   curl -I http://charts.expert"
    echo ""
    echo "5. Обновление до последней версии:"
    echo "   cd /opt/cbma14 && git pull origin main"
    echo ""
    echo "6. Полная переустановка:"
    echo "   ./deploy.sh"
    echo ""
    echo "7. Повторная диагностика:"
    echo "   ./diagnose.sh"
}

# Основная функция
main() {
    local quiet_mode=false
    
    # Проверка аргументов
    if [[ "$1" == "--quiet" ]] || [[ "$1" == "-q" ]]; then
        quiet_mode=true
    elif [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        echo "Использование: $0 [опции]"
        echo "Опции:"
        echo "  -q, --quiet    Показать только итоговый отчет"
        echo "  -h, --help     Показать эту справку"
        exit 0
    fi
    
    if [ "$quiet_mode" = false ]; then
        print_header "CBMA14 Index - Диагностика"
        print_info "Время начала: $(date)"
    fi
    
    # Проверка, что скрипт запущен в правильной директории
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Скрипт должен быть запущен из директории /opt/cbma14"
        exit 1
    fi
    
    # Выполнение всех проверок
    if [ "$quiet_mode" = false ]; then
        check_system_info
        echo ""
        check_docker_containers
        echo ""
        check_logs
        echo ""
        check_network_ports
        echo ""
        check_firewall
        echo ""
        check_ssl_certificates
        echo ""
        check_data_files
        echo ""
        check_dns
        echo ""
        check_api
        echo ""
        check_nginx_config
        echo ""
    else
        # В тихом режиме выполняем проверки без вывода
        check_system_info >/dev/null 2>&1
        check_docker_containers >/dev/null 2>&1
        check_logs >/dev/null 2>&1
        check_network_ports >/dev/null 2>&1
        check_firewall >/dev/null 2>&1
        check_ssl_certificates >/dev/null 2>&1
        check_data_files >/dev/null 2>&1
        check_dns >/dev/null 2>&1
        check_api >/dev/null 2>&1
        check_nginx_config >/dev/null 2>&1
    fi
    
    # Всегда показываем итоговый отчет
    show_summary
    
    if [ "$quiet_mode" = false ]; then
        echo ""
        show_recommendations
        print_info "Время окончания: $(date)"
    fi
    
    # Финальный статус
    local error_count=${#ERRORS[@]}
    if [ $error_count -eq 0 ]; then
        if [ "$quiet_mode" = false ]; then
            print_header "✅ ДИАГНОСТИКА ЗАВЕРШЕНА УСПЕШНО"
        fi
        exit 0
    else
        if [ "$quiet_mode" = false ]; then
            print_header "❌ ДИАГНОСТИКА ВЫЯВИЛА $error_count ОШИБОК"
        fi
        exit 1
    fi
}

# Запуск
main "$@" 