FROM python:3.11-slim

WORKDIR /app

# Копируем requirements и устанавливаем зависимости
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходные файлы
COPY builder/build_index.py /app/
COPY src/ /app/src/
COPY config.py /app/

# Создаем директории и __init__.py файлы для Python пакетов
RUN mkdir -p /app/src/data /app/src/udf
RUN touch /app/__init__.py
RUN touch /app/src/__init__.py
RUN touch /app/src/data/__init__.py

# Добавляем /app в PYTHONPATH
ENV PYTHONPATH=/app

# Создаем директорию для данных
RUN mkdir -p /data

CMD ["python", "build_index.py"] 