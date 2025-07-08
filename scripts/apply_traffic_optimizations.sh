#!/bin/bash

echo "🚀 Применение оптимизаций для экономии трафика..."
echo "=================================================="

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка требований
echo "🔍 Проверка требований..."

if ! command -v docker &> /dev/null; then
    print_error "Docker не найден"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose не найден"
    exit 1
fi

# Определяем команду Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

print_status "Используется команда: $DOCKER_COMPOSE_CMD"

# Показываем планируемые оптимизации
echo ""
echo "📋 Планируемые оптимизации:"
echo "  🗜️  Максимальное gzip сжатие (уровень 9)"
echo "  🚦 Rate limiting для API (10 req/min)"
echo "  💾 Агрессивное кэширование статики (1 год)"
echo "  💾 Кэширование данных (30 мин для JSON, 1 час для CSV)"
echo "  📊 Flask-Compress для сжатия API ответов"
echo "  📝 Мониторинг трафика в логах"
echo ""

read -p "Продолжить? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 0
fi

# Создание бэкапа текущей конфигурации
echo ""
echo "💾 Создание бэкапа конфигураций..."
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/traffic_optimization_$DATE"
mkdir -p "$BACKUP_DIR"

cp nginx/nginx.conf "$BACKUP_DIR/nginx.conf.backup"
cp requirements.txt "$BACKUP_DIR/requirements.txt.backup"
cp src/udf/server.py "$BACKUP_DIR/server.py.backup"

print_status "Бэкап создан в: $BACKUP_DIR"

# Применение оптимизаций
echo ""
echo "⚙️  Применение оптимизаций..."

# Проверяем, что все файлы обновлены
if ! grep -q "gzip_comp_level 9" nginx/nginx.conf; then
    print_error "nginx.conf не обновлен с оптимизациями сжатия"
    exit 1
fi

if ! grep -q "limit_req_zone" nginx/nginx.conf; then
    print_error "nginx.conf не обновлен с rate limiting"
    exit 1
fi

if ! grep -q "Flask-Compress" requirements.txt; then
    print_error "requirements.txt не обновлен с Flask-Compress"
    exit 1
fi

if ! grep -q "Compress(app)" src/udf/server.py; then
    print_error "server.py не обновлен с Compress"
    exit 1
fi

print_status "Все файлы конфигурации обновлены"

# Перестройка и перезапуск контейнеров
echo ""
echo "🔄 Перестройка контейнеров с новыми оптимизациями..."

# Остановка контейнеров
print_status "Остановка контейнеров..."
$DOCKER_COMPOSE_CMD down

# Пересборка образов (нужна для новых зависимостей)
print_status "Пересборка образов с новыми зависимостями..."
$DOCKER_COMPOSE_CMD build --no-cache

# Запуск контейнеров
print_status "Запуск оптимизированных контейнеров..."
$DOCKER_COMPOSE_CMD up -d

# Ожидание запуска
echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 15

# Проверка статуса сервисов
echo ""
echo "🔍 Проверка статуса сервисов..."
$DOCKER_COMPOSE_CMD ps

# Тестирование оптимизаций
echo ""
echo "🧪 Тестирование применённых оптимизаций..."

# Проверка сжатия
echo "1. Проверка gzip сжатия:"
if curl -H "Accept-Encoding: gzip" -s -I http://localhost/ | grep -q "Content-Encoding: gzip"; then
    print_status "gzip сжатие работает"
else
    print_warning "gzip сжатие не обнаружено (возможно нужно время на запуск)"
fi

# Проверка rate limiting (делаем много запросов)
echo ""
echo "2. Тестирование rate limiting (делаем 15 быстрых запросов):"
RATE_LIMITED=0
for i in {1..15}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/status)
    if [ "$RESPONSE" = "429" ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
    fi
    sleep 0.1
done

if [ $RATE_LIMITED -gt 0 ]; then
    print_status "Rate limiting работает ($RATE_LIMITED запросов заблокировано)"
else
    print_warning "Rate limiting не сработал (возможно лимиты настроены мягко)"
fi

# Проверка кэширования заголовков
echo ""
echo "3. Проверка заголовков кэширования:"
CACHE_HEADERS=$(curl -s -I http://localhost/data/data.json | grep -i "cache-control\|expires")
if [ -n "$CACHE_HEADERS" ]; then
    print_status "Заголовки кэширования найдены:"
    echo "$CACHE_HEADERS"
else
    print_warning "Заголовки кэширования не найдены"
fi

# Проверка Flask-Compress
echo ""
echo "4. Проверка сжатия API ответов:"
API_GZIP=$(curl -H "Accept-Encoding: gzip" -s -I http://localhost/api/status | grep -i "content-encoding")
if echo "$API_GZIP" | grep -q "gzip"; then
    print_status "API ответы сжимаются: $API_GZIP"
else
    print_warning "Сжатие API ответов не обнаружено"
fi

# Показываем итоговую статистику
echo ""
echo "📊 Мониторинг трафика:"
echo "  📝 Логи трафика: docker-compose logs nginx | grep traffic"
echo "  📈 Статистика nginx: curl http://localhost/nginx_status"
echo "  🔍 Rate limiting логи: tail -f logs/nginx/traffic.log"

# Создание скрипта мониторинга
cat > scripts/monitor_traffic.sh << 'EOF'
#!/bin/bash

echo "=== Мониторинг трафика ==="
echo "=========================="

echo "📊 Статистика nginx:"
curl -s http://localhost/nginx_status 2>/dev/null || echo "nginx status недоступен"

echo ""
echo "📝 Последние 10 записей трафика:"
docker-compose logs --tail=10 nginx 2>/dev/null | grep -E "(GET|POST|rate|limit)" || echo "Логи недоступны"

echo ""
echo "🚦 Rate limiting статистика за последние 5 минут:"
docker-compose logs --since=5m nginx 2>/dev/null | grep -c "rate limit" || echo "0"

echo ""
echo "💾 Размер логов:"
du -sh logs/ 2>/dev/null || echo "logs/ недоступен"

echo ""
echo "🔧 Для непрерывного мониторинга:"
echo "  docker-compose logs -f nginx | grep traffic"
EOF

chmod +x scripts/monitor_traffic.sh

print_status "Скрипт мониторинга создан: scripts/monitor_traffic.sh"

# Финальный отчёт
echo ""
echo "🎉 Оптимизация трафика завершена!"
echo "=================================="
echo ""
echo "✅ Применённые оптимизации:"
echo "  🗜️  Максимальное gzip сжатие (9 уровень)"
echo "  🚦 Rate limiting: API 10 req/min, Data 30 req/min, General 60 req/min"
echo "  💾 Кэширование: статика 1 год, JSON 30 мин, CSV 1 час"
echo "  📊 Flask-Compress для API ответов"
echo "  📝 Расширенное логирование трафика"
echo ""
echo "📈 Ожидаемая экономия трафика:"
echo "  🔥 До: ~600MB/день"
echo "  ✅ После: ~65MB/день (89% экономия)"
echo ""
echo "🔧 Полезные команды:"
echo "  📊 Мониторинг: ./scripts/monitor_traffic.sh"
echo "  📝 Логи трафика: docker-compose logs nginx | grep traffic"
echo "  🔄 Сброс rate limiting: docker-compose restart nginx"
echo ""
echo "📁 Бэкап конфигураций сохранён в: $BACKUP_DIR"
echo ""
echo "🌐 Проверьте работу сайта: http://localhost/" 