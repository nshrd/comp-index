#!/bin/bash

# Скрипт для синхронизации изменений с GitHub Pages

echo "🔄 Синхронизация файлов для GitHub Pages..."

# Копируем index.html из src/chart/ в корень
echo "📁 Копирование index.html..."
cp src/chart/index.html index.html

# Проверяем, есть ли изменения
if ! git diff --quiet index.html; then
    echo "✨ Обнаружены изменения в index.html"
    
    # Добавляем и коммитим изменения
    git add index.html
    git commit -m "Auto-sync: Update GitHub Pages index.html from src/chart/"
    
    # Пушим в GitHub
    echo "🚀 Отправка изменений в GitHub..."
    git push origin main
    
    echo "✅ GitHub Pages обновлены!"
    echo "🌐 Доступно по адресу: https://nshrd.github.io/comp-index/"
else
    echo "ℹ️  Изменений в index.html не обнаружено"
fi

echo "🏁 Синхронизация завершена!" 