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

# Функции для цветного вывода
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
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

# Рекомендации по исправлению
show_recommendations() {
    print_header "Рекомендации по исправлению"
    
    echo -e "${YELLOW}Если обнаружены проблемы, попробуйте:${NC}"
    echo ""
    echo "1. Перезапуск контейнеров:"
    echo "   docker compose down && docker compose up -d --build"
    echo ""
    echo "2. Проверка логов:"
    echo "   docker compose logs -f"
    echo ""
    echo "3. Проверка firewall:"
    echo "   ufw allow 80/tcp && ufw allow 443/tcp"
    echo ""
    echo "4. Проверка SSL сертификатов:"
    echo "   ls -la /etc/ssl/certs/charts.expert.crt"
    echo "   ls -la /etc/ssl/private/charts.expert.key"
    echo ""
    echo "5. Тестирование API:"
    echo "   curl -I http://localhost:8000/api/status"
    echo ""
    echo "6. Проверка доступности сайта:"
    echo "   curl -I http://64.226.108.150"
    echo "   curl -I http://charts.expert"
    echo ""
    echo "7. Обновление системы:"
    echo "   cd /opt/cbma14 && git pull origin main"
    echo ""
    echo "8. Полная переустановка:"
    echo "   ./deploy.sh"
}

# Основная функция
main() {
    print_header "CBMA14 Index - Диагностика"
    print_info "Время начала: $(date)"
    
    # Проверка, что скрипт запущен в правильной директории
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Скрипт должен быть запущен из директории /opt/cbma14"
        exit 1
    fi
    
    # Выполнение всех проверок
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
    show_recommendations
    
    print_info "Время окончания: $(date)"
    print_header "Диагностика завершена"
}

# Запуск
main "$@" 