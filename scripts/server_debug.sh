#!/bin/bash

echo "=== Диагностика сетевых проблем ==="
echo "Время: $(date)"
echo ""

echo "1. Проверка локального доступа к nginx:"
curl -I http://localhost:80 2>/dev/null || echo "❌ HTTP localhost недоступен"
echo ""

echo "2. Проверка внутреннего IP:"
INTERNAL_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$(docker ps -q --filter "ancestor=nginx:1.25-alpine")")
if [ -n "$INTERNAL_IP" ]; then
    echo "Nginx IP: $INTERNAL_IP"
    curl -I "http://$INTERNAL_IP:80" 2>/dev/null || echo "❌ Внутренний IP недоступен"
else
    echo "❌ Не удалось получить IP nginx контейнера"
fi
echo ""

echo "3. Проверка файерволла (ufw):"
sudo ufw status || echo "ufw не установлен"
echo ""

echo "4. Проверка iptables:"
sudo iptables -L INPUT -n | grep -E "(80|443|ACCEPT|DROP|REJECT)" || echo "Нет правил для портов 80/443"
echo ""

echo "5. Проверка nginx процессов:"
docker exec "$(docker ps -q --filter "ancestor=nginx:1.25-alpine")" ps aux | grep nginx
echo ""

echo "6. Проверка nginx конфигурации:"
docker exec "$(docker ps -q --filter "ancestor=nginx:1.25-alpine")" nginx -t 2>&1
echo ""

echo "7. Проверка логов nginx (последние 10 строк):"
docker logs "$(docker ps -q --filter "ancestor=nginx:1.25-alpine")" 2>&1 | tail -10
echo ""

echo "8. Проверка открытых портов на хосте:"
netstat -tuln | grep -E ":80 |:443 " || echo "Порты 80/443 не слушают"
echo ""

echo "9. Проверка внешнего IP сервера:"
curl -s ifconfig.me || echo "Не удалось получить внешний IP"
echo ""

echo "10. Тест локального подключения к портам:"
nc -zv localhost 80 2>&1 | head -1
nc -zv localhost 443 2>&1 | head -1
echo ""

echo "11. Проверка nginx access логов:"
docker exec "$(docker ps -q --filter "ancestor=nginx:1.25-alpine")" tail -5 /var/log/nginx/access.log 2>/dev/null || echo "Нет access логов"
echo ""

echo "12. Проверка nginx error логов:"
docker exec "$(docker ps -q --filter "ancestor=nginx:1.25-alpine")" tail -5 /var/log/nginx/error.log 2>/dev/null || echo "Нет error логов" 