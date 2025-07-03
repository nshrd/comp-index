#!/bin/bash

# CBMA14 Index - Production Deployment Script
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

# Клонирование репозитория
clone_repository() {
    print_header "Клонирование репозитория"
    
    INSTALL_DIR="/opt/cbma14"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Обновление существующего репозитория..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_status "Клонирование репозитория..."
        git clone https://github.com/nshrd/comp-index.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    # Права доступа
    chown -R 1000:1000 "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/deploy.sh"
}

# Создание конфигурации
create_config() {
    print_header "Создание конфигурации"
    
    # Создание .env и .env.prod файлов
    if [ ! -f ".env" ]; then
        print_status "Создание .env файла..."
        cat > .env << EOF
# CBMA14 Index - Environment Variables
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
        read -p "Введите ваш домен: " DOMAIN
        read -p "Введите ваш email: " EMAIL
        
        if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
            print_error "Домен и email не могут быть пустыми"
            return 1
        fi
        
        # Получение SSL сертификата
        print_status "Получение SSL сертификата для $DOMAIN..."
        docker run -it --rm \
            -v cbma14_certbot_data:/etc/letsencrypt \
            -v cbma14_certbot_www:/var/www/certbot \
            certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN"
        
        # Обновление nginx конфигурации
        sed -i "s/your-domain.com/$DOMAIN/g" nginx/prod.conf
        
        # Перезапуск nginx
        $DOCKER_COMPOSE_CMD -f docker-compose.yml restart nginx
        
        print_status "SSL сертификат установлен для $DOMAIN"
    fi
}

# Создание скриптов обслуживания
create_maintenance_scripts() {
    print_header "Создание скриптов обслуживания"
    
    # Скрипт бэкапа
    cat > /usr/local/bin/cbma14-backup << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/cbma14"
INSTALL_DIR="/opt/cbma14"

mkdir -p $BACKUP_DIR
cd $INSTALL_DIR

# Бэкап данных
tar -czf $BACKUP_DIR/data_$DATE.tar.gz data/
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz logs/

# Удаление старых бэкапов
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF
    
    # Скрипт обновления
    cat > /usr/local/bin/cbma14-update << 'EOF'
#!/bin/bash
INSTALL_DIR="/opt/cbma14"
cd $INSTALL_DIR

# Определение команды Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "Docker Compose не найден"
    exit 1
fi

# Обновление кода
git pull origin main

# Обновление контейнеров
$DOCKER_COMPOSE_CMD -f docker-compose.yml pull
$DOCKER_COMPOSE_CMD -f docker-compose.yml up -d --build

# Очистка старых образов
docker image prune -f

echo "Update completed: $(date)"
EOF
    
    # Скрипт мониторинга
    cat > /usr/local/bin/cbma14-status << 'EOF'
#!/bin/bash
INSTALL_DIR="/opt/cbma14"
cd $INSTALL_DIR

# Определение команды Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "Docker Compose не найден"
    exit 1
fi

echo "=== CBMA14 Index Status ==="
$DOCKER_COMPOSE_CMD -f docker-compose.yml ps
echo ""
echo "=== Resource Usage ==="
docker stats --no-stream
echo ""
echo "=== Logs (last 20 lines) ==="
$DOCKER_COMPOSE_CMD -f docker-compose.yml logs --tail=20
EOF
    
    # Права выполнения
    chmod +x /usr/local/bin/cbma14-*
    
    # Добавление в cron
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cbma14-backup") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * 0 /usr/local/bin/cbma14-update") | crontab -
    
    print_status "Скрипты обслуживания созданы:"
    print_status "  - cbma14-backup  (бэкап)"
    print_status "  - cbma14-update  (обновление)"
    print_status "  - cbma14-status  (статус)"
}

# Показ информации о развертывании
show_deployment_info() {
    print_header "Развертывание завершено!"
    
    IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo -e "${GREEN}✅ CBMA14 Index успешно развернут!${NC}"
    echo ""
    echo "📊 Ваш сайт доступен по адресу:"
    echo "   🌐 HTTP:  http://$IP"
    echo "   🔒 HTTPS: https://$IP (если SSL настроен)"
    echo ""
    echo "🔧 Полезные команды:"
    echo "   docker compose -f docker-compose.yml ps    # Статус (или docker-compose)"
    echo "   docker compose -f docker-compose.yml logs  # Логи (или docker-compose)"
    echo "   cbma14-status                                   # Быстрый статус"
    echo "   cbma14-backup                                   # Бэкап"
    echo "   cbma14-update                                   # Обновление"
    echo ""
    echo "📝 Следующие шаги:"
    echo "   1. Отредактируйте /opt/cbma14/.env (добавьте ваш COINGLASS_API_KEY)"
    echo "   2. Настройте ваш домен в DNS"
    echo "   3. Запустите SSL: bash deploy.sh ssl"
    echo "   4. Проверьте работу: curl http://$IP/health"
    echo ""
    echo "📚 Подробная документация: /opt/cbma14/VPS_DEPLOYMENT.md"
}

# Основная функция
main() {
    print_header "CBMA14 Index - Production Deployment"
    
    # Проверка аргументов
    case "${1:-}" in
        "ssl")
            cd /opt/cbma14
            setup_ssl
            exit 0
            ;;
        "update")
            cd /opt/cbma14
            /usr/local/bin/cbma14-update
            exit 0
            ;;
        "status")
            cd /opt/cbma14
            /usr/local/bin/cbma14-status
            exit 0
            ;;
        "backup")
            /usr/local/bin/cbma14-backup
            exit 0
            ;;
        "help"|"-h"|"--help")
            echo "Использование: $0 [команда]"
            echo "Команды:"
            echo "  ssl     - Настройка SSL сертификата"
            echo "  update  - Обновление приложения"
            echo "  status  - Проверка статуса"
            echo "  backup  - Создание бэкапа"
            echo "  help    - Показать эту справку"
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
    start_application
    create_maintenance_scripts
    show_deployment_info
}

# Запуск основной функции
main "$@" 