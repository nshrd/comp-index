FROM python:3.11-slim

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем requirements.txt для кэширования слоев
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Создаем необходимые директории
RUN mkdir -p /app/src/data /app/builder /app/data /app/logs

# Копируем исходный код
COPY config.py .
COPY src/__init__.py src/
COPY src/data/__init__.py src/data/
COPY src/data/*.py src/data/
COPY builder/ builder/

# Устанавливаем переменные окружения
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Создаем пользователя для безопасности
RUN useradd -m -u 1000 cbma && chown -R cbma:cbma /app
USER cbma

# Проверка здоровья
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD test -f /app/data/CBMA.json || exit 1

# Команда по умолчанию
CMD ["python", "builder/build_index.py"] 