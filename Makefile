.PHONY: test clean help install-test-deps

# Запуск всех тестов
test:
	python tests/run_tests.py

# Запуск тестов калькулятора
test-calculator:
	python tests/run_tests.py tests.test_cbma14_calculator

# Запуск тестов провайдера  
test-provider:
	python tests/run_tests.py tests.test_cbma14_provider

# Запуск тестов конфигурации
test-config:
	python tests/run_tests.py tests.test_config

# Запуск Docker интеграционных тестов
test-docker:
	@echo "🐳 Запуск Docker интеграционных тестов..."
	python -m pytest tests/test_docker_integration.py -v

# Запуск всех тестов (unit + docker)
test-all:
	@echo "🚀 Запуск всех тестов..."
	@$(MAKE) test
	@$(MAKE) test-docker

# Установка зависимостей для тестирования
install-test-deps:
	@echo "📦 Установка зависимостей для тестирования..."
	pip install pytest>=6.0.0

# Очистка временных файлов
clean:
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# SSL сертификаты
ssl-check:
	@echo "🔍 Проверка предварительных условий для SSL..."
	./scripts/ssl_check.sh

ssl-setup:
	@echo "🔒 Настройка SSL сертификата Let's Encrypt..."
	./scripts/ssl_setup.sh

ssl-renew:
	@echo "🔄 Обновление SSL сертификата..."
	./scripts/ssl_renew.sh

ssl-cron:
	@echo "⏰ Настройка автоматического обновления SSL..."
	./scripts/setup_cron.sh

ssl-status:
	@echo "📊 Проверка статуса SSL сертификата..."
	@if [ -f "/etc/ssl/certs/charts.expert.crt" ]; then \
		echo "Сертификат найден. Срок действия:"; \
		openssl x509 -in /etc/ssl/certs/charts.expert.crt -text -noout | grep -A 2 Validity; \
	else \
		echo "❌ Сертификат не найден"; \
	fi

ssl-logs:
	@echo "📋 Просмотр логов SSL обновления..."
	@if [ -f "/var/log/letsencrypt-renewal.log" ]; then \
		sudo tail -20 /var/log/letsencrypt-renewal.log; \
	else \
		echo "❌ Лог файл не найден"; \
	fi

check-dns:
	@echo "🔍 Проверка DNS записей для Let's Encrypt..."
	./scripts/check_dns.sh

fix-csp:
	@echo "🔧 Исправление CSP для устранения TrustedScript ошибок..."
	./scripts/fix_csp.sh

optimize-traffic:
	@echo "🚀 Применение оптимизаций для экономии трафика..."
	./scripts/apply_traffic_optimizations.sh

monitor-traffic:
	@echo "📊 Мониторинг потребления трафика..."
	./scripts/monitor_traffic.sh

# Справка
help:
	@echo "Доступные команды:"
	@echo "  test           - Запуск unit тестов"
	@echo "  test-calculator - Тестирование калькулятора"
	@echo "  test-provider  - Тестирование провайдера" 
	@echo "  test-config    - Тестирование конфигурации"
	@echo "  test-docker    - Docker интеграционные тесты"
	@echo "  test-all       - Все тесты (unit + docker)"
	@echo "  install-test-deps - Установка зависимостей для тестирования"
	@echo "  clean          - Очистка временных файлов"
	@echo ""
	@echo "SSL сертификаты:"
	@echo "  ssl-check      - Проверка предварительных условий"
	@echo "  ssl-setup      - Получение нового SSL сертификата"
	@echo "  ssl-renew      - Обновление SSL сертификата"
	@echo "  ssl-cron       - Настройка автоматического обновления"
	@echo "  ssl-status     - Проверка статуса сертификата"
	@echo "  ssl-logs       - Просмотр логов обновления"
	@echo "  check-dns      - Проверка DNS записей для Let's Encrypt"
	@echo "  fix-csp        - Исправление CSP для устранения TrustedScript ошибок"
	@echo ""
	@echo "Оптимизация трафика:"
	@echo "  optimize-traffic - Применить все оптимизации для экономии трафика"
	@echo "  monitor-traffic  - Мониторинг потребления трафика"
	@echo ""
	@echo "Диагностика:"
	@echo "  debug-server     - Диагностика сетевых проблем сервера"
	@echo "  http-only        - Переключение на HTTP-only режим (для отладки)" 

# Диагностика сервера
debug-server:
	@echo "🔍 Диагностика сетевых проблем сервера..."
	@chmod +x scripts/server_debug.sh
	@./scripts/server_debug.sh

# Переключение на HTTP-only режим
http-only:
	@echo "🔄 Переключение на HTTP-only режим..."
	@chmod +x scripts/switch_to_http.sh
	@./scripts/switch_to_http.sh 