# Оптимизация потребления трафика

## Анализ потребления трафика

### 🔴 Критичные источники трафика

#### 1. Coinglass API запросы
**Текущая проблема:**
- Запросы к Coinglass API на каждое действие пользователя
- До 4500 свечей за один запрос = ~450KB данных
- Rate limit только 0.5 секунды
- Отсутствие кэширования API ответов

**Объем трафика:** До 500MB/день при активном использовании

#### 2. Docker образы при обновлениях
**Текущая проблема:**
- Еженедельное обновление всех образов
- nginx:1.25-alpine ≈ 50MB
- Python + зависимости ≈ 200MB
- Полная перезагрузка образов

**Объем трафика:** ~250MB/неделю

#### 3. CDN ресурсы (TradingView Charts)
**Текущая проблема:**
- Загрузка с unpkg.com при каждом посещении
- lightweight-charts ≈ 500KB

**Объем трафика:** 500KB × количество уникальных посетителей

### 🟡 Умеренные источники

#### 4. Git updates
- Еженедельный `git pull` ≈ 1-5MB
- Зависит от изменений в коде

#### 5. Локальные бекапы
- 3.5MB ежедневно (локально, не потребляет внешний трафик)

## Оптимизации

### 🚀 Высокий приоритет

#### 1. API кэширование
```python
# Добавить в coinglass_client.py
class CoinglassClientOptimized:
    def __init__(self):
        self.cache_duration = {
            '1m': 60,      # 1 минута для минутных данных
            '5m': 300,     # 5 минут для 5-минутных
            '1h': 1800,    # 30 минут для часовых
            '4h': 3600,    # 1 час для 4-часовых
            '1D': 86400,   # 24 часа для дневных
        }
        self.data_cache = {}
        
    def get_cached_data(self, symbol, interval, force_refresh=False):
        cache_key = f"{symbol}_{interval}"
        now = time.time()
        
        if (cache_key in self.data_cache and 
            not force_refresh and
            now - self.data_cache[cache_key]['timestamp'] < self.cache_duration[interval]):
            return self.data_cache[cache_key]['data']
            
        # Только если кэш устарел - делаем запрос
        fresh_data = self._make_api_request(symbol, interval)
        self.data_cache[cache_key] = {
            'data': fresh_data,
            'timestamp': now
        }
        return fresh_data
```

#### 2. Rate limiting для пользователей
```python
# Добавить глобальный rate limiter
class UserRateLimiter:
    def __init__(self):
        self.user_requests = {}  # IP -> [timestamps]
        self.max_requests_per_minute = 10
        
    def is_allowed(self, user_ip):
        now = time.time()
        minute_ago = now - 60
        
        if user_ip not in self.user_requests:
            self.user_requests[user_ip] = []
            
        # Очищаем старые запросы
        self.user_requests[user_ip] = [
            ts for ts in self.user_requests[user_ip] 
            if ts > minute_ago
        ]
        
        # Проверяем лимит
        if len(self.user_requests[user_ip]) >= self.max_requests_per_minute:
            return False
            
        self.user_requests[user_ip].append(now)
        return True
```

#### 3. Локальный кэш статических ресурсов
```nginx
# nginx/nginx.conf - добавить кэширование
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
}

location /data/ {
    # Кэшируем данные на 5 минут
    expires 5m;
    add_header Cache-Control "public, max-age=300";
    alias /app/data/;
}
```

### 🔧 Средний приоритет

#### 4. Оптимизация Docker образов
```dockerfile
# Dockerfile.udf - multi-stage build
FROM python:3.11-slim as builder
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /root/.local /root/.local
# Остальной код...
```

#### 5. Предварительная загрузка данных
```python
# Добавить в builder
class DataPreloader:
    def __init__(self):
        self.popular_symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
        
    async def preload_popular_data(self):
        """Предзагрузка популярных данных в кэш"""
        for symbol in self.popular_symbols:
            for interval in ['4h', '1D']:
                await self.client.get_cached_data(symbol, interval)
```

#### 6. Сжатие ответов API
```python
# В server.py добавить
from flask import Flask
from flask_compress import Compress

app = Flask(__name__)
Compress(app)  # Автоматическое gzip сжатие
```

### 🛠️ Низкий приоритет

#### 7. CDN для статических ресурсов
```html
<!-- Вместо unpkg.com использовать локальный CDN -->
<script src="/static/libs/lightweight-charts.min.js"></script>
```

#### 8. Дифференциальные Docker обновления
```bash
# Вместо docker-compose pull использовать
docker image prune -f  # Только неиспользуемые образы
```

## Конфигурация оптимизированных лимитов

### Rate Limits по типам запросов
```yaml
api_limits:
  coinglass_api:
    requests_per_minute: 30
    requests_per_hour: 500
    cache_duration:
      realtime: 60s
      historical: 1h
      
  user_limits:
    requests_per_minute: 10
    requests_per_hour: 100
    
  data_refresh:
    cbma_update: 15m
    api_cache_cleanup: 1h
```

### Мониторинг трафика
```python
class TrafficMonitor:
    def __init__(self):
        self.daily_stats = {
            'api_requests': 0,
            'data_transferred': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        
    def log_request(self, endpoint, data_size):
        self.daily_stats['api_requests'] += 1
        self.daily_stats['data_transferred'] += data_size
        
        # Отправка в лог или метрики
        logger.info(f"Traffic: {endpoint}, {data_size}B, daily_total: {self.daily_stats['data_transferred']}B")
```

## Ожидаемая экономия

### До оптимизации
- API запросы: ~500MB/день
- Docker updates: ~250MB/неделю  
- CDN ресурсы: ~50MB/день
- **Итого: ~600MB/день**

### После оптимизации
- API запросы: ~50MB/день (90% кэш хитов)
- Docker updates: ~50MB/неделю (дифференциальные)
- CDN ресурсы: ~5MB/день (локальный кэш)
- **Итого: ~65MB/день (89% экономия)**

## Внедрение

### Фаза 1 (Быстрые победы)
1. ✅ Настроить nginx кэширование
2. ✅ Добавить rate limiting для API
3. ✅ Включить gzip сжатие

### Фаза 2 (Средний срок)
1. 🔄 Реализовать кэширование Coinglass API
2. 🔄 Оптимизировать Docker образы
3. 🔄 Добавить мониторинг трафика

### Фаза 3 (Долгосрочно)
1. ⏳ Настроить локальный CDN
2. ⏳ Предварительная загрузка данных
3. ⏳ Аналитика использования API

---

**Приоритет внедрения:** Фаза 1 → Фаза 2 → Фаза 3
**Ожидаемый ROI:** 89% снижение трафика через 2-4 недели 