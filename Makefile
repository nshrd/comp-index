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