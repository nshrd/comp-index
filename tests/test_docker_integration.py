#!/usr/bin/env python3
"""
Тесты Docker интеграции для CBMA14 Index проекта
"""

import unittest
import subprocess
import time
import requests
import json
import os
from pathlib import Path


class TestDockerIntegration(unittest.TestCase):
    """Тесты Docker сборки и интеграции"""
    
    @classmethod
    def setUpClass(cls):
        """Подготовка перед всеми тестами"""
        cls.project_root = Path(__file__).parent.parent
        cls.base_url = "http://localhost"
        cls.udf_port = "8000"
        cls.nginx_port = "80"
        cls.containers_started = False
        
    def setUp(self):
        """Подготовка перед каждым тестом"""
        self.addCleanup(self._cleanup_containers)
        
    def _cleanup_containers(self):
        """Очистка контейнеров после тестов"""
        try:
            subprocess.run(
                ["docker", "compose", "down", "-v", "--remove-orphans"],
                cwd=self.project_root,
                capture_output=True
            )
        except Exception:
            pass
    
    def _run_command(self, cmd, cwd=None, timeout=30):
        """Запуск команды с таймаутом"""
        if cwd is None:
            cwd = self.project_root
            
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result
        except subprocess.TimeoutExpired:
            self.fail(f"Команда {' '.join(cmd)} превысила таймаут {timeout}с")
    
    def test_dockerfile_builder_exists(self):
        """Тест: проверка существования Dockerfile.builder"""
        dockerfile_path = self.project_root / "Dockerfile.builder"
        self.assertTrue(dockerfile_path.exists(), "Dockerfile.builder должен существовать")
        
        # Проверяем базовые инструкции
        content = dockerfile_path.read_text()
        self.assertIn("FROM python:", content, "Должен использовать Python базовый образ")
        self.assertIn("COPY requirements.txt", content, "Должен копировать requirements.txt")
        self.assertIn("RUN pip install", content, "Должен устанавливать зависимости")
    
    def test_dockerfile_udf_exists(self):
        """Тест: проверка существования Dockerfile.udf"""
        dockerfile_path = self.project_root / "Dockerfile.udf"
        self.assertTrue(dockerfile_path.exists(), "Dockerfile.udf должен существовать")
        
        content = dockerfile_path.read_text()
        self.assertIn("FROM python:", content, "Должен использовать Python базовый образ")
        self.assertIn("COPY src/", content, "Должен копировать исходный код")
        self.assertIn("HEALTHCHECK", content, "Должен содержать healthcheck")
    
    def test_docker_compose_file_exists(self):
        """Тест: проверка docker-compose.yml"""
        compose_path = self.project_root / "docker-compose.yml"
        self.assertTrue(compose_path.exists(), "docker-compose.yml должен существовать")
        
        content = compose_path.read_text()
        self.assertIn("builder:", content, "Должен содержать сервис builder")
        self.assertIn("udf:", content, "Должен содержать сервис udf")
        self.assertIn("nginx:", content, "Должен содержать сервис nginx")
    
    def test_docker_images_build(self):
        """Тест: сборка Docker образов"""
        print("\n🔨 Сборка Docker образов...")
        
        # Сборка builder образа
        result = self._run_command([
            "docker", "build", 
            "-f", "Dockerfile.builder",
            "-t", "cbma14-builder:test",
            "."
        ], timeout=120)
        
        self.assertEqual(result.returncode, 0, 
                        f"Ошибка сборки builder образа:\n{result.stderr}")
        
        # Сборка UDF образа
        result = self._run_command([
            "docker", "build",
            "-f", "Dockerfile.udf", 
            "-t", "cbma14-udf:test",
            "."
        ], timeout=120)
        
        self.assertEqual(result.returncode, 0,
                        f"Ошибка сборки UDF образа:\n{result.stderr}")
        
        print("✅ Образы собраны успешно")
    
    def test_docker_compose_up(self):
        """Тест: запуск через docker-compose"""
        print("\n🚀 Запуск docker-compose...")
        
        # Остановка существующих контейнеров
        self._run_command(["docker", "compose", "down", "-v"])
        
        # Запуск в фоновом режиме
        result = self._run_command([
            "docker", "compose", "up", "-d", "--build"
        ], timeout=180)
        
        self.assertEqual(result.returncode, 0,
                        f"Ошибка запуска docker-compose:\n{result.stderr}")
        
        # Ждем запуска сервисов
        print("⏳ Ожидание запуска сервисов...")
        time.sleep(15)
        
        # Проверяем статус контейнеров
        result = self._run_command(["docker", "compose", "ps", "--format", "json"])
        if result.returncode == 0:
            try:
                containers = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
                running_containers = [c for c in containers if 'running' in c.get('State', '').lower()]
                self.assertGreater(len(running_containers), 0, "Должен быть хотя бы один запущенный контейнер")
                print(f"✅ Запущено контейнеров: {len(running_containers)}")
            except json.JSONDecodeError:
                self.fail("Не удалось распарсить статус контейнеров")
        
        self.__class__.containers_started = True
    
    def test_udf_service_health(self):
        """Тест: проверка здоровья UDF сервиса"""
        if not self.containers_started:
            self.skipTest("Контейнеры не запущены")
        
        print("\n🏥 Проверка здоровья UDF сервиса...")
        
        # Ждем полного запуска
        max_attempts = 30
        for attempt in range(max_attempts):
            try:
                response = requests.get(f"{self.base_url}:{self.udf_port}/status", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.assertIn('status', data)
                    self.assertEqual(data['status'], 'healthy')
                    print("✅ UDF сервис здоров")
                    return
            except requests.exceptions.RequestException:
                pass
            
            time.sleep(2)
        
        self.fail("UDF сервис недоступен после 60 секунд ожидания")
    
    def test_nginx_service_accessibility(self):
        """Тест: доступность через Nginx"""
        if not self.containers_started:
            self.skipTest("Контейнеры не запущены") 
        
        print("\n🌐 Проверка доступности Nginx...")
        
        # Проверяем главную страницу
        max_attempts = 20
        for attempt in range(max_attempts):
            try:
                response = requests.get(f"{self.base_url}:{self.nginx_port}/", timeout=5)
                if response.status_code == 200:
                    self.assertIn('text/html', response.headers.get('content-type', ''))
                    print("✅ Nginx доступен")
                    return
            except requests.exceptions.RequestException:
                pass
            
            time.sleep(2)
        
        self.fail("Nginx недоступен после 40 секунд ожидания")
    
    def test_api_endpoints(self):
        """Тест: проверка API эндпоинтов"""
        if not self.containers_started:
            self.skipTest("Контейнеры не запущены")
        
        print("\n🔌 Проверка API эндпоинтов...")
        
        endpoints_to_test = [
            ("/config", 200),
            ("/search", 200),
            ("/history", 200),
            ("/get_cbma14_history", 200)
        ]
        
        for endpoint, expected_status in endpoints_to_test:
            with self.subTest(endpoint=endpoint):
                try:
                    response = requests.get(
                        f"{self.base_url}:{self.udf_port}{endpoint}",
                        timeout=10
                    )
                    self.assertEqual(response.status_code, expected_status,
                                   f"Неожиданный статус для {endpoint}")
                    
                    # Проверяем что ответ валидный JSON для API эндпоинтов
                    if endpoint != "/":
                        try:
                            response.json()
                        except json.JSONDecodeError:
                            self.fail(f"Эндпоинт {endpoint} не возвращает валидный JSON")
                    
                    print(f"✅ {endpoint} работает корректно")
                    
                except requests.exceptions.RequestException as e:
                    self.fail(f"Ошибка запроса к {endpoint}: {e}")
    
    def test_data_processing_integration(self):
        """Тест: интеграция обработки данных"""
        if not self.containers_started:
            self.skipTest("Контейнеры не запущены")
        
        print("\n📊 Проверка обработки данных...")
        
        try:
            # Проверяем что можем получить данные CBMA14
            response = requests.get(
                f"{self.base_url}:{self.udf_port}/get_cbma14_history",
                params={"symbol": "BTC", "limit": 100},
                timeout=15
            )
            
            self.assertEqual(response.status_code, 200, "API должен возвращать 200")
            
            data = response.json()
            self.assertIn('data', data, "Ответ должен содержать поле 'data'")
            
            if data['data'] != "no_data":
                self.assertIsInstance(data['data'], list, "Данные должны быть списком")
                if len(data['data']) > 0:
                    # Проверяем структуру первого элемента
                    first_item = data['data'][0]
                    self.assertIn('time', first_item, "Каждый элемент должен содержать 'time'")
                    self.assertIn('value', first_item, "Каждый элемент должен содержать 'value'")
            
            print("✅ Обработка данных работает корректно")
            
        except requests.exceptions.RequestException as e:
            self.fail(f"Ошибка при проверке обработки данных: {e}")
    
    def test_environment_variables(self):
        """Тест: проверка переменных окружения"""
        print("\n🔧 Проверка переменных окружения...")
        
        # Проверяем наличие .env файла или env.example
        env_file = self.project_root / ".env"
        env_example = self.project_root / "env.example"
        
        self.assertTrue(
            env_file.exists() or env_example.exists(),
            "Должен существовать .env или env.example файл"
        )
        
        if env_example.exists():
            content = env_example.read_text()
            required_vars = ["COINGLASS_API_KEY", "UDF_HOST", "UDF_PORT"]
            
            for var in required_vars:
                self.assertIn(var, content, f"Переменная {var} должна быть в env.example")
        
        print("✅ Конфигурация переменных окружения корректна")
    
    def test_docker_compose_profiles(self):
        """Тест: проверка профилей docker-compose"""
        print("\n📋 Проверка профилей docker-compose...")
        
        # Проверяем запуск с nginx профилем
        result = self._run_command([
            "docker", "compose", "--profile", "nginx", "config"
        ])
        
        self.assertEqual(result.returncode, 0, 
                        f"Ошибка валидации nginx профиля:\n{result.stderr}")
        
        # Проверяем что в конфиге есть все нужные сервисы
        config_output = result.stdout
        self.assertIn("nginx:", config_output, "Nginx сервис должен быть в конфиге")
        self.assertIn("udf:", config_output, "UDF сервис должен быть в конфиге")
        
        print("✅ Профили docker-compose корректны")


if __name__ == '__main__':
    # Настраиваем вывод тестов
    unittest.main(verbosity=2, buffer=True) 