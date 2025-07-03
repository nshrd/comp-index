"""
Configuration for CBMA14 Index project
"""
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

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


@dataclass
class UDFConfig:
    """Конфигурация для UDF сервера"""
    host: str = "0.0.0.0"
    port: int = 8888
    debug: bool = False
    data_file: Path = Path("data/CBMA14.json")
    cbma14_symbol: str = "CBMA14"
    btc_symbol: str = "BTCUSDT"
    
    def __post_init__(self):
        # Преобразуем относительный путь в абсолютный
        if not self.data_file.is_absolute():
            self.data_file = Path(__file__).parent / self.data_file


@dataclass
class ChartConfig:
    """Конфигурация для веб-интерфейса"""
    title: str = "Bitcoin / USD with Coinbase MA14 Index"
    udf_url: str = "http://localhost:8888"
    auto_refresh_interval: int = 60000  # миллисекунды
    chart_theme: str = "dark"
    
    # Цвета для графика
    btc_up_color: str = "#26a69a"
    btc_down_color: str = "#ef5350"
    cbma14_color: str = "#2962FF"
    background_color: str = "#1e222d"
    text_color: str = "#d1d4dc"
    grid_color: str = "#2a2e39"


@dataclass
class BuilderConfig:
    """Конфигурация для Builder"""
    input_file: Path = Path("data/data.json")
    output_file: Path = Path("data/CBMA14.json")
    ma_period: int = 14
    update_interval: int = 3600  # секунды (1 час)
    
    def __post_init__(self):
        if not self.input_file.is_absolute():
            self.input_file = Path(__file__).parent / self.input_file
        if not self.output_file.is_absolute():
            self.output_file = Path(__file__).parent / self.output_file


@dataclass
class AppConfig:
    """Основная конфигурация приложения"""
    coinglass: CoinglassConfig
    udf: UDFConfig
    chart: ChartConfig
    builder: BuilderConfig
    
    @classmethod
    def load(cls) -> 'AppConfig':
        """Загрузить конфигурацию"""
        return cls(
            coinglass=CoinglassConfig(),
            udf=UDFConfig(),
            chart=ChartConfig(),
            builder=BuilderConfig()
        )


# Глобальная конфигурация
config = AppConfig.load() 