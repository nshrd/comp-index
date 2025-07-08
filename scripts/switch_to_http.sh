#!/bin/bash

echo "🔄 Переключение на HTTP-only режим..."

# Проверяем что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Ошибка: запустите скрипт из корневой директории проекта"
    exit 1
fi

# Создаем HTTP-only конфигурацию
echo "1. Создание HTTP-only конфигурации..."
./scripts/nginx_http_only.sh

# Останавливаем контейнеры
echo "2. Остановка контейнеров..."
docker compose down

# Бэкапим текущую конфигурацию
echo "3. Создание бэкапа текущей конфигурации..."
cp nginx/nginx.conf nginx/nginx.conf.backup

# Заменяем конфигурацию
echo "4. Применение HTTP-only конфигурации..."
cp nginx/nginx_http_only.conf nginx/nginx.conf

# Обновляем docker-compose.yml для отключения HTTPS порта
echo "5. Обновление docker-compose.yml..."
sed -i.backup 's/443:443/# 443:443 # HTTPS disabled/' docker-compose.yml

# Запускаем контейнеры
echo "6. Запуск контейнеров..."
docker compose up -d

# Ждем запуска
echo "7. Ожидание запуска nginx..."
sleep 10

# Проверяем статус
echo "8. Проверка статуса..."
docker compose ps

# Тестируем доступность
echo "9. Тестирование доступности..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo "✅ HTTP-only режим активирован успешно!"
    echo "🌐 Сайт доступен на http://localhost"
else
    echo "❌ Проблема с доступностью. Проверьте логи:"
    echo "docker logs \$(docker compose ps -q nginx)"
fi

echo ""
echo "Для возврата к HTTPS:"
echo "1. docker compose down"
echo "2. cp nginx/nginx.conf.backup nginx/nginx.conf"
echo "3. cp docker-compose.yml.backup docker-compose.yml"
echo "4. docker compose up -d" 