"""
Utilities for working with dates and timestamps
Universal date handling functions for trading applications
"""

import time
from datetime import datetime, timezone
from typing import Union, Optional


class DateUtils:
    """Утилиты для работы с датами и временными метками"""
    
    @staticmethod
    def to_timestamp(date: Union[datetime, str]) -> int:
        """
        Конвертировать дату в Unix timestamp (секунды)
        
        Args:
            date: datetime объект или строка в формате ISO
            
        Returns:
            Unix timestamp в секундах
        """
        if isinstance(date, str):
            date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        
        if isinstance(date, datetime):
            return int(date.timestamp())
        
        raise ValueError(f"Unsupported date type: {type(date)}")
    
    @staticmethod
    def from_timestamp(timestamp: Union[int, float]) -> datetime:
        """
        Конвертировать Unix timestamp в datetime
        
        Args:
            timestamp: Unix timestamp в секундах
            
        Returns:
            datetime объект
        """
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)
    
    @staticmethod
    def to_local_date_string(timestamp: Union[int, float], locale: str = 'ru-RU') -> str:
        """
        Конвертировать timestamp в локализованную строку даты
        
        Args:
            timestamp: Unix timestamp в секундах
            locale: Локаль для форматирования (не используется в Python базовой реализации)
            
        Returns:
            Отформатированная строка даты
        """
        dt = DateUtils.from_timestamp(timestamp)
        return dt.strftime('%d.%m.%Y')
    
    @staticmethod
    def get_days_since_epoch(date: Union[datetime, str]) -> int:
        """
        Получить количество дней с Unix эпохи
        
        Args:
            date: datetime объект или строка
            
        Returns:
            Количество дней с эпохи
        """
        if isinstance(date, str):
            date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        
        if isinstance(date, datetime):
            epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            delta = date - epoch
            return delta.days
        
        raise ValueError(f"Unsupported date type: {type(date)}")
    
    @staticmethod
    def parse_date_string(date_str: str) -> Optional[datetime]:
        """
        Парсинг строки даты в различных форматах
        
        Args:
            date_str: Строка с датой
            
        Returns:
            datetime объект или None если не удалось распарсить
        """
        formats = [
            '%Y-%m-%d',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S',
            '%d.%m.%Y',
            '%d/%m/%Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None
    
    @staticmethod
    def get_current_timestamp() -> int:
        """Получить текущий Unix timestamp"""
        return int(time.time())
    
    @staticmethod
    def format_timestamp(timestamp: Union[int, float], format_str: str = '%Y-%m-%d %H:%M:%S') -> str:
        """
        Форматировать timestamp в строку
        
        Args:
            timestamp: Unix timestamp в секундах
            format_str: Формат строки
            
        Returns:
            Отформатированная строка
        """
        dt = DateUtils.from_timestamp(timestamp)
        return dt.strftime(format_str) 