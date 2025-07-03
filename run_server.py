#!/usr/bin/env python3
"""
Запуск UDF сервера для CBMA14 Index
"""
import sys
import logging
from pathlib import Path

# Добавляем текущую директорию в PATH
sys.path.insert(0, str(Path(__file__).parent))

from config import config
from src.udf.server import UDFServer

def main():
    """Главная функция"""
    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    logger.info("🚀 Starting CBMA14 Index UDF Server v2.0")
    
    try:
        # Создаем и запускаем сервер
        server = UDFServer(config)
        server.run()
    except KeyboardInterrupt:
        logger.info("👋 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 