# ⚡ Быстрый старт

Краткое руководство для немедленной настройки композитного индекса рейтингов в TradingView.

## 🚀 За 5 минут

### 1. Клонирование и установка

```bash
git clone <your-repo-url>
cd index
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Тестовые данные (без API)

```bash
# Создание тестовых данных
python3 test_data_generator.py

# Первый тест
./run_updater.sh --no-commit
```

### 3. Настройка для продакшена

```bash
# Создайте .env файл
cp config.env.example .env
# Отредактируйте .env с вашими данными

# Создайте Pine Seeds репозиторий на GitHub
# Клонируйте его
git clone https://github.com/your-username/your-seeds-repo.git seeds_repo

# Запустите обновление
./run_updater.sh
```

### 4. TradingView индикатор

1. Откройте TradingView → Pine Editor
2. Скопируйте код из `tradingview_indicator.pine`
3. Измените `seedsRepo = "your-username/your-seeds-repo"`
4. Сохраните и добавьте на график

## 🔧 Автоматизация

### Локальный cron

```bash
./setup_cron.sh
```

### GitHub Actions

Добавьте secrets в репозиторий:
- `APP_RANKINGS_API_KEY`
- `API_BASE_URL`
- `SEEDS_REPO_NAME`

Workflow запустится автоматически каждые 6 часов.

## 📊 Полезные команды

```bash
# Тестирование
python3 test_data_generator.py
./run_updater.sh --force

# Мониторинг
tail -f updater.log
tail -f cron.log

# Проверка
ls -la data/
git status -s seeds_repo/

# Очистка
rm -rf test_data/ data/ *.log
```

## 🆘 Быстрое устранение неполадок

| Проблема | Решение |
|----------|---------|
| Ошибки импорта Python | `pip install -r requirements.txt` |
| API не отвечает | Проверьте `.env` файл и доступность API |
| TradingView не видит данные | Убедитесь что Seeds репозиторий публичный |
| Cron не работает | Проверьте права: `chmod +x run_updater.sh` |
| Git ошибки | Настройте: `git config user.name/user.email` |

## 📈 Что дальше?

1. Настройте уведомления (Telegram)
2. Добавьте больше категорий рейтингов
3. Экспериментируйте с весами в композитном индексе
4. Создайте алерты в TradingView

**Подробная документация в [README.md](README.md)** 