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
UDF_PORT=8001
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

# Создание статичного деплоя для charts.expert
create_static_deploy() {
    print_header "Создание статичного деплоя для charts.expert"
    
    STATIC_DIR="/var/www/charts.expert"
    CHART_SOURCE_DIR="/opt/cbma14/src/chart"
    DATA_SOURCE_DIR="/opt/cbma14/data"
    
    # Создаем директорию для статичного деплоя
    mkdir -p $STATIC_DIR
    mkdir -p $STATIC_DIR/data
    
    # Копируем HTML и JS файлы
    if [ -d "$CHART_SOURCE_DIR" ]; then
        print_status "Копирование HTML и JavaScript файлов..."
        cp $CHART_SOURCE_DIR/*.html $STATIC_DIR/
        cp $CHART_SOURCE_DIR/*.js $STATIC_DIR/
        print_status "Скопировано $(ls -1 $CHART_SOURCE_DIR/*.html $CHART_SOURCE_DIR/*.js 2>/dev/null | wc -l) файлов"
    else
        print_warning "Директория $CHART_SOURCE_DIR не найдена"
    fi
    
    # Копируем данные
    if [ -d "$DATA_SOURCE_DIR" ]; then
        print_status "Копирование данных..."
        cp -r $DATA_SOURCE_DIR/* $STATIC_DIR/data/
        print_status "Данные скопированы в $STATIC_DIR/data/"
    else
        print_warning "Директория $DATA_SOURCE_DIR не найдена"
    fi
    
    # Создаем .htaccess для Apache
    cat > $STATIC_DIR/.htaccess << 'EOF'
# CBMA14 Chart - Apache Configuration for charts.expert

# Включение CORS для JSON файлов
<FilesMatch "\.(json)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
</FilesMatch>

# Кэширование статичных ресурсов
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType application/javascript "access plus 1 day"
    ExpiresByType application/json "access plus 1 hour"
    ExpiresByType text/css "access plus 1 week"
</IfModule>

# Сжатие файлов
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Redirect для совместимости
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]
EOF

    # Устанавливаем права доступа
    chown -R www-data:www-data $STATIC_DIR
    chmod -R 644 $STATIC_DIR/*
    chmod 755 $STATIC_DIR
    find $STATIC_DIR -type d -exec chmod 755 {} \;
    
    print_status "Статичный деплой создан в $STATIC_DIR"
    
    # Показываем размер
    TOTAL_SIZE=$(du -sh $STATIC_DIR | cut -f1)
    FILE_COUNT=$(find $STATIC_DIR -type f | wc -l)
    print_status "Размер: $TOTAL_SIZE, файлов: $FILE_COUNT"
}

# Настройка Nginx для charts.expert
setup_nginx_static() {
    print_header "Настройка Nginx для статичного сайта charts.expert"
    
    # Создаем конфигурацию Nginx для статичного сайта
    cat > /etc/nginx/sites-available/charts.expert << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name charts.expert www.charts.expert;
    
    root /var/www/charts.expert;
    index index.html;
    
    # Логирование
    access_log /var/log/nginx/charts.expert.access.log;
    error_log /var/log/nginx/charts.expert.error.log;
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CORS для JSON файлы
    location ~* \.(json)$ {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
        add_header Cache-Control "public, max-age=300";
    }
    
    # Кэширование статичных файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # Доступ к данным
    location /data/ {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Cache-Control "public, max-age=300";
    }
    
    # API прокси (для Docker backend если есть)
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30;
        proxy_send_timeout 30;
        proxy_read_timeout 30;
    }
    
    # Главная страница
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "charts.expert is healthy\n";
        add_header Content-Type text/plain;
    }
}

# Получение SSL сертификата для charts.expert
setup_ssl_charts_expert() {
    print_header "Настройка SSL для charts.expert"
    
    read -p "Настроить SSL сертификат для charts.expert? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Введите ваш email: " EMAIL
        
        if [ -z "$EMAIL" ]; then
            print_error "Email не может быть пустым"
            return 1
        fi
        
        # Установка Certbot если нет
        if ! command -v certbot &> /dev/null; then
            print_status "Установка Certbot..."
            if command -v apt-get &> /dev/null; then
                apt-get update
                apt-get install -y certbot python3-certbot-nginx
            elif command -v yum &> /dev/null; then
                yum install -y certbot python3-certbot-nginx
            fi
        fi
        
        # Получение сертификата
        print_status "Получение SSL сертификата для charts.expert..."
        certbot --nginx -d charts.expert -d www.charts.expert --email "$EMAIL" --agree-tos --no-eff-email --non-interactive
        
        if [ $? -eq 0 ]; then
            print_status "SSL сертификат успешно установлен для charts.expert"
            
            # Настройка автообновления
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            print_status "Автообновление SSL сертификата настроено"
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
    
    echo -e "${GREEN}✅ CBMA14 Index успешно развернут на charts.expert!${NC}"
    echo ""
    echo "🌐 Ваш сайт доступен по адресу:"
    echo "   📊 Основной: https://charts.expert"
    echo "   📊 Альт: https://www.charts.expert" 
    echo "   🔗 IP: http://$IP"
    echo ""
    echo "🔧 Полезные команды:"
    echo "   docker compose -f docker-compose.yml ps    # Статус Docker (если используется)"
    echo "   docker compose -f docker-compose.yml logs  # Логи Docker"
    echo "   systemctl status nginx                      # Статус Nginx"
    echo "   cbma14-status                               # Быстрый статус"
    echo "   cbma14-backup                               # Бэкап"
    echo "   cbma14-update                               # Обновление"
    echo ""
    echo "📁 Файлы сайта:"
    echo "   🗂️  Статичные файлы: /var/www/charts.expert/"
    echo "   ⚙️  Nginx конфиг: /etc/nginx/sites-available/charts.expert"
    echo "   📋 Логи Nginx: /var/log/nginx/charts.expert.*"
    echo ""
    echo "🔒 SSL сертификат:"
    if [ -f "/etc/letsencrypt/live/charts.expert/fullchain.pem" ]; then
        echo "   ✅ SSL активен"
        echo "   📅 Автообновление: 0 12 * * * (ежедневно в 12:00)"
    else
        echo "   ⚠️  SSL не настроен - запустите: bash deploy.sh ssl"
    fi
    echo ""
    echo "📊 Архитектура:"
    echo "   🎨 Frontend: Статичный HTML/JS с TradingView Charts"
    echo "   📡 API: Docker UDF сервер (опционально для криптовалют)"
    echo "   📈 Данные: JSON/CSV файлы + API для BTC"
    echo ""
    echo "🔄 Обновление:"
    echo "   1. git pull origin main (в /opt/cbma14/)"
    echo "   2. bash deploy.sh update"
    echo "   3. Проверьте: https://charts.expert/"
}

# Основная функция
main() {
    print_header "CBMA14 Index - Production Deployment for charts.expert"
    
    # Проверка аргументов
    case "${1:-}" in
        "ssl")
            cd /opt/cbma14 2>/dev/null || cd /opt/cbma14
            setup_ssl_charts_expert
            exit 0
            ;;
        "static")
            cd /opt/cbma14 2>/dev/null || cd /opt/cbma14
            create_static_deploy
            setup_nginx_static
            print_status "Статичный деплой завершен для charts.expert"
            exit 0
            ;;
        "update")
            cd /opt/cbma14 2>/dev/null || cd /opt/cbma14
            /usr/local/bin/cbma14-update 2>/dev/null || {
                print_status "Обновление кода..."
                git pull origin main
                create_static_deploy
                systemctl reload nginx
                print_status "Обновление завершено"
            }
            exit 0
            ;;
        "status")
            cd /opt/cbma14 2>/dev/null || cd /opt/cbma14
            /usr/local/bin/cbma14-status 2>/dev/null || {
                echo "=== CBMA14 Charts.expert Status ==="
                systemctl status nginx --no-pager
                echo ""
                if command -v docker &> /dev/null; then
                    docker compose ps 2>/dev/null || echo "Docker not running"
                fi
                echo ""
                echo "Site check: $(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "N/A")"
            }
            exit 0
            ;;
        "backup")
            /usr/local/bin/cbma14-backup 2>/dev/null || {
                DATE=$(date +%Y%m%d_%H%M%S)
                BACKUP_DIR="/opt/backups/cbma14"
                mkdir -p $BACKUP_DIR
                tar -czf $BACKUP_DIR/charts_expert_$DATE.tar.gz /var/www/charts.expert/ /opt/cbma14/ 2>/dev/null
                print_status "Backup completed: charts_expert_$DATE.tar.gz"
            }
            exit 0
            ;;
        "help"|"-h"|"--help")
            echo "Использование: $0 [команда]"
            echo "Команды:"
            echo "  (default)     - Полное развертывание Docker + статичный сайт"
            echo "  static        - Только статичный деплой для charts.expert"
            echo "  ssl           - Настройка SSL сертификата"
            echo "  update        - Обновление приложения"
            echo "  status        - Проверка статуса"
            echo "  backup        - Создание бэкапа"
            echo "  help          - Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  bash deploy.sh           # Полная установка"
            echo "  bash deploy.sh static    # Только статичный сайт"
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
    
    # Создаем статичный деплой
    create_static_deploy
    setup_nginx_static
    
    # Запускаем Docker стек (опционально для API)
    print_status "Запуск Docker стека для API..."
    start_application
    
    create_maintenance_scripts
    show_deployment_info
}

# Запуск основной функции
main "$@" 