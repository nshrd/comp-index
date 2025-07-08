"""
CBMA Calculator - расчет индекса с применением 14-периодной скользящей средней
"""
import json
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Добавляем путь к common модулям
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Используем стандартные библиотеки Python вместо legacy модулей

logger = logging.getLogger(__name__)


class CBMACalculator:
    """Калькулятор для расчета CBMA индекса"""

    def __init__(self, data_file: Path):
        self.data_file = data_file
        self._raw_data = None
        self._processed_data = None

    def load_raw_data(self) -> Dict:
        """Загрузить сырые данные из JSON файла"""
        if self._raw_data is None:
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    self._raw_data = json.load(f)
                logger.info(f"Loaded {len(self._raw_data)} raw data points")
            except Exception as e:
                logger.error(f"Error loading data from {self.data_file}: {e}")
                self._raw_data = {}

        return self._raw_data

    def parse_date(self, date_str: str) -> Optional[datetime]:
        """Парсинг даты из строки (встроенная реализация)"""
        formats = [
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
            "%d.%m.%Y",
            "%d/%m/%Y",
            "%a, %b %d, %y",  # Поддержка формата "Fri, Jul 4, 25"
            "%A, %B %d, %Y",  # Поддержка формата "Friday, July 4, 2025"
        ]

        for fmt in formats:
            try:
                parsed = datetime.strptime(date_str, fmt)
                # Если год меньше 100, добавляем 2000 (для формата %y)
                if parsed.year < 100:
                    parsed = parsed.replace(year=parsed.year + 2000)
                return parsed
            except ValueError:
                continue

        return None

    def calculate_moving_average(
        self, values: List[float], period: int = 14
    ) -> List[float]:
        """
        Расчет простой скользящей средней (оптимизированная версия)

        Args:
            values: Список значений
            period: Период для расчета (по умолчанию 14)

        Returns:
            Список значений скользящей средней
        """
        if not values or len(values) < period:
            return []

        # Оптимизированный алгоритм SMA с скользящим окном
        result = []
        window_sum = sum(values[:period])
        result.append(window_sum / period)

        # Скользящее окно для остальных значений
        for i in range(period, len(values)):
            window_sum = window_sum - values[i - period] + values[i]
            result.append(window_sum / period)

        return result

    def process_data(
        self, use_finance: bool = False, ma_period: int = 14
    ) -> List[Dict]:
        """
        Обработка данных и расчет CBMA

        Args:
            use_finance: Использовать Finance или Overall данные (игнорируется в новом формате)
            ma_period: Период для скользящей средней (7, 14, 30)

        Returns:
            Список обработанных данных с CBMA
        """
        raw_data = self.load_raw_data()
        if not raw_data:
            return []

        # Проверяем новый формат данных с массивом data
        if "data" in raw_data and isinstance(raw_data["data"], list):
            # Новый формат с массивом data
            sorted_items = []
            for item in raw_data["data"]:
                if "date" in item and "rank" in item:
                    parsed_date = self.parse_date(item["date"])
                    if parsed_date:
                        sorted_items.append(
                            {
                                "date": parsed_date,
                                "date_str": item["date"],
                                "value": float(item["rank"]),
                                "timestamp": int(parsed_date.timestamp()),
                            }
                        )
        else:
            # Старый формат (словарь с датами как ключами)
            sorted_items = []
            for date_str, values in raw_data.items():
                parsed_date = self.parse_date(date_str)
                if parsed_date and (
                    use_finance
                    and "Finance" in values
                    or not use_finance
                    and "Overall" in values
                ):
                    value = values.get("Finance" if use_finance else "Overall", 0)
                    sorted_items.append(
                        {
                            "date": parsed_date,
                            "date_str": date_str,
                            "value": float(value),
                            "timestamp": int(parsed_date.timestamp()),
                        }
                    )

        # Сортируем по дате
        sorted_items.sort(key=lambda x: x["date"])

        if sorted_items:
            logger.info(
                f"Sorted {len(sorted_items)} data points from {sorted_items[0]['date_str']} to {sorted_items[-1]['date_str']}"
            )
        else:
            logger.info("Sorted 0 data points from N/A to N/A")

        # Извлекаем значения для расчета MA
        values = [item["value"] for item in sorted_items]

        # Рассчитываем скользящую среднюю с заданным периодом
        ma_values = self.calculate_moving_average(values, period=ma_period)

        # Формируем результат
        result = []
        ma_start_index = ma_period - 1  # Первые (period-1) значений не имеют MA

        for i, ma_value in enumerate(ma_values):
            original_index = ma_start_index + i
            if original_index < len(sorted_items):
                item = sorted_items[original_index]
                result.append(
                    {
                        "date": item["date_str"],
                        "timestamp": item["timestamp"],
                        "original_value": item["value"],
                        "cbma": round(ma_value, 2),
                    }
                )

        logger.info(f"Calculated CBMA for {len(result)} data points")
        self._processed_data = result
        return result

    def get_cbma_history(
        self, from_timestamp: int = 0, to_timestamp: int = None, ma_period: int = 14
    ) -> List[Dict]:
        """
        Получить историю CBMA в заданном временном диапазоне

        Args:
            from_timestamp: Начальная временная метка (в секундах)
            to_timestamp: Конечная временная метка (в секундах)
            ma_period: Период для скользящей средней

        Returns:
            Отфильтрованные данные CBMA
        """
        if (
            self._processed_data is None
            or getattr(self, "_last_ma_period", None) != ma_period
        ):
            self._processed_data = self.process_data(ma_period=ma_period)
            self._last_ma_period = ma_period

        if to_timestamp is None:
            to_timestamp = int(datetime.now().timestamp())

        filtered_data = []
        for item in self._processed_data:
            if from_timestamp <= item["timestamp"] <= to_timestamp:
                filtered_data.append(item)

        return filtered_data

    def get_latest_cbma(self) -> Optional[Dict]:
        """Получить последнее значение CBMA"""
        if self._processed_data is None:
            self.process_data()

        return self._processed_data[-1] if self._processed_data else None

    def get_statistics(self) -> Dict:
        """Получить статистику по данным"""
        if self._processed_data is None:
            self.process_data()

        if not self._processed_data:
            return {}

        cbma_values = [item["cbma"] for item in self._processed_data]
        original_values = [item["original_value"] for item in self._processed_data]

        return {
            "total_points": len(self._processed_data),
            "date_range": {
                "from": self._processed_data[0]["date"],
                "to": self._processed_data[-1]["date"],
            },
            "cbma": {
                "min": min(cbma_values),
                "max": max(cbma_values),
                "avg": sum(cbma_values) / len(cbma_values),
                "latest": cbma_values[-1],
            },
            "original": {
                "min": min(original_values),
                "max": max(original_values),
                "avg": sum(original_values) / len(original_values),
                "latest": original_values[-1],
            },
        }

    def export_to_json(self, output_file: Path) -> bool:
        """
        Экспорт обработанных данных в JSON файл

        Args:
            output_file: Путь к выходному файлу

        Returns:
            True если успешно, False если ошибка
        """
        if self._processed_data is None:
            self.process_data()

        try:
            # Преобразуем в формат для UDF сервера
            udf_format = []
            for item in self._processed_data:
                udf_format.append(
                    {
                        "time": item["timestamp"],
                        "value": item["cbma"],
                        "date": item["date"],
                    }
                )

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(udf_format, f, indent=2, ensure_ascii=False)

            logger.info(f"Exported {len(udf_format)} CBMA data points to {output_file}")
            return True

        except Exception as e:
            logger.error(f"Error exporting to {output_file}: {e}")
            return False


def main():
    """Тестовая функция"""
    from pathlib import Path

    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Путь к данным
    data_file = Path(__file__).parent.parent.parent / "data" / "data.json"

    if not data_file.exists():
        print(f"❌ Data file not found: {data_file}")
        return 1

    # Создаем калькулятор
    calculator = CBMACalculator(data_file)

    # Обрабатываем данные
    print("🔄 Processing data...")
    processed_data = calculator.process_data(use_finance=False)

    if not processed_data:
        print("❌ No data processed")
        return 1

    # Показываем статистику
    stats = calculator.get_statistics()
    print("\n📊 CBMA Statistics:")
    print(f"  Total points: {stats['total_points']}")
    print(f"  Date range: {stats['date_range']['from']} to {stats['date_range']['to']}")
    print(f"  CBMA range: {stats['cbma']['min']:.2f} - {stats['cbma']['max']:.2f}")
    print(f"  Latest CBMA: {stats['cbma']['latest']:.2f}")

    # Показываем последние 5 значений
    print("\n📈 Latest 5 CBMA values:")
    for item in processed_data[-5:]:
        print(f"  {item['date']}: {item['original_value']} → {item['cbma']}")

    # Экспортируем в CBMA.json
    output_file = Path(__file__).parent.parent.parent / "data" / "CBMA.json"
    if calculator.export_to_json(output_file):
        print(f"\n✅ Exported to {output_file}")
    else:
        print(f"\n❌ Failed to export to {output_file}")

    return 0


if __name__ == "__main__":
    exit(main())
