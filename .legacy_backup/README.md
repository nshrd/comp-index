# 📦 Common Modules - Универсальные модули

Универсальные модули для торговых и финансовых приложений, которые можно переиспользовать в разных проектах.

## 📁 Структура

```
common/
├── utils/              # Утилиты общего назначения
│   ├── date_utils.py       # Работа с датами и временными метками
│   ├── timeframe_utils.py  # Утилиты для торговых таймфреймов
│   └── data_aggregation.py # Агрегация данных по периодам
├── math/               # Математические утилиты
│   └── moving_average.py   # Скользящие средние (SMA, EMA, WMA, AMA, HMA)
└── README.md          # Эта документация
```

## 🚀 Использование

### DateUtils - Работа с датами

```python
from common.utils import DateUtils
from datetime import datetime

# Конвертация в timestamp
now = datetime.now()
timestamp = DateUtils.to_timestamp(now)

# Конвертация из timestamp
date = DateUtils.from_timestamp(timestamp)

# Форматирование даты
date_str = DateUtils.to_local_date_string(timestamp, 'ru-RU')

# Парсинг даты
parsed = DateUtils.parse_date_string("2023-12-25")
```

### TimeframeUtils - Торговые таймфреймы

```python
from common.utils import TimeframeUtils

# Получить суффикс файла для таймфрейма
file_suffix = TimeframeUtils.get_file_suffix('3D')  # '1D'

# Получить отображаемый текст
display = TimeframeUtils.get_display_text('3D')  # '3D'

# Проверить, нужна ли агрегация
needs_agg = TimeframeUtils.needs_aggregation('3D')  # True

# Получить полную информацию
info = TimeframeUtils.get_timeframe_info('3D')
```

### MovingAverageCalculator - Скользящие средние

```python
from common.math import MovingAverageCalculator

data = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]

# Простая скользящая средняя (SMA)
sma = MovingAverageCalculator.simple_ma(data, period=3)

# Экспоненциальная скользящая средняя (EMA)
ema = MovingAverageCalculator.exponential_ma(data, period=3)

# Взвешенная скользящая средняя (WMA)
wma = MovingAverageCalculator.weighted_ma(data, period=3)

# Универсальная функция
ma = MovingAverageCalculator.calculate_ma(data, period=3, ma_type='sma')
```

### DataAggregator - Агрегация данных

```python
from common.utils import DataAggregator

# Данные для агрегации
data = [
    {'time': 1640995200, 'value': 100.0},  # 2022-01-01
    {'time': 1641081600, 'value': 101.0},  # 2022-01-02
    # ...
]

# Агрегация по неделям
weekly = DataAggregator.aggregate_to_weeks(data)

# Агрегация по 3 дня
three_day = DataAggregator.aggregate_to_three_days(data)

# Универсальная агрегация
aggregated = DataAggregator.aggregate_by_timeframe(data, '3D')

# Агрегация свечей
candle_data = [
    {'time': 1640995200, 'open': 100, 'high': 105, 'low': 98, 'close': 103},
    # ...
]
weekly_candles = DataAggregator.aggregate_candlestick_to_weeks(candle_data)
```

## 🧪 Тестирование

Запуск тестов:

```bash
python test_common_modules.py
```

Тестирование в Docker:

```bash
docker run --rm -v $(pwd):/app python:3.11-slim python /app/test_common_modules.py
```

## 📋 Поддерживаемые таймфреймы

| Код | Отображение | Файл | API | Агрегация |
|-----|-------------|------|-----|-----------|
| 240 | 4H          | 4H   | 240 | Нет       |
| D   | 1D          | 1D   | D   | Нет       |
| 3D  | 3D          | 1D   | D   | Да        |
| W   | 1W          | 1W   | D   | Да        |

## 🔧 Docker Integration

Модули автоматически копируются в Docker контейнеры:

```dockerfile
# В Dockerfile.udf и Dockerfile.builder
COPY common/ common/
```

Использование в контейнере:

```python
import sys
sys.path.insert(0, '/app')

from common.utils import DateUtils
from common.math import MovingAverageCalculator
```

## 📚 Примеры использования

### CBMA14 Calculator

```python
from common.math import MovingAverageCalculator

class CBMA14Calculator:
    def calculate_moving_average(self, values, period=14):
        return MovingAverageCalculator.simple_ma(values, period)
```

### API Data Processing

```python
from common.utils import TimeframeUtils, DataAggregator

def process_api_data(data, timeframe):
    if TimeframeUtils.needs_aggregation(timeframe):
        return DataAggregator.aggregate_by_timeframe(data, timeframe)
    return data
```

### Chart Data Synchronization

```python
from common.utils import DateUtils

def synchronize_data_timestamps(data_sources):
    synchronized = []
    for source in data_sources:
        first_date = source[0]['date']
        first_timestamp = DateUtils.to_timestamp(first_date)
        synchronized.append(first_timestamp)
    
    return max(synchronized)  # Latest start date
```

## 🏗️ Расширение

Для добавления новых модулей:

1. Создайте новую директорию в `common/`
2. Добавьте `__init__.py` с импортами
3. Обновите основной `common/__init__.py`
4. Добавьте тесты в `test_common_modules.py`
5. Обновите эту документацию

## 🔍 Диагностика

Проверка модулей включена в `diagnose.sh`:

```bash
./diagnose.sh
```

Быстрая проверка:

```bash
python -c "from common.utils import DateUtils; print('OK')"
``` 