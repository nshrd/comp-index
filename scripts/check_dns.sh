#!/bin/bash

echo "Проверка DNS записей для Let's Encrypt..."
echo "========================================="

echo "Проверяем _acme-challenge.charts.expert:"
nslookup -type=TXT _acme-challenge.charts.expert 2>/dev/null || echo "Запись не найдена"

echo ""
echo "Проверяем _acme-challenge.www.charts.expert:"
nslookup -type=TXT _acme-challenge.www.charts.expert 2>/dev/null || echo "Запись не найдена"

echo ""
echo "Альтернативная проверка через dig:"
echo "=================================="
dig TXT _acme-challenge.charts.expert +short
dig TXT _acme-challenge.www.charts.expert +short 