#!/bin/bash

# CBMA Index - Production Deployment Script
# Скрипт для быстрого развертывания на VPS

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Проверка root прав
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Этот скрипт должен быть запущен с правами root"
        exit 1
    fi
}

# Проверка системы
check_system() {
    print_header "Проверка системы"
    
    # Проверка ОС
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_status "Операционная система: $PRETTY_NAME"
    else
        print_error "Неподдерживаемая операционная система"
        exit 1
    fi
    
    # Проверка архитектуры
    ARCH=$(uname -m)
    if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "amd64" ]; then
        print_warning "Архитектура $ARCH может не поддерживаться"
    fi
    
    print_status "Архитектура: $ARCH"
}

# Установка зависимостей
install_dependencies() {
    print_header "Установка зависимостей"
    
    # Обновление пакетов
    print_status "Обновление списка пакетов..."
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y curl git software-properties-common
    elif command -v yum &> /dev/null; then
        yum update -y
        yum install -y curl git epel-release
    else
        print_error "Неподдерживаемый менеджер пакетов"
        exit 1
    fi
    
    # Установка Docker
    if ! command -v docker &> /dev/null; then
        print_status "Установка Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl start docker
        systemctl enable docker
        rm get-docker.sh
    else
        print_status "Docker уже установлен"
    fi
    
    # Установка Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_status "Установка Docker Compose..."
        if command -v apt-get &> /dev/null; then
            # Пробуем установить новый plugin
            apt-get install -y docker-compose-plugin 2>/dev/null || {
                # Если не получается, устанавливаем старый docker-compose
                print_status "Установка старого docker-compose..."
                curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
            }
        elif command -v yum &> /dev/null; then
            yum install -y docker-compose-plugin 2>/dev/null || {
                print_status "Установка старого docker-compose..."
                curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
            }
        fi
    else
        print_status "Docker Compose уже установлен"
    fi
    
    # Определение команды Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose не найден"
        exit 1
    fi
    
    # Проверка установки
    docker --version
    $DOCKER_COMPOSE_CMD version
}

# Настройка firewall
setup_firewall() {
    print_header "Настройка firewall"
    
    if command -v ufw &> /dev/null; then
        print_status "Настройка UFW..."
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        print_status "Настройка firewalld..."
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --reload
    else
        print_warning "Firewall не найден, настройте порты вручную"
    fi
}

# Определение базовой директории проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="$(basename "$SCRIPT_DIR")"
BACKUP_DIR="/opt/backups/$PROJECT_NAME"

# Клонирование репозитория
clone_repository() {
    print_header "Клонирование репозитория"
    
    # Определяем целевую директорию
    DEFAULT_DIR="$(pwd)"
    read -r -p "Введите путь для установки (по умолчанию: $DEFAULT_DIR): " USER_INSTALL_DIR
    INSTALL_DIR="${USER_INSTALL_DIR:-$DEFAULT_DIR}"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Обновление существующего репозитория в $INSTALL_DIR..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_status "Клонирование репозитория в $INSTALL_DIR..."
        git clone https://github.com/nshrd/comp-index.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    # Права доступа
    chown -R 1000:1000 "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/deploy.sh"
    
    # Экспортируем для других функций
    export INSTALL_DIR
}

# Создание конфигурации
create_config() {
    print_header "Создание конфигурации"
    
    # Создание .env и .env.prod файлов
    if [ ! -f ".env" ]; then
        print_status "Создание .env файла..."
        cat > .env << EOF
# CBMA Index - Environment Variables
DOMAIN=your-domain.com
COINGLASS_API_KEY=your_coinglass_api_key_here
UDF_HOST=0.0.0.0
UDF_PORT=8000
FLASK_ENV=production
SSL_EMAIL=admin@your-domain.com
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=60
WATCHTOWER_CLEANUP=true
LOG_LEVEL=INFO
CORS_ORIGINS=*
EOF
    fi
    
    # Создаем также .env.prod для совместимости
    if [ ! -f ".env.prod" ]; then
        print_status "Создание .env.prod файла..."
        cp .env .env.prod
        print_warning "Отредактируйте .env файл с вашими настройками (или .env.prod для production)"
    fi
    
    # Создание директорий
    mkdir -p logs/nginx data
    chown -R 1000:1000 logs data
}

# Запуск приложения
start_application() {
    print_header "Запуск приложения"
    
    # Определение команды Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose не найден"
        exit 1
    fi
    
    print_status "Используется команда: $DOCKER_COMPOSE_CMD"
    
    # Остановка существующих контейнеров
    print_status "Остановка существующих контейнеров..."
    $DOCKER_COMPOSE_CMD -f docker-compose.yml down 2>/dev/null || true
    
    # Запуск в production режиме
    print_status "Запуск в production режиме..."
    $DOCKER_COMPOSE_CMD --env-file .env -f docker-compose.yml up -d --build
    
    # Ожидание запуска
    print_status "Ожидание запуска сервисов..."
    sleep 10
    
    # Проверка статуса
    $DOCKER_COMPOSE_CMD -f docker-compose.yml ps
}

# Настройка SSL (опционально)
setup_ssl() {
    print_header "Настройка SSL"
    
    read -p "Настроить SSL сертификат? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -r -p "Введите ваш домен: " DOMAIN
        read -r -p "Введите ваш email: " EMAIL
        
        if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
            print_error "Домен и email не могут быть пустыми"
            return 1
        fi
        
        # Получение SSL сертификата
        print_status "Получение SSL сертификата для $DOMAIN..."
        docker run -it --rm \
            -v cbma_certbot_data:/etc/letsencrypt \
            -v cbma_certbot_www:/var/www/certbot \
            certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN"
        
        # Обновление nginx конфигурации
        sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf
        
        # Перезапуск nginx
        $DOCKER_COMPOSE_CMD -f docker-compose.yml restart nginx
        
        print_status "SSL сертификат установлен для $DOMAIN"
    fi
}

# Создание скриптов обслуживания
create_maintenance_scripts() {
    print_header "Создание скриптов обслуживания"
    
    # Скрипт бэкапа
    cat > /usr/local/bin/cbma-backup << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

# Ищем директорию проекта
if [ -f "/opt/cbma/docker-compose.yml" ]; then
    INSTALL_DIR="/opt/cbma"
elif [ -f "/opt/cbma/docker-compose.yml" ]; then
    INSTALL_DIR="/opt/cbma"
else
    # Ищем в стандартных местах
    for dir in /opt/*/docker-compose.yml; do
        if [ -f "\$dir" ] && grep -q "cbma" "\$dir"; then
            INSTALL_DIR="\$(dirname "\$dir")"
            break
        fi
    done
fi

if [ -z "\$INSTALL_DIR" ] || [ ! -d "\$INSTALL_DIR" ]; then
    echo "Ошибка: Директория проекта не найдена"
    exit 1
fi

PROJECT_NAME="\$(basename "\$INSTALL_DIR")"
BACKUP_DIR="/opt/backups/\$PROJECT_NAME"

mkdir -p \$BACKUP_DIR
cd \$INSTALL_DIR

# Бэкап данных
tar -czf \$BACKUP_DIR/data_\$DATE.tar.gz data/
tar -czf \$BACKUP_DIR/logs_\$DATE.tar.gz logs/

# Удаление старых бэкапов
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: \$DATE"
echo "Project directory: \$INSTALL_DIR"
echo "Backup directory: \$BACKUP_DIR"
EOF
    
    # Скрипт обновления
    cat > /usr/local/bin/cbma-update << EOF
#!/bin/bash
# Автоопределение директории проекта
if [ -f "/opt/cbma/docker-compose.yml" ]; then
    INSTALL_DIR="/opt/cbma"
elif [ -f "/opt/cbma/docker-compose.yml" ]; then
    INSTALL_DIR="/opt/cbma"
else
    # Ищем в стандартных местах
    for dir in /opt/*/docker-compose.yml; do
        if [ -f "\$dir" ] && grep -q "cbma" "\$dir"; then
            INSTALL_DIR="\$(dirname "\$dir")"
            break
        fi
    done
fi

if [ -z "\$INSTALL_DIR" ] || [ ! -d "\$INSTALL_DIR" ]; then
    echo "Ошибка: Директория проекта не найдена"
    exit 1
fi

cd \$INSTALL_DIR

# Определение команды Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "Docker Compose не найден"
    exit 1
fi

echo "Обновление проекта в: \$INSTALL_DIR"

# Обновление кода
git pull origin main

# Обновление контейнеров
\$DOCKER_COMPOSE_CMD -f docker-compose.yml pull
\$DOCKER_COMPOSE_CMD -f docker-compose.yml up -d --build

# Очистка старых образов
docker image prune -f

echo "Update completed: \$(date)"
EOF
    
    # Скрипт мониторинга
    cat > /usr/local/bin/cbma-status << EOF
#!/bin/bash
# Автоопределение директории проекта
if [ -f "/opt/cbma/docker-compose.yml" ]; then
    INSTALL_DIR="/opt/cbma"
elif [ -f "/opt/cbma/docker-compose.yml" ]; then
    INSTALL_DIR="/opt/cbma"
else
    # Ищем в стандартных местах
    for dir in /opt/*/docker-compose.yml; do
        if [ -f "\$dir" ] && grep -q "cbma" "\$dir"; then
            INSTALL_DIR="\$(dirname "\$dir")"
            break
        fi
    done
fi

if [ -z "\$INSTALL_DIR" ] || [ ! -d "\$INSTALL_DIR" ]; then
    echo "Ошибка: Директория проекта не найдена"
    exit 1
fi

cd \$INSTALL_DIR

# Определение команды Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "Docker Compose не найден"
    exit 1
fi

echo "=== CBMA Index Status ==="
echo "Project directory: \$INSTALL_DIR"
\$DOCKER_COMPOSE_CMD -f docker-compose.yml ps
echo ""
echo "=== Resource Usage ==="
docker stats --no-stream
echo ""
echo "=== Logs (last 20 lines) ==="
\$DOCKER_COMPOSE_CMD -f docker-compose.yml logs --tail=20
EOF
    
    # Права выполнения
    chmod +x /usr/local/bin/cbma-*
    
    # Добавление в cron
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cbma-backup") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * 0 /usr/local/bin/cbma-update") | crontab -
    
    print_status "Скрипты обслуживания созданы:"
    print_status "  - cbma-backup  (бэкап)"
    print_status "  - cbma-update  (обновление)"
    print_status "  - cbma-status  (статус)"
}

# Проверка Docker сервисов
check_docker_services() {
    print_header "Проверка Docker сервисов"
    
    # Определение команды Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose не найден"
        exit 1
    fi
    
    print_status "Используется команда: $DOCKER_COMPOSE_CMD"
    
    # Проверка статуса сервисов
    print_status "Статус Docker сервисов:"
    $DOCKER_COMPOSE_CMD -f docker-compose.yml ps
    
    # Проверка логов если есть проблемы
    if ! $DOCKER_COMPOSE_CMD -f docker-compose.yml ps | grep -q "Up"; then
        print_warning "Некоторые сервисы не запущены. Показываю логи:"
        $DOCKER_COMPOSE_CMD -f docker-compose.yml logs --tail=20
    fi
}

# Настройка SSL для Docker Nginx
setup_ssl_docker() {
    print_header "Настройка SSL для Docker Nginx"
    
    read -p "Настроить SSL сертификат для charts.expert? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -r -p "Введите ваш email: " EMAIL
        
        if [ -z "$EMAIL" ]; then
            print_error "Email не может быть пустым"
            return 1
        fi
        
        # Создаем директории для SSL
        mkdir -p ssl/live/charts.expert
        
        # Получение сертификата через Docker
        print_status "Получение SSL сертификата для charts.expert..."
        if docker run --rm \
            -v "$(pwd)/ssl:/etc/letsencrypt" \
            -v "$(pwd)/src/chart:/var/www/certbot" \
            -p 80:80 \
            certbot/certbot certonly \
            --standalone \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d charts.expert -d www.charts.expert; then
            # Обновляем nginx конфигурацию для SSL
            print_status "Обновление nginx конфигурации для SSL..."
            
            # Создаем SSL версию nginx.conf
            cp nginx/nginx.conf nginx/nginx-ssl.conf
            
            # Перезапуск с SSL
            print_status "Перезапуск Docker стека с SSL..."
            docker compose down
            docker compose up -d
            
            print_status "SSL сертификат успешно установлен для charts.expert"
        else
            print_error "Ошибка получения SSL сертификата"
            return 1
        fi
    fi
}

# Показ информации о развертывании
show_deployment_info() {
    print_header "Развертывание завершено!"
    
    IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo -e "${GREEN}✅ CBMA Index успешно развернут на charts.expert!${NC}"
    echo ""
    echo "🌐 Ваш сайт доступен по адресу:"
    echo "   📊 Основной: https://charts.expert"
    echo "   📊 Альт: https://www.charts.expert" 
    echo "   🔗 IP: http://$IP"
    echo ""
    echo "🔧 Полезные команды:"
    echo "   docker compose ps                           # Статус контейнеров"
    echo "   docker compose logs                         # Логи всех сервисов"
    echo "   docker compose logs nginx                   # Логи Nginx"
    echo "   docker compose logs udf                     # Логи API"
    echo "   cbma-status                               # Быстрый статус"
    echo "   cbma-backup                               # Бэкап"
    echo "   cbma-update                               # Обновление"
    echo ""
    echo "🐳 Docker сервисы:"
    echo "   📊 Frontend: Nginx контейнер (порт 80/443)"
    echo "   📡 API: UDF сервер (порт 8000)"
    echo "   🔧 Builder: Генератор индекса"
    echo ""
    echo "📁 Файлы проекта:"
    echo "   🗂️  Исходники: ${INSTALL_DIR:-$(pwd)}/src/chart/"
    echo "   ⚙️  Nginx конфиг: ${INSTALL_DIR:-$(pwd)}/nginx/nginx.conf"
    echo "   📋 Docker логи: docker compose logs"
    echo ""
    echo "🔒 SSL сертификат:"
    if [ -d "ssl/live/charts.expert" ]; then
        echo "   ✅ SSL активен в Docker"
    else
        echo "   ⚠️  SSL не настроен - запустите: bash deploy.sh ssl"
    fi
    echo ""
    echo "📊 Архитектура:"
    echo "   🐳 Полностью в Docker контейнерах"
    echo "   📈 Данные: JSON/CSV + API через Docker"
    echo "   🌐 Nginx проксирует к UDF API"
    echo ""
    echo "🔄 Обновление:"
    echo "   1. git pull origin main (в ${INSTALL_DIR:-$(pwd)}/)"
    echo "   2. bash deploy.sh update"
    echo "   3. Проверьте: https://charts.expert/"
}

# Основная функция
main() {
    print_header "CBMA Index - Docker Deployment for charts.expert"
    
    # Проверка аргументов
    case "${1:-}" in
        "ssl")
            cd "${INSTALL_DIR:-$(pwd)}" 2>/dev/null || cd "${INSTALL_DIR:-$(pwd)}"
            setup_ssl_docker
            exit 0
            ;;
        "check")
            cd "${INSTALL_DIR:-$(pwd)}"
            check_docker_services
            exit 0
            ;;
        "update")
            cd "${INSTALL_DIR:-$(pwd)}"
            /usr/local/bin/cbma-update 2>/dev/null || {
                print_status "Обновление кода..."
                git pull origin main
                print_status "Перезапуск Docker контейнеров..."
                docker compose down
                docker compose up -d --build
                print_status "Обновление завершено"
            }
            exit 0
            ;;
        "status")
            cd "${INSTALL_DIR:-$(pwd)}"
            /usr/local/bin/cbma-status 2>/dev/null || {
                echo "=== CBMA Docker Status ==="
                echo "Project directory: $(pwd)"
                if command -v docker &> /dev/null; then
                    docker compose ps 2>/dev/null || echo "Docker not running"
                    echo ""
                    echo "=== Resource Usage ==="
                    docker stats --no-stream 2>/dev/null || echo "No containers running"
                else
                    echo "Docker not available"
                fi
                echo ""
                echo "Site check: $(curl -s -o /dev/null -w '%{http_code}' http://localhost/ || echo 'N/A')"
            }
            exit 0
            ;;
        "backup")
            /usr/local/bin/cbma-backup 2>/dev/null || {
                DATE=$(date +%Y%m%d_%H%M%S)
                PROJECT_NAME="$(basename "$(pwd)")"
                BACKUP_DIR="/opt/backups/$PROJECT_NAME"
                mkdir -p "$BACKUP_DIR"
                tar -czf "$BACKUP_DIR/${PROJECT_NAME}_docker_$DATE.tar.gz" . --exclude=logs --exclude=.git 2>/dev/null
                print_status "Backup completed: ${PROJECT_NAME}_docker_$DATE.tar.gz"
            }
            exit 0
            ;;
        "help"|"-h"|"--help")
            echo "Использование: $0 [команда]"
            echo "Команды:"
            echo "  (default)     - Полное развертывание через Docker"
            echo "  check         - Проверка статуса Docker сервисов"
            echo "  ssl           - Настройка SSL сертификата"
            echo "  update        - Обновление приложения"
            echo "  status        - Проверка статуса"
            echo "  backup        - Создание бэкапа"
            echo "  help          - Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  bash deploy.sh           # Полная установка Docker"
            echo "  bash deploy.sh check     # Проверить Docker сервисы"
            echo "  bash deploy.sh ssl       # Настроить HTTPS"
            exit 0
            ;;
    esac
    
    # Полное развертывание
    check_root
    check_system
    install_dependencies
    setup_firewall
    clone_repository
    create_config
    
    # Запускаем Docker стек
    start_application
    
    # Проверяем статус сервисов
    check_docker_services
    
    create_maintenance_scripts
    show_deployment_info
}

# Запуск основной функции
main "$@" 