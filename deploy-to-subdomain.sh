#!/bin/bash

# CBMA14 Chart - Deploy to test.charts.expert
# Скрипт для деплоя на субдомен

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Основная функция подготовки деплоя
prepare_static_deploy() {
    print_header "CBMA14 Chart - Подготовка для test.charts.expert"
    
    # Проверка существования папки deploy/static
    if [ ! -d "deploy/static" ]; then
        print_error "Папка deploy/static не найдена. Запустите сначала подготовку файлов."
        exit 1
    fi
    
    cd deploy/static
    
    # Создание README для деплоя
    print_status "Создание README для деплоя..."
    cat > README_DEPLOY.md << 'EOF'
# CBMA14 Chart - Деплой на test.charts.expert

## Структура файлов для загрузки

```
├── index.html              # Главная страница
├── websocket_test.html     # Тестовая страница WebSocket
├── *.js                   # JavaScript модули (15 файлов)
├── data/                  # Данные графиков
│   ├── data.json         # Основные данные CBMA14
│   ├── CBMA14.json       # Индекс CBMA14
│   └── [инструменты]/    # Папки с данными инструментов
└── README_DEPLOY.md      # Эта инструкция
```

## Инструкции по загрузке

1. **Загрузка через FTP/SFTP:**
   - Загрузите все файлы в корневую папку субдомена test.charts.expert
   - Убедитесь что index.html находится в корне
   - Сохраните структуру папок (особенно data/)

2. **Загрузка через cPanel File Manager:**
   - Зайдите в File Manager
   - Перейдите в папку public_html для субдомена
   - Загрузите все файлы, сохранив структуру

3. **Загрузка через GitHub Pages (альтернатива):**
   - Создайте репозиторий для субдомена
   - Загрузите файлы в репозиторий
   - Настройте GitHub Pages

## Проверка работы

После загрузки:
1. Откройте https://test.charts.expert/
2. Проверьте загрузку графика
3. Протестируйте переключение инструментов
4. Проверьте работу индикаторов

## Требования к хостингу

- **Статичный хостинг** с поддержкой:
  - HTML5
  - JavaScript (ES6+)
  - CORS для загрузки JSON файлов
  - HTTPS (рекомендуется)

## Размер проекта

- **Общий размер:** ~2.5 MB
- **JS файлы:** ~400 KB
- **Данные:** ~2 MB
- **HTML:** ~130 KB

## Обновление

Для обновления:
1. Запустите `bash deploy-to-subdomain.sh`
2. Загрузите обновленные файлы
3. Проверьте работу

EOF

    # Создание .htaccess для корректной работы
    print_status "Создание .htaccess..."
    cat > .htaccess << 'EOF'
# CBMA14 Chart - Apache Configuration

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

# Защита от direct access к служебным файлам
<Files "README_DEPLOY.md">
    Order allow,deny
    Deny from all
</Files>

# Redirect для совместимости
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]

EOF

    # Создание простого nginx.conf для справки
    print_status "Создание nginx.conf для справки..."
    cat > nginx.conf.example << 'EOF'
# Пример конфигурации Nginx для test.charts.expert

server {
    listen 80;
    listen 443 ssl;
    server_name test.charts.expert;
    
    root /var/www/test.charts.expert;
    index index.html;
    
    # CORS заголовки
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;
    
    # Кэширование
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(json)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Основная локация
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript;
}

EOF

    # Размер проекта
    TOTAL_SIZE=$(du -sh . | cut -f1)
    print_status "Общий размер проекта: $TOTAL_SIZE"
    
    # Количество файлов
    FILE_COUNT=$(find . -type f | wc -l)
    print_status "Количество файлов: $FILE_COUNT"
    
    cd ../..
    
    # Создание архива для удобной загрузки
    print_status "Создание архива для загрузки..."
    cd deploy
    zip -r "cbma14-chart-static-$(date +%Y%m%d_%H%M%S).zip" static/ -x "*.DS_Store"
    cd ..
    
    ARCHIVE_NAME=$(ls deploy/cbma14-chart-static-*.zip | tail -1)
    ARCHIVE_SIZE=$(ls -lh "$ARCHIVE_NAME" | cut -d' ' -f5)
    
    print_header "🎉 Подготовка завершена!"
    echo ""
    echo -e "${GREEN}✅ Статичные файлы готовы для test.charts.expert${NC}"
    echo ""
    echo "📁 Папка для деплоя: deploy/static/"
    echo "📦 Архив для загрузки: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "   1. Скачайте архив: $ARCHIVE_NAME"
    echo "   2. Распакуйте на хостинге test.charts.expert"
    echo "   3. Убедитесь что index.html в корне субдомена"
    echo "   4. Проверьте: https://test.charts.expert/"
    echo ""
    echo "📋 Файлы для загрузки:"
    echo "   • index.html (главная страница)"
    echo "   • 15 JavaScript модулей"
    echo "   • Папка data/ с данными графиков"
    echo "   • .htaccess (настройки Apache)"
    echo "   • README_DEPLOY.md (инструкция)"
    echo ""
    echo "⚙️ Технические требования:"
    echo "   • Статичный хостинг с поддержкой HTML5/JS"
    echo "   • CORS для JSON файлов"
    echo "   • HTTPS (рекомендуется)"
    echo ""
    echo "🔗 URL после деплоя: https://test.charts.expert/"
}

# Функция для создания FTP скрипта
create_ftp_script() {
    print_header "Создание FTP скрипта"
    
    cat > deploy/ftp-upload.sh << 'EOF'
#!/bin/bash

# FTP Upload Script for test.charts.expert
# Замените переменные на ваши данные

FTP_HOST="your-ftp-server.com"
FTP_USER="your-username"
FTP_PASS="your-password"
FTP_DIR="/public_html/test.charts.expert/"  # или другая папка субдомена

echo "🚀 Загрузка файлов на test.charts.expert..."

ftp -n $FTP_HOST << EOF
user $FTP_USER $FTP_PASS
binary
cd $FTP_DIR

# Удаляем старые файлы (опционально)
# mdelete *.js
# mdelete *.html

# Загружаем HTML файлы
put index.html
put websocket_test.html

# Загружаем JS файлы
mput *.js

# Загружаем .htaccess
put .htaccess

# Создаем папку data и загружаем данные
mkdir data
cd data
lcd data
mput *

# Загружаем подпапки
mkdir dxy
cd dxy
lcd dxy
mput *
cd ..
lcd ..

mkdir spx
cd spx
lcd spx
mput *
cd ..
lcd ..

# Повторяем для всех папок...
# (добавьте другие папки по необходимости)

quit
EOF

echo "✅ Загрузка завершена!"
echo "🔗 Проверьте: https://test.charts.expert/"

EOF
    
    chmod +x deploy/ftp-upload.sh
    print_status "FTP скрипт создан: deploy/ftp-upload.sh"
    print_warning "Отредактируйте FTP данные в deploy/ftp-upload.sh перед использованием"
}

# Главная функция
main() {
    case "${1:-}" in
        "ftp")
            create_ftp_script
            ;;
        "clean")
            print_status "Очистка папки deploy..."
            rm -rf deploy/
            print_status "Папка deploy очищена"
            ;;
        "help"|"-h"|"--help")
            echo "Использование: $0 [команда]"
            echo "Команды:"
            echo "  (по умолчанию) - Подготовка статичных файлов"
            echo "  ftp           - Создание FTP скрипта"
            echo "  clean         - Очистка папки deploy"
            echo "  help          - Показать эту справку"
            ;;
        *)
            prepare_static_deploy
            ;;
    esac
}

# Запуск
main "$@" 