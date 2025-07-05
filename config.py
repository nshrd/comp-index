"""
Configuration management for CBMA14 Index
"""
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()


@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str = "localhost"
    port: int = 5432
    database: str = "cbma14"
    username: str = "postgres"
    password: str = ""
    

@dataclass
class APIConfig:
    """API configuration"""
    host: str = "0.0.0.0"
    port: int = 8000  # Исправлен порт на 8000
    debug: bool = False
    cors_enabled: bool = True
    cors_origins: Optional[list] = None
    
    def __post_init__(self):
        if self.cors_origins is None:
            self.cors_origins = ["*"]


@dataclass
class BuilderConfig:
    """Builder configuration"""
    update_interval: int = 3600  # 1 час
    ma_period: int = 14
    data_input_file: str = "data/data.json"
    data_output_file: str = "data/CBMA14.json"


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_dir: str = "logs"


class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.load_from_env()
        
    def load_from_env(self):
        """Load configuration from environment variables"""
        # API Configuration
        self.api = APIConfig(
            host=os.getenv('UDF_HOST', '0.0.0.0'),
            port=int(os.getenv('UDF_PORT', 8000)),
            debug=os.getenv('UDF_DEBUG', 'false').lower() == 'true',
            cors_enabled=True,
            cors_origins=["*"]
        )
        
        # Builder Configuration
        self.builder = BuilderConfig(
            update_interval=int(os.getenv('BUILDER_UPDATE_INTERVAL', 3600)),
            ma_period=int(os.getenv('BUILDER_MA_PERIOD', 14)),
            data_input_file=os.getenv('DATA_INPUT_FILE', 'data/data.json'),
            data_output_file=os.getenv('DATA_OUTPUT_FILE', 'data/CBMA14.json')
        )
        
        # Logging Configuration
        self.logging = LoggingConfig(
            level=os.getenv('LOG_LEVEL', 'INFO'),
            log_dir=os.getenv('LOG_DIR', 'logs')
        )
        
        # External APIs
        self.coinglass_api_key = os.getenv('COINGLASS_API_KEY')
        self.coinglass_base_url = os.getenv('COINGLASS_BASE_URL', 'https://open-api-v4.coinglass.com')
        
        # Frontend Configuration
        self.frontend_api_url = os.getenv('FRONTEND_API_URL', f'http://localhost:8000')
        
        # Docker Configuration
        self.compose_project_name = os.getenv('COMPOSE_PROJECT_NAME', 'cbma14')
        self.docker_restart_policy = os.getenv('DOCKER_RESTART_POLICY', 'unless-stopped')
        
    def get_data_dir(self) -> Path:
        """Get data directory path"""
        return Path(__file__).parent / "data"
        
    def get_log_dir(self) -> Path:
        """Get log directory path"""
        return Path(__file__).parent / self.logging.log_dir
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            'api': {
                'host': self.api.host,
                'port': self.api.port,
                'debug': self.api.debug,
                'cors_enabled': self.api.cors_enabled
            },
            'builder': {
                'update_interval': self.builder.update_interval,
                'ma_period': self.builder.ma_period,
                'data_input_file': self.builder.data_input_file,
                'data_output_file': self.builder.data_output_file
            },
            'logging': {
                'level': self.logging.level,
                'log_dir': self.logging.log_dir
            },
            'external_apis': {
                'coinglass_api_key': bool(self.coinglass_api_key),
                'coinglass_base_url': self.coinglass_base_url
            },
            'frontend': {
                'api_url': self.frontend_api_url
            },
            'docker': {
                'project_name': self.compose_project_name,
                'restart_policy': self.docker_restart_policy
            }
        }


# Global configuration instance
config = Config()


def get_config() -> Config:
    """Get global configuration instance"""
    return config


def reload_config() -> Config:
    """Reload configuration from environment"""
    global config
    config = Config()
    return config 