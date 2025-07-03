"""
Тесты для CBMA14Provider
"""
import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data.cbma14_provider import CBMA14Provider


class TestCBMA14Provider(unittest.TestCase):
    """Тесты для провайдера CBMA14"""
    
    def setUp(self):
        """Подготовка тестовых данных"""
        # Создаем тестовые данные в формате UDF
        self.test_udf_data = {
            "s": "ok",
            "t": [1640995200, 1641081600, 1641168000, 1641254400, 1641340800],
            "c": [100.5, 102.3, 98.7, 105.1, 103.8],
            "o": [100.5, 102.3, 98.7, 105.1, 103.8],
            "h": [100.5, 102.3, 98.7, 105.1, 103.8],
            "l": [100.5, 102.3, 98.7, 105.1, 103.8],
            "v": [0, 0, 0, 0, 0]
        }
        
        # Создаем временный файл с данными
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        json.dump(self.test_udf_data, self.temp_file)
        self.temp_file.close()
        
        # Создаем провайдер
        self.provider = CBMA14Provider(Path(self.temp_file.name))
    
    def tearDown(self):
        """Очистка после тестов"""
        Path(self.temp_file.name).unlink(missing_ok=True)
    
    def test_get_symbol_info_cbma14(self):
        """Тест получения информации о символе CBMA14"""
        info = self.provider.get_symbol_info("CBMA14")
        self.assertIsNotNone(info)
        if info is not None:
            self.assertEqual(info["name"], "CBMA14")
            self.assertEqual(info["ticker"], "CBMA14")
            self.assertEqual(info["type"], "index")
    
    def test_get_symbol_info_unknown(self):
        """Тест получения информации о неизвестном символе"""
        info = self.provider.get_symbol_info("UNKNOWN")
        self.assertIsNone(info)
    
    def test_get_history_from_file(self):
        """Тест получения истории из файла"""
        result = self.provider.get_history("CBMA14", 0, 9999999999)
        
        self.assertEqual(result["s"], "ok")
        self.assertIn("t", result)
        self.assertIn("c", result)
        self.assertEqual(len(result["t"]), len(result["c"]))
        self.assertGreater(len(result["t"]), 0)
    
    def test_get_history_unknown_symbol(self):
        """Тест получения истории для неизвестного символа"""
        result = self.provider.get_history("UNKNOWN", 0, 9999999999)
        
        self.assertEqual(result["s"], "error")
        self.assertIn("errmsg", result)
    
    def test_search_symbols(self):
        """Тест поиска символов"""
        results = self.provider.search_symbols("CBMA14")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["symbol"], "CBMA14")


if __name__ == '__main__':
    unittest.main() 