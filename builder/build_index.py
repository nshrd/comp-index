"""
CBMA Builder - построение индекса с использованием универсальных модулей
"""
from src.data.cbma_calculator import CBMACalculator
import json
import pathlib
import sys
import logging
from datetime import datetime

# Добавляем путь к common модулям
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))


# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SRC = pathlib.Path("/app/data/data.json")
DST = pathlib.Path("/app/data/CBMA.json")
DEFAULT_MA_PERIOD = 14


def main():
    """Строит CBMA индекс используя универсальные модули"""
    try:
        logger.info(f"Строим CBMA индекс из {SRC}")

        # Проверяем существование исходного файла
        if not SRC.exists():
            logger.error(f"Исходный файл не найден: {SRC}")
            return 1

        # Создаем калькулятор CBMA
        calculator = CBMACalculator(SRC)

        # Обрабатываем данные с использованием универсальных модулей
        logger.info(f"Обрабатываем данные с MA{DEFAULT_MA_PERIOD}...")
        processed_data = calculator.process_data(
            use_finance=False, ma_period=DEFAULT_MA_PERIOD)

        if not processed_data:
            logger.error("Не удалось обработать данные")
            return 1

        logger.info(f"Обработано {len(processed_data)} точек данных")

        # Формируем данные в формате UDF
        times = []
        values = []

        for item in processed_data:
            times.append(item['timestamp'])
            values.append(item['cbma'])

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

        logger.info(f"Индекс CBMA сохранен в {DST}")

        # Показываем статистику
        stats = calculator.get_statistics()
        logger.info("Статистика CBMA:")
        logger.info(f"  Всего точек: {stats['total_points']}")
        logger.info(
            f"  Период: {stats['date_range']['from']} - {stats['date_range']['to']}")
        logger.info(
            f"  Диапазон CBMA: {stats['cbma']['min']:.2f} - "
            f"{stats['cbma']['max']:.2f}")
        logger.info(f"  Последнее значение: {stats['cbma']['latest']:.2f}")

        logger.info(f"✅ Индекс успешно построен в {datetime.now()}")
        return 0

    except Exception as e:
        logger.error(f"Ошибка при построении индекса: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return 1


if __name__ == "__main__":
    exit(main())
