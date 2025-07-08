# Инструкция по настройке DNS для Let's Encrypt

## Проблема
Вы добавили DNS записи с неправильными именами, получив дублирование домена:
```
_acme-challenge.charts.expert.charts.expert  ❌ НЕПРАВИЛЬНО
```

## Правильная настройка

### 1. Удалите все неправильные записи
Найдите и удалите все записи типа `_acme-challenge.*.charts.expert.charts.expert`

### 2. Добавьте правильные TXT записи

**Запись 1:**
- **Имя:** `_acme-challenge` (БЕЗ `.charts.expert`)
- **Тип:** `TXT`
- **Значение:** `HG73aEmXHr0rklBUiekHvnR4gZXpkDkYGCOsFztYn58`
- **TTL:** 300 (или минимальный)

**Запись 2:**
- **Имя:** `_acme-challenge.www` (БЕЗ `.charts.expert`)
- **Тип:** `TXT`
- **Значение:** `Q8JwKbzWcbmTAQ9gzOVSJ9hmC9bGwW-5nGnjsLMjVS4`
- **TTL:** 300 (или минимальный)

### 3. Как правильно заполнить формы DNS провайдера

**Большинство провайдеров (Cloudflare, Namecheap, GoDaddy):**
```
Name: _acme-challenge          (короткое имя)
Type: TXT
Value: HG73aEmXHr0rklBUiekHvnR4gZXpkDkYGCOsFztYn58
```

**Некоторые провайдеры требуют полное имя:**
```
Name: _acme-challenge.charts.expert          (полное имя)
Type: TXT
Value: HG73aEmXHr0rklBUiekHvnR4gZXpkDkYGCOsFztYn58
```

### 4. Проверка

Подождите 5-10 минут для распространения DNS и проверьте:
```bash
make check-dns
```

Или вручную:
```bash
./scripts/check_dns.sh
```

### 5. Запуск Let's Encrypt после успешной проверки

```bash
make ssl-setup
```

## Возможные ошибки DNS провайдеров

| Провайдер | Особенности |
|-----------|-------------|
| Cloudflare | Используйте короткие имена: `_acme-challenge` |
| Namecheap | Может потребоваться полное имя |
| GoDaddy | Обычно короткие имена, но проверьте preview |
| Route53 | Всегда полные имена с точкой в конце |

## Если записи не распространяются

1. Проверьте TTL (должен быть минимальным)
2. Подождите до 1 часа
3. Проверьте через разные DNS серверы:
   ```bash
   nslookup -type=TXT _acme-challenge.charts.expert 8.8.8.8
   nslookup -type=TXT _acme-challenge.charts.expert 1.1.1.1
   ``` 