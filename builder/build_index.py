"""
CBMA14 Builder - построение индекса с использованием универсальных модулей
"""
import json
import pathlib
import sys
import logging
from datetime import datetime

# Добавляем путь к common модулям
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from src.data.cbma14_calculator import CBMA14Calculator

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SRC = pathlib.Path("/app/data/data.json")
DST = pathlib.Path("/app/data/CBMA14.json")
DEFAULT_MA_PERIOD = 14

def main():
    """Строит CBMA14 индекс используя универсальные модули"""
    try:
        logger.info(f"Строим CBMA14 индекс из {SRC}")
        
        # Проверяем существование исходного файла
        if not SRC.exists():
            logger.error(f"Исходный файл не найден: {SRC}")
            return 1
        
        # Создаем калькулятор CBMA14
        calculator = CBMA14Calculator(SRC)
        
        # Обрабатываем данные с использованием универсальных модулей
        logger.info(f"Обрабатываем данные с MA{DEFAULT_MA_PERIOD}...")
        processed_data = calculator.process_data(use_finance=False, ma_period=DEFAULT_MA_PERIOD)
        
        if not processed_data:
            logger.error("Не удалось обработать данные")
            return 1
        
        logger.info(f"Обработано {len(processed_data)} точек данных")
        
        # Формируем данные в формате UDF
        times = []
        values = []
        
        for item in processed_data:
            times.append(item['timestamp'])
            values.append(item['cbma14'])
        
        # UDF формат для history endpoint
        payload = {
            "s": "ok",
            "t": times,
            "o": values,  # open
            "h": values,  # high
            "l": values,  # low
            "c": values,  # close
            "v": [0] * len(values)  # volume (для индекса = 0)
        }
        
        # Сохраняем результат
        DST.parent.mkdir(parents=True, exist_ok=True)
        with open(DST, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Индекс CBMA14 сохранен в {DST}")
        
        # Показываем статистику
        stats = calculator.get_statistics()
        logger.info(f"Статистика CBMA14:")
        logger.info(f"  Всего точек: {stats['total_points']}")
        logger.info(f"  Период: {stats['date_range']['from']} - {stats['date_range']['to']}")
        logger.info(f"  Диапазон CBMA14: {stats['cbma14']['min']:.2f} - {stats['cbma14']['max']:.2f}")
        logger.info(f"  Последнее значение: {stats['cbma14']['latest']:.2f}")
        
        logger.info(f"✅ Индекс успешно построен в {datetime.now()}")
        return 0
        
    except Exception as e:
        logger.error(f"Ошибка при построении индекса: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return 1

if __name__ == "__main__":
    exit(main()) 