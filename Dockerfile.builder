FROM python:3.11-slim

WORKDIR /app

# Устанавливаем зависимости
RUN pip install --no-cache-dir pandas

# Копируем скрипт
COPY builder/build_index.py /app/

# Создаем директорию для данных
RUN mkdir -p /data

CMD ["python", "build_index.py"] 