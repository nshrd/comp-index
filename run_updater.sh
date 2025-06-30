#!/bin/bash

# ============================================================================
# Скрипт для автоматического обновления композитного индекса рейтингов
# Использование: ./run_updater.sh [--force] [--no-commit]
# ============================================================================

set -e  # Остановка при ошибке

# Настройки
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"
SEEDS_REPO_DIR="$SCRIPT_DIR/seeds_repo"  # Клон вашего Pine Seeds репозитория
LOG_FILE="$SCRIPT_DIR/updater.log"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Проверка аргументов
FORCE_UPDATE=false
NO_COMMIT=false

for arg in "$@"; do
    case $arg in
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --no-commit)
            NO_COMMIT=true
            shift
            ;;
        -h|--help)
            echo "Использование: $0 [--force] [--no-commit]"
            echo "  --force     Принудительное обновление даже при отсутствии изменений"
            echo "  --no-commit Не коммитить изменения в Git"
            echo "  --help      Показать эту справку"
            exit 0
            ;;
    esac
done

log "🚀 Запуск обновления композитного индекса..."

# Проверка виртуального окружения Python
if [[ "$VIRTUAL_ENV" == "" ]]; then
    warning "Виртуальное окружение Python не активировано"
    if [[ -f "$SCRIPT_DIR/venv/bin/activate" ]]; then
        log "Активация виртуального окружения..."
        source "$SCRIPT_DIR/venv/bin/activate"
    else
        warning "Виртуальное окружение не найдено. Создаю новое..."
        python3 -m venv "$SCRIPT_DIR/venv"
        source "$SCRIPT_DIR/venv/bin/activate"
        pip install -r "$SCRIPT_DIR/requirements.txt"
    fi
fi

# Создание директорий
mkdir -p "$DATA_DIR"
mkdir -p "$SEEDS_REPO_DIR"

# Проверка конфигурации API
if [[ -z "${APP_RANKINGS_API_KEY}" ]] && [[ -f "$SCRIPT_DIR/.env" ]]; then
    log "Загрузка переменных окружения из .env файла..."
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

if [[ -z "${APP_RANKINGS_API_KEY}" ]]; then
    warning "API ключ не найден. Проверьте переменную APP_RANKINGS_API_KEY или .env файл"
fi

# Сохранение предыдущих данных для сравнения
PREV_COMP_MA=""
if [[ -f "$DATA_DIR/COMP_MA.csv" ]]; then
    PREV_COMP_MA=$(tail -n 1 "$DATA_DIR/COMP_MA.csv" 2>/dev/null || echo "")
fi

# Запуск Python скрипта обработки данных
log "📊 Запуск обработки данных..."
cd "$SCRIPT_DIR"

if python3 data_processor.py; then
    success "✅ Обработка данных завершена успешно"
else
    error "❌ Ошибка при обработке данных"
    exit 1
fi

# Проверка создания файлов
if [[ ! -f "$DATA_DIR/COMP_MA.csv" ]] || [[ ! -f "$DATA_DIR/COMP_RAW.csv" ]]; then
    error "❌ CSV файлы не были созданы"
    exit 1
fi

# Проверка изменений данных
CURR_COMP_MA=$(tail -n 1 "$DATA_DIR/COMP_MA.csv" 2>/dev/null || echo "")
if [[ "$PREV_COMP_MA" == "$CURR_COMP_MA" ]] && [[ "$FORCE_UPDATE" == false ]]; then
    log "📝 Данные не изменились. Пропускаю обновление..."
    exit 0
fi

# Копирование файлов в Seeds репозиторий
if [[ -d "$SEEDS_REPO_DIR/.git" ]]; then
    log "📤 Обновление Seeds репозитория..."
    
    cd "$SEEDS_REPO_DIR"
    
    # Проверка статуса Git
    if ! git status &>/dev/null; then
        error "❌ Seeds репозиторий не является валидным Git репозиторием"
        exit 1
    fi
    
    # Обновление из remote
    git fetch origin
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
    
    # Создание директории data если не существует
    mkdir -p data
    
    # Копирование обновленных файлов
    cp "$DATA_DIR/COMP_MA.csv" "data/"
    cp "$DATA_DIR/COMP_RAW.csv" "data/"
    
    # Проверка изменений в Git
    if git diff --quiet; then
        log "📝 Нет изменений в Seeds репозитории"
    else
        if [[ "$NO_COMMIT" == false ]]; then
            log "💾 Коммит изменений..."
            
            git add data/COMP_MA.csv data/COMP_RAW.csv
            git commit -m "Обновление композитного индекса рейтингов $(date '+%Y-%m-%d %H:%M')"
            
            # Попытка отправки в remote
            if git push origin HEAD; then
                success "🚀 Изменения отправлены в Seeds репозиторий"
            else
                error "❌ Ошибка при отправке в Seeds репозиторий"
                exit 1
            fi
        else
            log "🔄 Файлы обновлены локально (без коммита)"
        fi
    fi
else
    error "❌ Seeds репозиторий не найден или не инициализирован"
    log "Клонируйте ваш Pine Seeds репозиторий в: $SEEDS_REPO_DIR"
    exit 1
fi

# Очистка старых логов (оставляем последние 30 дней)
find "$SCRIPT_DIR" -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true

success "🎉 Обновление завершено успешно!"

# Статистика
if [[ -f "$DATA_DIR/COMP_MA.csv" ]]; then
    TOTAL_RECORDS=$(wc -l < "$DATA_DIR/COMP_MA.csv")
    LAST_VALUE=$(tail -n 1 "$DATA_DIR/COMP_MA.csv" | cut -d',' -f5)
    log "📈 Статистика: $((TOTAL_RECORDS-1)) записей, последнее значение: $LAST_VALUE"
fi 