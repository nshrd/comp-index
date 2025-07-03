#!/usr/bin/env python3
"""
Запуск всех юнит тестов CBMA14 Index
"""
import unittest
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

def run_all_tests():
    """Запуск всех тестов"""
    # Создаем test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Добавляем тесты
    test_modules = [
        'tests.test_cbma14_calculator',
        'tests.test_cbma14_provider', 
        'tests.test_config',
    ]
    
    for module in test_modules:
        try:
            tests = loader.loadTestsFromName(module)
            suite.addTests(tests)
            print(f"✅ Загружены тесты из {module}")
        except Exception as e:
            print(f"❌ Ошибка загрузки тестов из {module}: {e}")
    
    # Запускаем тесты
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Выводим результаты
    print("\n" + "="*50)
    print("РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
    print("="*50)
    print(f"Всего тестов: {result.testsRun}")
    print(f"Успешно: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Ошибки: {len(result.errors)}")
    print(f"Провалы: {len(result.failures)}")
    
    if result.failures:
        print("\nПРОВАЛЫ:")
        for test, traceback in result.failures:
            print(f"  {test}: {traceback}")
    
    if result.errors:
        print("\nОШИБКИ:")
        for test, traceback in result.errors:
            print(f"  {test}: {traceback}")
    
    # Возвращаем код выхода
    return 0 if result.wasSuccessful() else 1


def run_specific_test(test_name):
    """Запуск конкретного теста"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromName(test_name)
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Запуск конкретного теста
        test_name = sys.argv[1]
        exit_code = run_specific_test(test_name)
    else:
        # Запуск всех тестов
        exit_code = run_all_tests()
    
    sys.exit(exit_code) 