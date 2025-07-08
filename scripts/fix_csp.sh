#!/bin/bash

echo "🔧 Исправление CSP для устранения TrustedScript ошибок..."

# Бэкап оригинального файла
cp nginx/nginx.conf nginx/nginx.conf.backup

# Создаем временную CSP политику без TrustedScript требований
cat > /tmp/csp_fix.txt << 'EOF'
        # Более мягкая Content Security Policy для разработки
        add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws: https:; font-src 'self' data: https:; object-src 'none'; base-uri 'self';" always;
EOF

# Заменяем строгую CSP политику на более мягкую
sed -i.bak 's/require-trusted-types-for.*trusted-types default//' nginx/nginx.conf

echo "✅ CSP политика смягчена для устранения TrustedScript проблем"
echo "💡 Для восстановления строгой политики: cp nginx/nginx.conf.backup nginx/nginx.conf"
echo "🔄 Перезапустите Docker контейнеры: docker-compose restart" 