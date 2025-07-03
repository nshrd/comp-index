# 🚀 Развертывание CBMA14 Index на VPS

Пошаговое руководство по развертыванию проекта на виртуальном частном сервере (VPS).

## 📋 Требования

### Минимальные характеристики VPS:
- **CPU**: 1-2 ядра
- **RAM**: 2GB+
- **Диск**: 20GB+ SSD
- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Сеть**: Публичный IP адрес

### Программное обеспечение:
- Docker & Docker Compose
- Git
- Nginx (будет в контейнере)
- Certbot (для SSL)

## 🛠️ Подготовка сервера

### 1. Подключение к VPS

```bash
ssh root@YOUR_SERVER_IP
# или
ssh user@YOUR_SERVER_IP
```

### 2. Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 3. Установка Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Проверка установки
docker --version
docker compose version
```

### 4. Настройка firewall

```bash
# Ubuntu
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 📦 Развертывание приложения

### 1. Клонирование репозитория

```bash
cd /opt
sudo git clone https://github.com/nshrd/comp-index.git cbma14
cd cbma14
sudo chown -R $USER:$USER .
```

### 2. Создание production конфигурации

Создайте файл `.env.prod`:

```bash
nano .env.prod
```

```env
# Основные настройки
DOMAIN=your-domain.com
COINGLASS_API_KEY=your_coinglass_api_key_here

# UDF Server
UDF_HOST=0.0.0.0
UDF_PORT=8000

# Nginx
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024

# SSL
SSL_EMAIL=your-email@domain.com

# Monitoring
WATCHTOWER_CLEANUP=true
```

### 3. Создание production docker-compose

Создайте `docker-compose.prod.yml`:

```yaml
version: "3.9"

services:
  # Builder сервис
  builder:
    build:
      context: .
      dockerfile: Dockerfile.builder
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    environment:
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    networks:
      - cbma14_network

  # UDF сервер
  udf:
    build:
      context: .
      dockerfile: Dockerfile.udf
    volumes:
      - ./data:/data:ro
      - ./logs:/app/logs
    environment:
      - PYTHONUNBUFFERED=1
      - FLASK_ENV=production
      - COINGLASS_API_KEY=${COINGLASS_API_KEY}
    expose:
      - "8000"
    restart: unless-stopped
    depends_on:
      - builder
    networks:
      - cbma14_network

  # Nginx reverse proxy
  nginx:
    image: nginx:1.25-alpine
    volumes:
      - ./nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - ./src/chart:/usr/share/nginx/html:ro
      - ./logs/nginx:/var/log/nginx
      - certbot_data:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    depends_on:
      - udf
    networks:
      - cbma14_network

  # SSL сертификаты
  certbot:
    image: certbot/certbot:latest
    volumes:
      - certbot_data:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  certbot_data:
  certbot_www:

networks:
  cbma14_network:
    driver: bridge
```

### 4. Настройка Nginx для production

Создайте `nginx/prod.conf`:

```nginx
upstream udf_backend {
    server udf:8000;
    keepalive 32;
}

# HTTP редирект на HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL настройки
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Кэширование
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints
    location ~ ^/(api|udf)/ {
        proxy_pass http://udf_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Статические файлы
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
    
    # Логи
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
}
```

## 🔐 Настройка SSL (Let's Encrypt)

### 1. Получение SSL сертификата

```bash
# Замените на ваш домен и email
sudo docker run -it --rm \
  -v certbot_data:/etc/letsencrypt \
  -v certbot_www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

### 2. Обновление конфигурации

Обновите домен в `nginx/prod.conf` на ваш реальный домен.

## 🚀 Запуск приложения

### 1. Сборка и запуск

```bash
# Создание директорий для логов
mkdir -p logs/nginx

# Запуск в production режиме
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Проверка статуса
docker compose -f docker-compose.prod.yml ps
```

### 2. Проверка работы

```bash
# Проверка логов
docker compose -f docker-compose.prod.yml logs -f

# Проверка отдельных сервисов
docker compose -f docker-compose.prod.yml logs udf
docker compose -f docker-compose.prod.yml logs nginx
```

### 3. Тестирование

```bash
# Проверка HTTP редиректа
curl -I http://your-domain.com

# Проверка HTTPS
curl -I https://your-domain.com

# Проверка API
curl https://your-domain.com/api/status
```

## 📊 Мониторинг и обслуживание

### 1. Просмотр логов

```bash
# Все логи
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Логи UDF сервера
docker compose -f docker-compose.prod.yml logs -f udf

# Логи Nginx
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log
```

### 2. Перезапуск сервисов

```bash
# Перезапуск всех сервисов
docker compose -f docker-compose.prod.yml restart

# Перезапуск конкретного сервиса
docker compose -f docker-compose.prod.yml restart udf
```

### 3. Обновление кода

```bash
# Обновление из Git
git pull origin main

# Пересборка и перезапуск
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Бэкапы

```bash
# Создание скрипта бэкапа
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/cbma14"

mkdir -p $BACKUP_DIR

# Бэкап данных
tar -czf $BACKUP_DIR/data_$DATE.tar.gz data/

# Бэкап логов
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz logs/

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Добавление в cron
echo "0 2 * * * /opt/cbma14/backup.sh" | crontab -
```

## 🔧 Оптимизация производительности

### 1. Настройка системы

```bash
# Увеличение лимитов файлов
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Оптимизация sysctl
cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_fin_timeout = 30
EOF

sysctl -p
```

### 2. Настройка Docker

```bash
# Оптимизация Docker daemon
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

systemctl restart docker
```

## 🚨 Устранение неполадок

### Частые проблемы:

1. **Сервис не запускается**
   ```bash
   docker compose -f docker-compose.prod.yml logs service_name
   ```

2. **SSL проблемы**
   ```bash
   docker run --rm -v certbot_data:/etc/letsencrypt certbot/certbot certificates
   ```

3. **API недоступен**
   ```bash
   docker exec -it cbma14-udf-1 curl localhost:8000/status
   ```

4. **Высокая нагрузка**
   ```bash
   htop
   docker stats
   ```

## 📱 Настройка домена

### 1. DNS записи

Добавьте A-записи в DNS:
```
A    @              YOUR_SERVER_IP
A    www            YOUR_SERVER_IP
```

### 2. Проверка DNS

```bash
nslookup your-domain.com
dig your-domain.com
```

## 🔄 Автоматические обновления

Создайте скрипт для автоматического обновления:

```bash
cat > update.sh << 'EOF'
#!/bin/bash
cd /opt/cbma14

# Обновление кода
git pull origin main

# Обновление контейнеров
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build

# Очистка старых образов
docker image prune -f

echo "Update completed: $(date)"
EOF

chmod +x update.sh

# Автоматическое обновление каждую неделю
echo "0 3 * * 0 /opt/cbma14/update.sh" | crontab -
```

## 🎉 Результат

После выполнения всех шагов ваш CBMA14 Index будет доступен по адресу:

- **HTTP**: `http://your-domain.com` (автоматический редирект на HTTPS)
- **HTTPS**: `https://your-domain.com`
- **API**: `https://your-domain.com/api/status`

### Возможности:

- ✅ SSL сертификат (A+ рейтинг)
- ✅ Автоматическое обновление сертификатов
- ✅ Gzip сжатие
- ✅ Кэширование статики
- ✅ Security headers
- ✅ Мониторинг и логи
- ✅ Автоматические бэкапы
- ✅ Production готовность

---

🚀 **Поздравляю! Ваш CBMA14 Index успешно развернут на VPS!** 