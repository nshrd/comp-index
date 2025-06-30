#!/bin/bash

# ============================================================================
# Скрипт для настройки cron задачи обновления композитного индекса
# Использование: ./setup_cron.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATER_SCRIPT="$SCRIPT_DIR/run_updater.sh"
LOG_FILE="$SCRIPT_DIR/cron.log"

echo "🔧 Настройка cron задачи для обновления композитного индекса..."

# Проверка существования updater скрипта
if [[ ! -f "$UPDATER_SCRIPT" ]]; then
    echo "❌ Файл $UPDATER_SCRIPT не найден!"
    exit 1
fi

# Делаем скрипт исполняемым
chmod +x "$UPDATER_SCRIPT"

# Создаем cron задачу (каждые 6 часов)
CRON_ENTRY="0 */6 * * * $UPDATER_SCRIPT >> $LOG_FILE 2>&1"

# Проверяем, есть ли уже такая задача
if crontab -l 2>/dev/null | grep -q "$UPDATER_SCRIPT"; then
    echo "⚠️  Cron задача для этого скрипта уже существует!"
    echo "Существующие задачи:"
    crontab -l | grep "$UPDATER_SCRIPT"
    
    read -p "Хотите обновить задачу? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Удаляем старую задачу
        crontab -l | grep -v "$UPDATER_SCRIPT" | crontab -
        echo "✅ Старая задача удалена"
    else
        echo "❌ Отмена. Используйте существующую задачу."
        exit 0
    fi
fi

# Добавляем новую задачу
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron задача добавлена успешно!"
echo "📋 Детали задачи:"
echo "   Расписание: Каждые 6 часов (00:00, 06:00, 12:00, 18:00)"
echo "   Скрипт: $UPDATER_SCRIPT"
echo "   Логи: $LOG_FILE"

echo ""
echo "🔍 Текущие cron задачи:"
crontab -l

echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов: tail -f $LOG_FILE"
echo "   Список задач: crontab -l"
echo "   Удаление задач: crontab -r"
echo "   Редактирование: crontab -e"

echo ""
echo "⚡ Для тестирования запустите: $UPDATER_SCRIPT" 