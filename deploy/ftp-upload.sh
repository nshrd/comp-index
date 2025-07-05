#!/bin/bash

# FTP Upload Script for test.charts.expert
# Замените переменные на ваши данные

FTP_HOST="your-ftp-server.com"
FTP_USER="your-username"
FTP_PASS="your-password"
FTP_DIR="/public_html/test.charts.expert/"  # или другая папка субдомена

echo "🚀 Загрузка файлов на test.charts.expert..."

ftp -n $FTP_HOST << EOF
user $FTP_USER $FTP_PASS
binary
cd $FTP_DIR

# Удаляем старые файлы (опционально)
# mdelete *.js
# mdelete *.html

# Загружаем HTML файлы
put index.html
put websocket_test.html

# Загружаем JS файлы
mput *.js

# Загружаем .htaccess
put .htaccess

# Создаем папку data и загружаем данные
mkdir data
cd data
lcd data
mput *

# Загружаем подпапки
mkdir dxy
cd dxy
lcd dxy
mput *
cd ..
lcd ..

mkdir spx
cd spx
lcd spx
mput *
cd ..
lcd ..

# Повторяем для всех папок...
# (добавьте другие папки по необходимости)

quit
