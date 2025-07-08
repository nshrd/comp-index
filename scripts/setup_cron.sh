#!/bin/bash

# Cron Setup Script for SSL Certificate Renewal
# Настройка автоматического обновления SSL сертификата

set -e

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
RENEWAL_SCRIPT="$SCRIPT_DIR/ssl_renew.sh"
CRON_LOG="/var/log/letsencrypt-cron.log"

echo "⏰ Настройка автоматического обновления SSL сертификата"

# Проверка существования скрипта обновления
if [ ! -f "$RENEWAL_SCRIPT" ]; then
    echo "❌ Скрипт обновления $RENEWAL_SCRIPT не найден"
    exit 1
fi

# Создание лог-файла
sudo touch $CRON_LOG
sudo chmod 644 $CRON_LOG

# Создание cron задачи (проверка каждый день в 3:00 утра)
CRON_ENTRY="0 3 * * * $RENEWAL_SCRIPT >> $CRON_LOG 2>&1"

echo "📅 Добавление cron задачи для обновления сертификата..."
echo "   Время проверки: каждый день в 3:00 утра"
echo "   Команда: $CRON_ENTRY"

# Добавление задачи в crontab
(crontab -l 2>/dev/null | grep -v "$RENEWAL_SCRIPT" || true; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron задача успешно добавлена"

# Просмотр текущих cron задач
echo "📋 Текущие cron задачи:"
crontab -l | grep -E "(ssl_renew|letsencrypt)" || echo "   (нет задач SSL)"

# Создание logrotate конфигурации для логов
echo "📝 Настройка ротации логов..."
sudo tee /etc/logrotate.d/letsencrypt-renewal > /dev/null << EOF
$CRON_LOG {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 644 root root
}
EOF

echo "✅ Настройка завершена!"
echo ""
echo "📚 Полезные команды:"
echo "   Просмотр логов: sudo tail -f $CRON_LOG"
echo "   Просмотр cron задач: crontab -l"
echo "   Ручное обновление: $RENEWAL_SCRIPT"
echo "   Проверка сертификата: openssl x509 -in /etc/ssl/certs/charts.expert.crt -text -noout" 