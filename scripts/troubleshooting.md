# Руководство по устранению проблем с доступностью сайта

## 🚨 Проблема: Сайт не открывается

### Быстрая диагностика

1. **Запуск диагностики на сервере:**
   ```bash
   cd /home/comp-index
   make debug-server
   ```

2. **Проверка статуса контейнеров:**
   ```bash
   ./diagnose.sh
   ```

### Типичные проблемы и решения

#### 1. SSL сертификат отсутствует или поврежден

**Симптомы:**
- `Connection reset by peer`
- Nginx ошибки типа "cannot load certificate"
- HTTPS не работает

**Решение А: Временное переключение на HTTP**
```bash
make http-only
```

**Решение Б: Исправление SSL**
```bash
# Проверка DNS записей
make check-dns

# Получение нового сертификата
make ssl-setup

# Проверка статуса
make ssl-status
```

#### 2. Файерволл блокирует порты

**Симптомы:**
- Порты 80/443 не отвечают извне
- Локально работает, извне нет

**Решение:**
```bash
# Проверка ufw
sudo ufw status

# Открытие портов
sudo ufw allow 80
sudo ufw allow 443

# Проверка iptables
sudo iptables -L INPUT -n | grep -E "(80|443)"
```

#### 3. Nginx конфигурация некорректна

**Симптомы:**
- Nginx контейнер постоянно перезапускается
- Ошибки конфигурации в логах

**Решение:**
```bash
# Проверка конфигурации
docker exec $(docker compose ps -q nginx) nginx -t

# Просмотр логов
docker logs $(docker compose ps -q nginx)

# Переключение на базовую HTTP конфигурацию
make http-only
```

#### 4. Docker сеть недоступна

**Симптомы:**
- Контейнеры запущены, но не отвечают
- Внутренние соединения не работают

**Решение:**
```bash
# Перезапуск с пересозданием сетей
docker compose down
docker network prune -f
docker compose up -d

# Проверка сетей
docker network ls
docker network inspect comp-index_default
```

### Пошаговый план восстановления

#### Шаг 1: Базовая диагностика
```bash
cd /home/comp-index
make debug-server
```

#### Шаг 2: Если HTTPS проблемы - переключение на HTTP
```bash
make http-only
```

#### Шаг 3: Проверка доступности
```bash
curl -I http://charts.expert
curl -I http://localhost
```

#### Шаг 4: Если HTTP работает локально, но не извне
```bash
# Проверка файерволла
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Проверка внешнего IP
curl -s ifconfig.me
```

#### Шаг 5: Настройка SSL (после решения базовых проблем)
```bash
# Проверка DNS
make check-dns

# Получение сертификата
make ssl-setup

# Возврат к HTTPS конфигурации
docker compose down
cp nginx/nginx.conf.backup nginx/nginx.conf
cp docker-compose.yml.backup docker-compose.yml
docker compose up -d
```

### Команды диагностики

```bash
# Полная диагностика
make debug-server

# Проверка DNS записей
make check-dns

# Статус SSL
make ssl-status

# Переключение на HTTP
make http-only

# Мониторинг логов
docker compose logs -f nginx
```

### Логи для анализа

1. **Nginx логи:**
   ```bash
   docker logs $(docker compose ps -q nginx)
   ```

2. **Системные логи:**
   ```bash
   sudo journalctl -u docker -f
   ```

3. **Логи файерволла:**
   ```bash
   sudo tail -f /var/log/ufw.log
   ```

### Контакты и поддержка

Если проблема не решается:
1. Запустите `make debug-server` и сохраните вывод
2. Проверьте логи: `docker compose logs --tail=50`
3. Проверьте статус DNS: `make check-dns`

### Возврат к HTTPS после отладки

После решения проблем с HTTP:

1. **Убедитесь, что DNS настроен:**
   ```bash
   make check-dns
   ```

2. **Получите SSL сертификат:**
   ```bash
   make ssl-setup
   ```

3. **Верните HTTPS конфигурацию:**
   ```bash
   docker compose down
   cp nginx/nginx.conf.backup nginx/nginx.conf
   cp docker-compose.yml.backup docker-compose.yml
   docker compose up -d
   ```

4. **Проверьте работу:**
   ```bash
   curl -I https://charts.expert
   make ssl-status
   ``` 