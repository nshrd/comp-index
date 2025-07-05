# 🚀 Деплой CBMA14 Chart на test.charts.expert

## 📋 Подготовленные файлы

Код уже подготовлен для деплоя на субдомен `test.charts.expert`:

```
deploy/
├── cbma14-chart-static-YYYYMMDD_HHMMSS.zip  # Архив для загрузки (953KB)
├── static/                                   # Папка со статичными файлами  
│   ├── index.html                           # Главная страница
│   ├── *.js (15 файлов)                     # JavaScript модули
│   ├── data/                                # Данные графиков (2.7MB)
│   ├── .htaccess                            # Apache настройки
│   └── README_DEPLOY.md                     # Инструкция
├── ftp-upload.sh                            # FTP скрипт (нужно отредактировать)
└── github-pages-deploy.sh                  # GitHub Pages альтернатива
```

## 🎯 Варианты деплоя

### 1. 📦 **Прямая загрузка архива (Рекомендуется)**

1. **Скачайте архив**: `deploy/cbma14-chart-static-*.zip`
2. **Зайдите в панель управления** хостингом для `test.charts.expert`
3. **Найдите папку субдомена** (обычно `/public_html/test/` или `/test.charts.expert/`)
4. **Загрузите и распакуйте архив**
5. **Убедитесь что `index.html` в корне** субдомена
6. **Откройте**: https://test.charts.expert/

### 2. 🔧 **FTP загрузка**

```bash
# 1. Отредактируйте FTP данные
nano deploy/ftp-upload.sh

# 2. Исправьте:
FTP_HOST="your-ftp-server.com"     # Ваш FTP сервер
FTP_USER="your-username"           # FTP логин  
FTP_PASS="your-password"           # FTP пароль
FTP_DIR="/public_html/test/"       # Папка субдомена

# 3. Запустите загрузку
cd deploy/static/
bash ../ftp-upload.sh
```

### 3. 🐙 **GitHub Pages (для тестирования)**

```bash
# 1. Перейдите в папку deploy
cd deploy/

# 2. Создайте GitHub Pages версию
chmod +x github-pages-deploy.sh
./github-pages-deploy.sh

# 3. Загрузите на GitHub
cd cbma14-github-pages/
git remote add origin https://github.com/USERNAME/cbma14-chart.git
git push -u origin gh-pages

# 4. Включите GitHub Pages в настройках репозитория
```

## ⚙️ Требования к хостингу

### ✅ **Обязательно**
- Статичный хостинг с поддержкой HTML5/JavaScript
- Возможность загружать файлы через FTP/cPanel
- Поддержка .htaccess (для Apache) или возможность настройки CORS

### 🎯 **Рекомендуется**  
- **HTTPS** поддержка
- **CORS** заголовки для JSON файлов
- **Gzip** сжатие для ускорения
- **CDN** для глобального доступа

## 🔧 Настройка хостинга

### **Apache (.htaccess уже создан)**
Файл `.htaccess` уже включен и настраивает:
- CORS для JSON файлов  
- Кэширование ресурсов
- Gzip сжатие
- Редиректы для SPA

### **Nginx (если нужно)**
Пример конфигурации в `deploy/static/nginx.conf.example`

### **cPanel/Shared Hosting**
1. Откройте **File Manager**
2. Перейдите в **public_html/test/** (или аналогичную папку)
3. Загрузите все файлы из архива
4. Сохраните структуру папок

## 🧪 Проверка работы

После деплоя проверьте:

1. **Загрузка страницы**: https://test.charts.expert/
2. **График загружается** без ошибок в консоли
3. **Переключение инструментов** работает (BTC, S&P 500, VIX, DXY)
4. **Технические индикаторы** добавляются  
5. **Мобильная версия** корректно отображается
6. **WebSocket тест**: https://test.charts.expert/websocket_test.html

## 🐛 Устранение неполадок

### **График не загружается**
- Проверьте консоль браузера (F12)
- Убедитесь что папка `data/` загружена
- Проверьте CORS настройки

### **Ошибки CORS**
Добавьте заголовки на сервере:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

### **Файлы не загружаются**
- Проверьте права доступа (644 для файлов, 755 для папок)
- Убедитесь что `.htaccess` загружен
- Проверьте структуру папок

## 📊 Технические характеристики

- **Размер проекта**: 2.7MB (сжато ~950KB)
- **Файлов**: 42
- **JavaScript модули**: 15
- **Данные**: JSON файлы с историческими данными
- **Совместимость**: Современные браузеры с ES6+

## 🔄 Обновление

Для обновления проекта:

```bash
# 1. Обновите код
git pull origin main

# 2. Пересоберите деплой  
./deploy-to-subdomain.sh

# 3. Загрузите новый архив
# или используйте FTP скрипт
```

## 📞 Поддержка

При проблемах проверьте:
- Логи сервера
- Консоль браузера  
- Настройки CORS
- Структуру файлов

---

**🎯 Цель**: Рабочий график CBMA14 на https://test.charts.expert/

**📦 Готово к загрузке**: `deploy/cbma14-chart-static-*.zip` 