#!/bin/bash

# CBMA14 Chart - GitHub Pages Deploy
# Быстрый деплой для тестирования

set -e

echo "🚀 CBMA14 Chart - GitHub Pages Deploy"
echo "=================================="

# Проверка что мы в папке deploy
if [ ! -d "static" ]; then
    echo "❌ Ошибка: Запустите скрипт из папки deploy/"
    exit 1
fi

# Проверка Git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен"
    exit 1
fi

echo "📁 Создание GitHub Pages репозитория..."

# Создаем временную папку для GitHub Pages
TEMP_DIR="cbma14-github-pages"
rm -rf $TEMP_DIR
mkdir $TEMP_DIR
cd $TEMP_DIR

# Инициализируем Git
git init
git checkout -b gh-pages

# Копируем файлы
echo "📋 Копирование файлов..."
cp -r ../static/* .

# Создаем README для GitHub Pages
cat > README.md << 'EOF'
# CBMA14 Chart - GitHub Pages

Автоматически сгенерированные файлы для тестирования на GitHub Pages.

🔗 **Доступ**: https://your-username.github.io/cbma14-chart/

## Использование

1. Создайте репозиторий `cbma14-chart` на GitHub
2. Загрузите эти файлы 
3. Включите GitHub Pages (Settings → Pages → Source: gh-pages)
4. Откройте ссылку выше

## Файлы

- `index.html` - Главная страница графика
- `*.js` - JavaScript модули (15 файлов)  
- `data/` - Данные для графиков
- `.htaccess` - Настройки Apache (не используется в GitHub Pages)

Обновлено: $(date)
EOF

# Убираем .htaccess (не нужен для GitHub Pages)
rm -f .htaccess

# Создаем .nojekyll для корректной работы
touch .nojekyll

# Создаем простой 404.html
cat > 404.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>CBMA14 Chart</title>
    <meta http-equiv="refresh" content="0; url=/">
</head>
<body>
    <p>Redirecting to <a href="/">CBMA14 Chart</a>...</p>
</body>
</html>
EOF

# Git команды
echo "📤 Подготовка к коммиту..."
git add .
git commit -m "Initial CBMA14 Chart deployment - $(date)"

echo ""
echo "✅ GitHub Pages файлы готовы!"
echo ""
echo "🚀 Следующие шаги:"
echo "   1. Создайте репозиторий на GitHub (например: cbma14-chart)"
echo "   2. Выполните команды:"
echo "      git remote add origin https://github.com/USERNAME/cbma14-chart.git"
echo "      git push -u origin gh-pages"
echo "   3. Включите GitHub Pages (Settings → Pages → Source: gh-pages)"
echo "   4. Ваш сайт: https://USERNAME.github.io/cbma14-chart/"
echo ""
echo "📁 Файлы готовы в: deploy/$TEMP_DIR/"
echo ""

# Показываем размер
SIZE=$(du -sh . | cut -f1)
FILES=$(find . -type f | wc -l)
echo "📊 Статистика: $FILES файлов, $SIZE"

cd ..
echo "🏁 Готово! Перейдите в deploy/$TEMP_DIR/ для загрузки на GitHub." 