"""
Тесты для CBMA14Calculator
"""
import unittest
import json
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, mock_open

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data.cbma14_calculator import CBMA14Calculator


class TestCBMA14Calculator(unittest.TestCase):
    """Тесты для калькулятора CBMA14"""
    
    def setUp(self):
        """Подготовка тестовых данных"""
        # Создаем тестовые данные (только Overall)
        self.test_data = {
            "2022-01-01": {"Overall": 100},
            "2022-01-02": {"Overall": 110},
            "2022-01-03": {"Overall": 105},
            "2022-01-04": {"Overall": 120},
            "2022-01-05": {"Overall": 115},
            "2022-01-06": {"Overall": 125},
            "2022-01-07": {"Overall": 130},
            "2022-01-08": {"Overall": 135},
            "2022-01-09": {"Overall": 140},
            "2022-01-10": {"Overall": 145},
            "2022-01-11": {"Overall": 150},
            "2022-01-12": {"Overall": 155},
            "2022-01-13": {"Overall": 160},
            "2022-01-14": {"Overall": 165},
            "2022-01-15": {"Overall": 170}
        }
        
        # Создаем временный файл для тестов
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        json.dump(self.test_data, self.temp_file)
        self.temp_file.close()
        
        # Создаем экземпляр калькулятора
        self.calculator = CBMA14Calculator(Path(self.temp_file.name))
    
    def tearDown(self):
        """Очистка после тестов"""
        Path(self.temp_file.name).unlink(missing_ok=True)
    
    def test_load_raw_data(self):
        """Тест загрузки сырых данных"""
        data = self.calculator.load_raw_data()
        self.assertEqual(len(data), 15)
        self.assertIn("2022-01-01", data)
        self.assertEqual(data["2022-01-01"]["Overall"], 100)
    
    def test_parse_date(self):
        """Тест парсинга дат"""
        # Корректная дата
        date = self.calculator.parse_date("2022-01-01")
        self.assertEqual(date, datetime(2022, 1, 1))
        
        # Некорректная дата
        date = self.calculator.parse_date("invalid-date")
        self.assertIsNone(date)
    
    def test_calculate_moving_average(self):
        """Тест расчета скользящей средней"""
        values = [100.0, 110.0, 105.0, 120.0, 115.0, 125.0, 130.0, 135.0, 140.0, 145.0, 150.0, 155.0, 160.0, 165.0, 170.0]
        
        # MA с периодом 3
        ma3 = self.calculator.calculate_moving_average(values, period=3)
        expected_ma3 = [
            (100 + 110 + 105) / 3,  # 105.0
            (110 + 105 + 120) / 3,  # 111.67
            (105 + 120 + 115) / 3,  # 113.33
            # и так далее...
        ]
        self.assertEqual(len(ma3), len(values) - 2)  # 13 элементов
        self.assertAlmostEqual(ma3[0], 105.0, places=2)
        self.assertAlmostEqual(ma3[1], 111.67, places=2)
        
        # MA с периодом 14
        ma14 = self.calculator.calculate_moving_average(values, period=14)
        self.assertEqual(len(ma14), 2)  # 15 - 14 + 1 = 2 элемента
        
        # Пустой список при недостаточном количестве данных
        ma_empty = self.calculator.calculate_moving_average(values[:5], period=14)
        self.assertEqual(len(ma_empty), 0)
    
    def test_process_data_overall(self):
        """Тест обработки данных с использованием Overall"""
        processed = self.calculator.process_data(use_finance=False, ma_period=3)
        
        # Должно быть 13 записей (15 - 3 + 1)
        self.assertEqual(len(processed), 13)
        
        # Проверяем структуру данных
        first_item = processed[0]
        self.assertIn('date', first_item)
        self.assertIn('timestamp', first_item)
        self.assertIn('original_value', first_item)
        self.assertIn('cbma14', first_item)
        
        # Проверяем, что данные отсортированы по дате
        dates = [item['date'] for item in processed]
        self.assertEqual(dates, sorted(dates))
    
    def test_process_data_periods(self):
        """Тест обработки данных с разными периодами MA"""
        # Тест с периодом 7
        processed_7 = self.calculator.process_data(use_finance=False, ma_period=7)
        self.assertEqual(len(processed_7), 9)  # 15 - 7 + 1 = 9
        
        # Тест с периодом 14
        processed_14 = self.calculator.process_data(use_finance=False, ma_period=14)
        self.assertEqual(len(processed_14), 2)  # 15 - 14 + 1 = 2
    
    def test_get_cbma14_history(self):
        """Тест получения истории CBMA14"""
        # Сначала обрабатываем данные
        self.calculator.process_data(ma_period=3)
        
        # Получаем всю историю
        history = self.calculator.get_cbma14_history()
        self.assertGreater(len(history), 0)  # Проверяем что есть данные
        
        # Фильтрация по времени
        start_ts = int(datetime(2022, 1, 5).timestamp())
        end_ts = int(datetime(2022, 1, 10).timestamp())
        
        filtered_history = self.calculator.get_cbma14_history(start_ts, end_ts)
        self.assertTrue(len(filtered_history) <= 13)
        
        # Проверяем, что все записи в диапазоне
        for item in filtered_history:
            self.assertGreaterEqual(item['timestamp'], start_ts)
            self.assertLessEqual(item['timestamp'], end_ts)
    
    def test_get_latest_cbma14(self):
        """Тест получения последнего значения CBMA14"""
        latest = self.calculator.get_latest_cbma14()
        self.assertIsNotNone(latest)
        if latest is not None:
            self.assertIn('cbma14', latest)
            self.assertIn('date', latest)
            self.assertEqual(latest['date'], '2022-01-15')  # Последняя дата в тестовых данных
    
    def test_get_statistics(self):
        """Тест получения статистики"""
        stats = self.calculator.get_statistics()
        
        self.assertIn('total_points', stats)
        self.assertIn('date_range', stats)
        self.assertIn('cbma14', stats)
        self.assertIn('original', stats)
        
        # Проверяем структуру статистики CBMA14
        cbma14_stats = stats['cbma14']
        self.assertIn('min', cbma14_stats)
        self.assertIn('max', cbma14_stats)
        self.assertIn('avg', cbma14_stats)
        self.assertIn('latest', cbma14_stats)
        
        # Проверяем логику min/max
        self.assertLessEqual(cbma14_stats['min'], cbma14_stats['max'])
    
    def test_export_to_json(self):
        """Тест экспорта в JSON"""
        # Создаем временный файл для экспорта
        export_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        export_file.close()
        
        try:
            # Экспортируем данные
            success = self.calculator.export_to_json(Path(export_file.name))
            self.assertTrue(success)
            
            # Проверяем содержимое файла
            with open(export_file.name, 'r') as f:
                exported_data = json.load(f)
            
            self.assertIsInstance(exported_data, list)
            self.assertGreater(len(exported_data), 0)
            
            # Проверяем структуру первого элемента
            first_item = exported_data[0]
            self.assertIn('time', first_item)
            self.assertIn('value', first_item)
            self.assertIn('date', first_item)
            
        finally:
            Path(export_file.name).unlink(missing_ok=True)
    
    def test_empty_data_handling(self):
        """Тест обработки пустых данных"""
        # Создаем файл с пустыми данными
        empty_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        json.dump({}, empty_file)
        empty_file.close()
        
        try:
            empty_calculator = CBMA14Calculator(Path(empty_file.name))
            processed = empty_calculator.process_data()
            self.assertEqual(len(processed), 0)
            
            latest = empty_calculator.get_latest_cbma14()
            self.assertIsNone(latest)
            
            stats = empty_calculator.get_statistics()
            self.assertEqual(stats, {})
            
        finally:
            Path(empty_file.name).unlink(missing_ok=True)
    
    def test_missing_file_handling(self):
        """Тест обработки отсутствующего файла"""
        missing_calculator = CBMA14Calculator(Path("/nonexistent/file.json"))
        data = missing_calculator.load_raw_data()
        self.assertEqual(data, {})


if __name__ == '__main__':
    unittest.main() 