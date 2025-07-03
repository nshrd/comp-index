# ⚡ Быстрое развертывание CBMA14 Index на VPS

## 🚀 Один скрипт - полное развертывание

### Требования:
- VPS с Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- 2GB+ RAM, 20GB+ SSD
- Root доступ

### 📦 Автоматическое развертывание:

```bash
# Скачивание и запуск скрипта развертывания
wget -O deploy.sh https://raw.githubusercontent.com/nshrd/comp-index/main/deploy.sh
chmod +x deploy.sh
sudo bash deploy.sh
```

**Что делает скрипт:**
- ✅ Устанавливает Docker и Docker Compose
- ✅ Настраивает firewall (порты 80, 443, 22)
- ✅ Клонирует репозиторий в `/opt/cbma14`
- ✅ Создает production конфигурацию
- ✅ Запускает все сервисы
- ✅ Создает скрипты обслуживания

### 🔧 После развертывания:

1. **Настройте конфигурацию:**
   ```bash
   nano /opt/cbma14/.env.prod
   ```

2. **Настройте SSL (опционально):**
   ```bash
   cd /opt/cbma14
   sudo bash deploy.sh ssl
   ```

3. **Проверьте работу:**
   ```bash
   curl http://YOUR_SERVER_IP/health
   ```

### 📊 Полезные команды:

```bash
# Статус сервисов
cbma14-status

# Обновление
cbma14-update

# Бэкап
cbma14-backup

# Логи
docker compose -f /opt/cbma14/docker-compose.prod.yml logs -f

# Перезапуск
docker compose -f /opt/cbma14/docker-compose.prod.yml restart
```

### 🌐 Доступ к сайту:

- **HTTP**: `http://YOUR_SERVER_IP`
- **HTTPS**: `https://YOUR_DOMAIN` (после настройки SSL)
- **API**: `http://YOUR_SERVER_IP/api/status`

### 🛠️ Дополнительные команды:

```bash
# Помощь
sudo bash deploy.sh help

# Только SSL
sudo bash deploy.sh ssl

# Только обновление
sudo bash deploy.sh update

# Только статус
sudo bash deploy.sh status

# Только бэкап
sudo bash deploy.sh backup
```

### 📝 Настройка домена:

1. Укажите A-запись в DNS:
   ```
   A    @              YOUR_SERVER_IP
   A    www            YOUR_SERVER_IP
   ```

2. Обновите конфигурацию:
   ```bash
   sed -i 's/your-domain.com/YOUR_DOMAIN/g' /opt/cbma14/.env.prod
   sed -i 's/your-domain.com/YOUR_DOMAIN/g' /opt/cbma14/nginx/prod.conf
   ```

3. Перезапустите сервисы:
   ```bash
   cd /opt/cbma14
   docker compose -f docker-compose.prod.yml restart
   ```

### 🔒 Что включено:

- **SSL/TLS**: Автоматические сертификаты Let's Encrypt
- **Безопасность**: Security headers, CORS, CSP
- **Производительность**: Gzip, кэширование, HTTP/2
- **Мониторинг**: Логи, статус, метрики
- **Обслуживание**: Автоматические бэкапы и обновления
- **Отказоустойчивость**: Автоматический перезапуск

### 📊 Мониторинг:

```bash
# Статус контейнеров
docker ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker compose -f /opt/cbma14/docker-compose.prod.yml logs -f

# Проверка здоровья
curl http://localhost/health
```

### 🚨 Решение проблем:

```bash
# Перезапуск всех сервисов
cd /opt/cbma14
docker compose -f docker-compose.prod.yml restart

# Полная пересборка
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Проверка портов
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# Проверка firewall
ufw status
```

---

## 🎉 Готово!

Ваш CBMA14 Index теперь работает на production сервере с:
- ✅ Красивым современным интерфейсом
- ✅ Реальными данными с Coinbase/Coinglass
- ✅ Безопасным HTTPS соединением
- ✅ Автоматическими обновлениями
- ✅ Мониторингом и логированием

**Время развертывания: 5-10 минут** 🚀 