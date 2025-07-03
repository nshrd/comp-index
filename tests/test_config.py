"""
Тесты для конфигурации
"""
import unittest
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import AppConfig, CoinglassConfig, UDFConfig, ChartConfig


class TestConfig(unittest.TestCase):
    """Тесты для конфигурации приложения"""
    
    def setUp(self):
        """Подготовка тестов"""
        # Сохраняем оригинальные переменные окружения
        self.original_env = os.environ.copy()
    
    def tearDown(self):
        """Очистка после тестов"""
        # Восстанавливаем оригинальные переменные окружения
        os.environ.clear()
        os.environ.update(self.original_env)
    
    def test_coinglass_config_default(self):
        """Тест создания конфигурации Coinglass по умолчанию"""
        # Временно удаляем API ключ из окружения для чистого теста
        original_key = os.environ.pop('COINGLASS_API_KEY', None)
        try:
            config = CoinglassConfig()
            
            self.assertIsNone(config.api_key)
            self.assertEqual(config.base_url, "https://open-api.coinglass.com/public/v2")
            self.assertEqual(config.request_delay, 0.5)
            self.assertEqual(config.cache_duration, 300)
        finally:
            # Восстанавливаем API ключ если он был
            if original_key:
                os.environ['COINGLASS_API_KEY'] = original_key
    
    def test_coinglass_config_from_env(self):
        """Тест загрузки конфигурации Coinglass из переменных окружения"""
        test_api_key = "test_api_key_123"
        os.environ['COINGLASS_API_KEY'] = test_api_key
        
        config = CoinglassConfig()
        self.assertEqual(config.api_key, test_api_key)
    
    def test_udf_config_default(self):
        """Тест создания конфигурации UDF по умолчанию"""
        config = UDFConfig()
        
        self.assertEqual(config.host, "0.0.0.0")
        self.assertEqual(config.port, 8000)
        self.assertFalse(config.debug)
        self.assertEqual(config.cbma14_symbol, "CBMA14")
        self.assertEqual(config.btc_symbol, "BTCUSDT")
    
    def test_udf_config_from_env(self):
        """Тест загрузки конфигурации UDF из переменных окружения"""
        os.environ['UDF_HOST'] = '127.0.0.1'
        os.environ['UDF_PORT'] = '9000'
        os.environ['UDF_DEBUG'] = 'true'
        
        config = UDFConfig()
        
        self.assertEqual(config.host, '127.0.0.1')
        self.assertEqual(config.port, 9000)
        self.assertTrue(config.debug)
    
    def test_chart_config_default(self):
        """Тест создания конфигурации Chart по умолчанию"""
        config = ChartConfig()
        
        self.assertEqual(config.title, "CBMA14 Index - Cryptocurrency Composite Index")
        self.assertEqual(config.auto_refresh_interval, 60000)
        self.assertEqual(config.chart_theme, "light")
        self.assertEqual(config.btc_up_color, "#00D4AA")
        self.assertEqual(config.btc_down_color, "#FF4976")
        self.assertEqual(config.cbma14_color, "#2962FF")
    
    def test_chart_config_from_env(self):
        """Тест загрузки конфигурации Chart из переменных окружения"""
        test_url = 'http://test.example.com:8000'
        os.environ['FRONTEND_API_URL'] = test_url
        
        config = ChartConfig()
        self.assertEqual(config.udf_url, test_url)
    
    def test_app_config_load(self):
        """Тест загрузки основной конфигурации приложения"""
        # Устанавливаем тестовые переменные окружения
        os.environ['COINGLASS_API_KEY'] = 'test_key'
        os.environ['UDF_PORT'] = '9000'
        os.environ['FLASK_ENV'] = 'development'
        
        config = AppConfig.load()
        
        # Проверяем, что все компоненты загружены
        self.assertIsInstance(config.coinglass, CoinglassConfig)
        self.assertIsInstance(config.udf, UDFConfig)
        self.assertIsInstance(config.chart, ChartConfig)
        
        # Проверяем загрузку переменных окружения
        self.assertEqual(config.coinglass.api_key, 'test_key')
        self.assertEqual(config.udf.port, 9000)
        self.assertEqual(config.environment, 'development')
        
        # Проверяем метаданные
        self.assertEqual(config.project_name, "CBMA14 Index")
        self.assertEqual(config.version, "2.1.0")
    
    def test_app_config_methods(self):
        """Тест методов AppConfig"""
        config = AppConfig.load()
        
        # Тест получения директорий
        data_dir = config.get_data_dir()
        self.assertIsInstance(data_dir, Path)
        self.assertTrue(str(data_dir).endswith('data'))
        
        logs_dir = config.get_logs_dir()
        self.assertIsInstance(logs_dir, Path)
        
        # Тест определения окружения (по умолчанию production)
        self.assertTrue(config.is_production())
        self.assertFalse(config.is_development())
        
        # Тест с development окружением
        os.environ['FLASK_ENV'] = 'development'
        dev_config = AppConfig.load()
        self.assertTrue(dev_config.is_development())
        self.assertFalse(dev_config.is_production())
    
    def test_data_file_paths(self):
        """Тест путей к файлам данных"""
        # Тест с относительным путем
        os.environ['DATA_OUTPUT_FILE'] = 'test_data/output.json'
        config = UDFConfig()
        
        self.assertIsInstance(config.data_file, Path)
        self.assertTrue(str(config.data_file).endswith('test_data/output.json'))
        
        # Тест с абсолютным путем
        abs_path = '/tmp/test_output.json'
        os.environ['DATA_OUTPUT_FILE'] = abs_path
        config2 = UDFConfig()
        
        self.assertEqual(str(config2.data_file), abs_path)
    
    def test_environment_variables_cleanup(self):
        """Тест что переменные окружения правильно обрабатываются"""
        # Тест булевых значений
        test_cases = [
            ('true', True),
            ('True', True),
            ('TRUE', True),
            ('false', False),
            ('False', False),
            ('FALSE', False),
            ('yes', False),  # Только 'true' должно быть True
            ('1', False),    # Только 'true' должно быть True
        ]
        
        for env_val, expected in test_cases:
            os.environ['UDF_DEBUG'] = env_val
            config = UDFConfig()
            self.assertEqual(config.debug, expected, f"Failed for '{env_val}'")
    
    def test_integer_conversion(self):
        """Тест конвертации строк в числа"""
        os.environ['UDF_PORT'] = '8080'
        os.environ['BUILDER_MA_PERIOD'] = '21'
        
        from config import BuilderConfig
        
        udf_config = UDFConfig()
        builder_config = BuilderConfig()
        
        self.assertEqual(udf_config.port, 8080)
        self.assertEqual(builder_config.ma_period, 21)
    
    def test_invalid_integer_handling(self):
        """Тест обработки некорректных числовых значений"""
        os.environ['UDF_PORT'] = 'not_a_number'
        
        # Должно возникнуть исключение или использоваться значение по умолчанию
        try:
            config = UDFConfig()
            # Если исключение не возникло, проверяем что используется значение по умолчанию
            self.assertEqual(config.port, 8000)  # default value
        except ValueError:
            # Это тоже допустимое поведение
            pass


if __name__ == '__main__':
    unittest.main() 