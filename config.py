"""
Configuration for CBMA14 Index project
Cross-platform configuration with environment variables support
"""
import os
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

# Добавляем корневую директорию в PYTHONPATH для импортов
ROOT_DIR = Path(__file__).parent.absolute()
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Загружаем переменные из .env файла
load_dotenv()


@dataclass
class CoinglassConfig:
    """Конфигурация для Coinglass API"""
    api_key: Optional[str] = None
    base_url: str = "https://open-api-v4.coinglass.com"
    request_delay: float = 0.5  # секунды между запросами
    cache_duration: int = 300   # секунды кэширования
    
    def __post_init__(self):
        if not self.api_key:
            self.api_key = os.getenv('COINGLASS_API_KEY')
        # Поддержка переменной окружения для базового URL
        self.base_url = os.getenv('COINGLASS_BASE_URL', self.base_url)


@dataclass
class UDFConfig:
    """Конфигурация для UDF сервера"""
    host: str = "0.0.0.0"
    port: int = 8001  # Исправлен порт на 8001
    debug: bool = False
    data_file: Optional[Path] = None
    cbma14_symbol: str = "CBMA14"
    btc_symbol: str = "BTCUSDT"
    
    def __post_init__(self):
        # Получаем значения из переменных окружения
        self.host = os.getenv('UDF_HOST', self.host)
        self.port = int(os.getenv('UDF_PORT', self.port))
        self.debug = os.getenv('UDF_DEBUG', 'false').lower() == 'true'
        
        # Настраиваем путь к файлу данных
        data_file_path = os.getenv('DATA_OUTPUT_FILE', 'data/CBMA14.json')
        if not Path(data_file_path).is_absolute():
            self.data_file = ROOT_DIR / data_file_path
        else:
            self.data_file = Path(data_file_path)


@dataclass
class ChartConfig:
    """Конфигурация для веб-интерфейса"""
    title: str = "CBMA14 Index - Cryptocurrency Composite Index"
    udf_url: Optional[str] = None
    auto_refresh_interval: int = 60000  # миллисекунды
    chart_theme: str = "light"
    
    # Цвета для графика
    btc_up_color: str = "#00D4AA"
    btc_down_color: str = "#FF4976"
    cbma14_color: str = "#2962FF"
    background_color: str = "#ffffff"
    text_color: str = "#1a202c"
    grid_color: str = "rgba(197, 203, 206, 0.3)"
    
    def __post_init__(self):
        # Получаем URL API из переменных окружения
        self.udf_url = os.getenv('FRONTEND_API_URL', f'http://localhost:8001')


@dataclass
class BuilderConfig:
    """Конфигурация для Builder"""
    input_file: Optional[Path] = None
    output_file: Optional[Path] = None
    ma_period: int = 14
    update_interval: int = 3600  # секунды (1 час)
    
    def __post_init__(self):
        # Получаем значения из переменных окружения
        self.ma_period = int(os.getenv('BUILDER_MA_PERIOD', self.ma_period))
        self.update_interval = int(os.getenv('BUILDER_UPDATE_INTERVAL', self.update_interval))
        
        # Настраиваем пути к файлам
        input_path = os.getenv('DATA_INPUT_FILE', 'data/data.json')
        output_path = os.getenv('DATA_OUTPUT_FILE', 'data/CBMA14.json')
        
        if not Path(input_path).is_absolute():
            self.input_file = ROOT_DIR / input_path
        else:
            self.input_file = Path(input_path)
            
        if not Path(output_path).is_absolute():
            self.output_file = ROOT_DIR / output_path
        else:
            self.output_file = Path(output_path)


@dataclass
class NginxConfig:
    """Конфигурация для Nginx"""
    port: int = 8080
    ssl_port: int = 8443
    
    def __post_init__(self):
        self.port = int(os.getenv('NGINX_PORT', self.port))
        self.ssl_port = int(os.getenv('NGINX_SSL_PORT', self.ssl_port))


@dataclass
class LoggingConfig:
    """Конфигурация логирования"""
    level: str = "INFO"
    log_dir: Optional[Path] = None
    
    def __post_init__(self):
        self.level = os.getenv('LOG_LEVEL', self.level)
        log_dir_path = os.getenv('LOG_DIR', 'logs')
        
        if not Path(log_dir_path).is_absolute():
            self.log_dir = ROOT_DIR / log_dir_path
        else:
            self.log_dir = Path(log_dir_path)
        
        # Создаем директорию для логов
        self.log_dir.mkdir(exist_ok=True)


@dataclass
class AppConfig:
    """Основная конфигурация приложения"""
    coinglass: CoinglassConfig
    udf: UDFConfig
    chart: ChartConfig
    builder: BuilderConfig
    nginx: NginxConfig
    logging: LoggingConfig
    
    # Метаданные проекта
    project_name: str = "CBMA14 Index"
    version: str = "2.1.0"
    environment: str = "production"
    
    def __post_init__(self):
        self.environment = os.getenv('FLASK_ENV', self.environment)
    
    @classmethod
    def load(cls) -> 'AppConfig':
        """Загрузить конфигурацию"""
        return cls(
            coinglass=CoinglassConfig(),
            udf=UDFConfig(),
            chart=ChartConfig(),
            builder=BuilderConfig(),
            nginx=NginxConfig(),
            logging=LoggingConfig()
        )
    
    def get_data_dir(self) -> Path:
        """Получить директорию с данными"""
        return ROOT_DIR / "data"
    
    def get_logs_dir(self) -> Path:
        """Получить директорию с логами"""
        return self.logging.log_dir or (ROOT_DIR / "logs")
    
    def is_development(self) -> bool:
        """Проверить, запущено ли в режиме разработки"""
        return self.environment.lower() in ['development', 'dev', 'debug']
    
    def is_production(self) -> bool:
        """Проверить, запущено ли в продакшене"""
        return self.environment.lower() in ['production', 'prod']


# Глобальная конфигурация
config = AppConfig.load()

# Экспортируем для обратной совместимости
AppConfig = AppConfig 