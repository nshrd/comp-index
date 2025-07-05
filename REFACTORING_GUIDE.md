# 🔄 CBMA14 Index - Руководство по рефакторингу

## Обзор изменений

Проведен полный рефакторинг проекта CBMA14 Index с целью улучшения кроссплатформенности, надежности и простоты развертывания.

## 📋 Основные изменения

### 1. Конфигурация
- **Новая структура конфигурации** в `config.py` с поддержкой переменных окружения
- **Кроссплатформенная настройка** путей и портов
- **Автоматическое определение окружения** (development/production)
- **Централизованное управление** всеми настройками

### 2. UDF Сервер
- **Полностью переписан** `src/udf/server.py` для лучшей совместимости
- **Улучшенная обработка ошибок** и логирование
- **Кроссплатформенные импорты** с fallback механизмами
- **Упрощенная API структура** с меньшим количеством зависимостей

### 3. Docker Конфигурация
- **Унифицированный** `docker-compose.yml` для всех окружений
- **Healthcheck** для всех сервисов
- **Безопасность** с непривилегированными пользователями
- **Переменные окружения** для гибкой настройки

### 4. Frontend
- **Кроссплатформенная конфигурация** в `src/chart/config.js`
- **Автоматическое определение API endpoints** по окружению
- **Улучшенная обработка ошибок** и состояний
- **Единообразное управление** цветами и темами

### 5. Nginx Конфигурация
- **Современная конфигурация** с поддержкой HTTP/2
- **Правильная настройка CORS** для API запросов
- **SSL/TLS поддержка** для безопасного соединения
- **Оптимизированное кэширование** и сжатие

## 🛠️ Новые возможности

### Переменные окружения
```bash
# API ключи
COINGLASS_API_KEY=your_api_key

# Сервер настройки
UDF_HOST=0.0.0.0
UDF_PORT=8000
UDF_DEBUG=false
FLASK_ENV=production

# Builder настройки
BUILDER_UPDATE_INTERVAL=3600
BUILDER_MA_PERIOD=14

# Файлы данных
DATA_INPUT_FILE=data/data.json
DATA_OUTPUT_FILE=data/CBMA14.json

# Frontend настройки
FRONTEND_API_URL=http://localhost:8001

# Docker настройки
COMPOSE_PROJECT_NAME=cbma14
DOCKER_RESTART_POLICY=unless-stopped

# Nginx настройки
NGINX_PORT=8080
NGINX_SSL_PORT=8443

# Логирование
LOG_LEVEL=INFO
LOG_DIR=logs
```

### Кроссплатформенная поддержка
- **Автоматическая детекция** окружения (local/VPS/GitHub Pages)
- **Гибкая настройка** API endpoints
- **Поддержка разных ОС** (Linux, macOS, Windows)

### Улучшенная безопасность
- **Непривилегированные пользователи** в Docker
- **Правильные CORS настройки**
- **Безопасные заголовки** HTTP
- **SSL/TLS поддержка**

## 📦 Структура проекта

```
index/
├── config.py                  # Главная конфигурация
├── docker-compose.yml         # Docker конфигурация
├── deploy.sh                  # Скрипт развертывания
├── env.example               # Пример переменных окружения
├── src/
│   ├── chart/
│   │   ├── index.html        # Frontend интерфейс
│   │   └── config.js         # Frontend конфигурация
│   ├── data/
│   │   ├── coinglass_client.py
│   │   ├── cbma14_provider.py
│   │   └── cbma14_calculator.py
│   └── udf/
│       └── server.py         # UDF API сервер
├── builder/
│   └── build_index.py        # Генератор индекса
├── nginx/
│   └── nginx.conf           # Nginx конфигурация
├── data/                    # Данные
├── logs/                    # Логи
└── Dockerfile.*             # Docker образы
```

## 🚀 Быстрый запуск

### 1. Подготовка окружения
```bash
# Копируем переменные окружения
cp env.example .env

# Редактируем .env файл
nano .env
```

### 2. Развертывание
```bash
# Только API сервер
./deploy.sh

# С веб-интерфейсом
./deploy.sh --nginx

# Очистка
./deploy.sh --clean
```

### 3. Доступ к сервисам
- **API сервер**: http://localhost:8001
- **Веб-интерфейс**: http://localhost:8080 (с nginx)
- **Статус**: http://localhost:8001/api/status

## 🔧 Разработка

### Локальное тестирование
```bash
# Запуск только UDF сервера
python -m src.udf.server

# Сборка без кэша
docker-compose build --no-cache

# Просмотр логов
docker-compose logs -f udf
```

### Отладка
```bash
# Проверка конфигурации
python -c "from config import config; print(config)"

# Проверка API
curl http://localhost:8001/api/status

# Проверка Docker
docker-compose ps
```

## 📊 Мониторинг

### Логи
```bash
# Все сервисы
docker-compose logs -f

# Только UDF сервер
docker-compose logs -f udf

# Только Builder
docker-compose logs -f builder

# Только Nginx
docker-compose logs -f nginx
```

### Healthcheck
```bash
# UDF сервер
curl http://localhost:8000/api/status

# Nginx
curl http://localhost:8080/health

# Docker статус
docker-compose ps
```

## 🌐 Развертывание

### Локальная разработка
```bash
# .env настройки
FRONTEND_API_URL=http://localhost:8001
UDF_DEBUG=true
FLASK_ENV=development
```

### VPS развертывание
```bash
# .env настройки
FRONTEND_API_URL=http://YOUR_VPS_IP:8000
UDF_DEBUG=false
FLASK_ENV=production
```

### GitHub Pages
```bash
# .env настройки
FRONTEND_API_URL=https://YOUR_VPS_IP:8443
UDF_DEBUG=false
FLASK_ENV=production
```

## 🐛 Решение проблем

### Проблемы с портами
```bash
# Проверка занятых портов
netstat -tlnp | grep :8000

# Изменение порта в .env
UDF_PORT=8001
```

### Проблемы с импортами
```bash
# Проверка Python путей
python -c "import sys; print(sys.path)"

# Проверка модулей
python -c "from src.udf.server import app; print('OK')"
```

### Проблемы с Docker
```bash
# Очистка системы
docker system prune -a

# Пересборка
docker-compose build --no-cache

# Проверка логов
docker-compose logs --tail=50
```

## 🔄 Миграция

### Из старой версии
1. Сохраните данные из `data/`
2. Остановите старые контейнеры
3. Скопируйте `env.example` в `.env`
4. Настройте переменные окружения
5. Запустите новую версию

### Обновление конфигурации
```bash
# Резервное копирование
cp config.py config.py.backup

# Обновление из Git
git pull origin main

# Сравнение конфигураций
diff config.py.backup config.py
```

## 📚 API Документация

### Endpoints
- `GET /api/status` - Статус сервера
- `GET /api/config` - Конфигурация UDF
- `GET /api/symbols` - Информация о символах
- `GET /api/history` - Исторические данные
- `GET /api/search` - Поиск символов
- `GET /api/crypto/ohlcv` - Данные криптовалют

### Параметры
- `symbol` - Символ (CBMA14, BTCUSDT, etc.)
- `from` - Timestamp начала
- `to` - Timestamp конца
- `ma_period` - Период MA (7, 14, 30)
- `days` - Количество дней

## 🎯 Следующие шаги

1. **Добавить больше криптовалют** - поддержка ETH, SOL, etc.
2. **Улучшить кэширование** - Redis для производительности
3. **Добавить мониторинг** - Prometheus + Grafana
4. **Автоматические тесты** - Unit и интеграционные тесты
5. **CI/CD pipeline** - GitHub Actions
6. **Документация API** - Swagger/OpenAPI

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Отправьте Pull Request

## 📞 Поддержка

Если у вас есть вопросы или проблемы:
1. Проверьте логи: `docker-compose logs -f`
2. Изучите документацию
3. Создайте issue в GitHub
4. Обратитесь к команде разработки 