#!/bin/bash

echo "🔧 Настройка nginx только для HTTP (без SSL)"
echo "⚠️  Это временное решение для отладки"

# Создаем временную конфигурацию nginx только для HTTP
cat > nginx/nginx_http_only.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting для экономии трафика и защиты API
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=data_limit:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=60r/m;

    # Логирование с мониторингом rate limiting
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    log_format traffic '$remote_addr - [$time_local] "$request" '
                      '$status $body_bytes_sent $request_time '
                      'rate_limit_status=$limit_req_status';
    
    access_log /var/log/nginx/access.log main;
    access_log /var/log/nginx/traffic.log traffic;

    # Основные настройки
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Агрессивное сжатие для экономии трафика
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 9;  # Максимальное сжатие
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/rss+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/svg+xml
        image/x-icon
        text/css
        text/plain
        text/x-component
        application/octet-stream;

    # Кэширование
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Upstream для UDF сервера
    upstream udf_backend {
        server udf:8000;
        keepalive 32;
    }

    server {
        listen 80 default_server;
        server_name charts.expert www.charts.expert _;
        
        # Основные настройки безопасности
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Content Security Policy (без TrustedScript требований)
        add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws: https:; font-src 'self' data: https:; object-src 'none'; base-uri 'self';" always;

        # Обработка CORS preflight запросов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin "*";
        }

        # Доступ к данным с оптимизированным кэшированием
        location /data/ {
            alias /app/data/;
            add_header Access-Control-Allow-Origin "*";
            
            # Rate limiting для data endpoints
            limit_req zone=data_limit burst=10 nodelay;
            
            # Агрессивное кэширование для экономии трафика
            location ~ \.json$ {
                add_header Content-Type application/json;
                add_header Cache-Control "public, max-age=1800"; # 30 минут для JSON
                expires 30m;
            }
            
            # CSV файлы кэшируем дольше (они реже обновляются)
            location ~ \.csv$ {
                add_header Cache-Control "public, max-age=3600"; # 1 час для CSV
                expires 1h;
            }
            
            # По умолчанию 5 минут
            add_header Cache-Control "public, max-age=300";
            expires 5m;
        }

        # Статические файлы с оптимизированным кэшированием
        location / {
            # General rate limiting для основного сайта
            limit_req zone=general_limit burst=20 nodelay;
            
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
            
            # Агрессивное кэширование статических файлов
            location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable, max-age=31536000";
                add_header Access-Control-Allow-Origin "*";
                
                # Отключаем логирование для статики (экономим дисковое пространство)
                access_log off;
            }
            
            # Кэшируем HTML на 5 минут
            location ~* \.html$ {
                add_header Cache-Control "public, max-age=300";
                expires 5m;
            }
        }

        # Проксирование API запросов к UDF серверу с rate limiting
        location /api/ {
            # Строгий rate limiting для API (потребляют больше всего трафика)
            limit_req zone=api_limit burst=5 nodelay;
            
            proxy_pass http://udf_backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
            proxy_connect_timeout 30;
            proxy_send_timeout 30;
            
            # Кэширование API ответов для экономии трафика
            add_header Cache-Control "public, max-age=60"; # 1 минута для API
        }

        # Проксирование UDF запросов (для обратной совместимости)
        location ~ ^/(config|symbols|history|time|search|status)$ {
            proxy_pass http://udf_backend$request_uri;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30;
            proxy_send_timeout 30;
            proxy_read_timeout 30;
        }

        # Healthcheck
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Статус nginx
        location /nginx_status {
            stub_status on;
            access_log off;
            allow 127.0.0.1;
            allow 172.16.0.0/12;
            deny all;
        }
    }
}
EOF

echo "✅ HTTP-only конфигурация создана: nginx/nginx_http_only.conf"
echo ""
echo "Для применения выполните:"
echo "1. docker compose down"
echo "2. cp nginx/nginx_http_only.conf nginx/nginx.conf"
echo "3. docker compose up -d"
echo ""
echo "Чтобы вернуть HTTPS:"
echo "1. git checkout nginx/nginx.conf"
echo "2. Настройте SSL сертификаты"
echo "3. docker compose restart nginx" 