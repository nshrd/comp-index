# CBMA14 Index - Refactored Architecture v2.0

## 🎯 Обзор

Рефакторенная версия проекта CBMA14 Index с модульной архитектурой, конфигурацией и разделением ответственности.

## 🏗️ Архитектура

### Структура проекта
```
index/
├── config.py                    # Центральная конфигурация
├── run_server.py               # Запуск UDF сервера
├── src/                        # Исходный код
│   ├── data/                   # Модули данных
│   │   ├── coinglass_client.py # Клиент Coinglass API
│   │   └── cbma14_provider.py  # Провайдер данных CBMA14
│   ├── udf/                    # UDF сервер
│   │   └── server.py           # Рефакторенный сервер
│   └── chart/                  # Веб-интерфейс
│       ├── index.html          # HTML страница
│       └── chart.js            # JavaScript модули
├── data/                       # Файлы данных
│   ├── data.json              # Исходные данные
│   └── CBMA14.json            # Обработанные данные
├── udf/                        # Старый UDF сервер (legacy)
├── chart/                      # Старый веб-интерфейс (legacy)
└── archive/                    # Архивированные файлы
```

### Модули

#### 1. **Конфигурация** (`config.py`)
- Централизованная конфигурация всех компонентов
- Поддержка переменных окружения
- Типизированные настройки

#### 2. **Данные** (`src/data/`)
- `CoinglassClient` - клиент для API Coinglass
- `CBMA14Provider` - провайдер данных индекса

#### 3. **UDF Сервер** (`src/udf/server.py`)
- Модульная архитектура
- Разделение ответственности
- Конфигурируемые endpoints

#### 4. **Веб-интерфейс** (`src/chart/`)
- JavaScript классы для графиков
- Конфигурируемые цвета и настройки
- Модульная структура

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
pip install flask flask-cors requests
```

### 2. Настройка переменных окружения
```bash
# Создайте .env файл
echo "COINGLASS_API_KEY=your_key_here" > .env
```

### 3. Запуск сервера
```bash
python3 run_server.py
```

### 4. Открытие веб-интерфейса
```bash
open src/chart/index.html
```

## ⚙️ Конфигурация

### Основные настройки в `config.py`:

```python
# Coinglass API
coinglass:
  api_key: из переменной COINGLASS_API_KEY
  base_url: "https://open-api-v4.coinglass.com"
  request_delay: 0.5  # секунды
  cache_duration: 300  # секунды

# UDF сервер
udf:
  host: "0.0.0.0"
  port: 8888
  data_file: "data/CBMA14.json"

# Веб-интерфейс
chart:
  title: "Bitcoin / USD with Coinbase MA14 Index"
  udf_url: "http://localhost:8888"
  auto_refresh_interval: 60000  # миллисекунды
```

## 📊 API Endpoints

### UDF сервер (порт 8888):

- `GET /` - Статус сервера
- `GET /config` - Конфигурация UDF
- `GET /symbols?symbol=CBMA14` - Информация о символе
- `GET /history?symbol=CBMA14&resolution=D&from=...&to=...` - История CBMA14
- `GET /btc/ohlcv?days=365` - Данные BTC от Coinglass
- `GET /search?query=...` - Поиск символов
- `GET /time` - Текущее время сервера

## 🔧 Разработка

### Добавление нового источника данных:

1. Создайте клиент в `src/data/`
2. Добавьте конфигурацию в `config.py`
3. Добавьте endpoint в `src/udf/server.py`
4. Обновите веб-интерфейс в `src/chart/`

### Настройка цветов:

Измените значения в `ChartConfig` в `src/chart/index.html`:

```javascript
const chartConfig = new ChartConfig({
    btcUpColor: "#26a69a",
    btcDownColor: "#ef5350",
    cbma14Color: "#2962FF",
    backgroundColor: "#1e222d"
});
```

## 🐳 Docker

### Обновленный docker-compose.udf.yml:

```yaml
services:
  udf:
    environment:
      - COINGLASS_API_KEY=${COINGLASS_API_KEY}
    command: python3 /app/run_server.py
```

## 🧪 Тестирование

```bash
# Проверка UDF сервера
curl "http://localhost:8888/"

# Проверка данных BTC
curl "http://localhost:8888/btc/ohlcv?days=7"

# Проверка данных CBMA14
curl "http://localhost:8888/history?symbol=CBMA14&resolution=D"
```

## 📈 Особенности v2.0

1. **Модульность** - четкое разделение ответственности
2. **Конфигурируемость** - все настройки в одном месте
3. **Типизация** - использование dataclasses для конфигурации
4. **Расширяемость** - легко добавлять новые источники данных
5. **Тестируемость** - модули можно тестировать независимо
6. **Производительность** - оптимизированное кэширование
7. **Мониторинг** - улучшенное логирование

## 🔄 Миграция с v1.0

1. Старые файлы перемещены в `archive/`
2. Новая конфигурация в `config.py`
3. Запуск через `run_server.py`
4. Веб-интерфейс в `src/chart/index.html`

## 📝 Логирование

Все компоненты используют стандартное Python логирование:

```
2025-07-02 19:20:00,123 - server - INFO - Starting UDF server
2025-07-02 19:20:01,456 - coinglass_client - INFO - API response received
2025-07-02 19:20:02,789 - cbma14_provider - INFO - Data loaded successfully
```

## 🛠️ Поддержка

- **Конфигурация**: редактируйте `config.py`
- **API клиенты**: модули в `src/data/`
- **Веб-интерфейс**: файлы в `src/chart/`
- **Логи**: выводятся в консоль с детализацией

---

**Версия**: 2.0  
**Дата**: Июль 2025  
**Статус**: Активная разработка 