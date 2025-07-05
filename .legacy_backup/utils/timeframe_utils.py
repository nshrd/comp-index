"""
Utilities for working with trading timeframes
Universal timeframe handling functions for trading applications
"""

from typing import List, Dict, Any


class TimeframeUtils:
    """Утилиты для работы с торговыми таймфреймами"""
    
    # Мапинг таймфреймов для разных целей
    TIMEFRAME_MAPPINGS = {
        'file_suffix': {
            '240': '4H',
            'D': '1D', 
            '3D': '1D',  # Для 3D используем 1D файлы
            'W': '1W'
        },
        'display_text': {
            '240': '4H',
            'D': '1D',
            '3D': '3D',
            'W': '1W'
        },
        'api_resolution': {
            '240': '240',
            'D': 'D',
            '3D': 'D',   # Для 3D запрашиваем дневные данные
            'W': 'D'     # Для недельных запрашиваем дневные данные
        }
    }
    
    @staticmethod
    def get_file_suffix(timeframe: str) -> str:
        """
        Получить суффикс файла для таймфрейма
        
        Args:
            timeframe: Таймфрейм ('240', 'D', '3D', 'W')
            
        Returns:
            Суффикс для файла ('4H', '1D', '1W')
        """
        return TimeframeUtils.TIMEFRAME_MAPPINGS['file_suffix'].get(timeframe, '1D')
    
    @staticmethod
    def get_display_text(timeframe: str) -> str:
        """
        Получить отображаемый текст для таймфрейма
        
        Args:
            timeframe: Таймфрейм ('240', 'D', '3D', 'W')
            
        Returns:
            Отображаемый текст ('4H', '1D', '3D', '1W')
        """
        return TimeframeUtils.TIMEFRAME_MAPPINGS['display_text'].get(timeframe, '1D')
    
    @staticmethod
    def get_api_timeframe(timeframe: str) -> str:
        """
        Получить таймфрейм для API запроса
        
        Args:
            timeframe: Таймфрейм ('240', 'D', '3D', 'W')
            
        Returns:
            API таймфрейм ('240', 'D')
        """
        return TimeframeUtils.TIMEFRAME_MAPPINGS['api_resolution'].get(timeframe, 'D')
    
    @staticmethod
    def needs_aggregation(timeframe: str) -> bool:
        """
        Проверить, нужна ли агрегация данных для таймфрейма
        
        Args:
            timeframe: Таймфрейм для проверки
            
        Returns:
            True если нужна агрегация, False если нет
        """
        return timeframe in ['3D', 'W']
    
    @staticmethod
    def get_supported_timeframes() -> List[str]:
        """
        Получить список всех поддерживаемых таймфреймов
        
        Returns:
            Список таймфреймов
        """
        return list(TimeframeUtils.TIMEFRAME_MAPPINGS['display_text'].keys())
    
    @staticmethod
    def is_valid_timeframe(timeframe: str) -> bool:
        """
        Проверить, является ли таймфрейм валидным
        
        Args:
            timeframe: Таймфрейм для проверки
            
        Returns:
            True если валидный, False если нет
        """
        return timeframe in TimeframeUtils.get_supported_timeframes()
    
    @staticmethod
    def get_timeframe_info(timeframe: str) -> Dict[str, Any]:
        """
        Получить полную информацию о таймфрейме
        
        Args:
            timeframe: Таймфрейм
            
        Returns:
            Словарь с информацией о таймфрейме
        """
        if not TimeframeUtils.is_valid_timeframe(timeframe):
            raise ValueError(f"Invalid timeframe: {timeframe}")
        
        return {
            'timeframe': timeframe,
            'file_suffix': TimeframeUtils.get_file_suffix(timeframe),
            'display_text': TimeframeUtils.get_display_text(timeframe),
            'api_timeframe': TimeframeUtils.get_api_timeframe(timeframe),
            'needs_aggregation': TimeframeUtils.needs_aggregation(timeframe)
        }
    
    @staticmethod
    def get_minutes_in_timeframe(timeframe: str) -> int:
        """
        Получить количество минут в таймфрейме
        
        Args:
            timeframe: Таймфрейм
            
        Returns:
            Количество минут
        """
        minutes_mapping = {
            '240': 240,      # 4 часа
            'D': 1440,       # 24 часа
            '3D': 4320,      # 72 часа
            'W': 10080       # 7 дней
        }
        
        return minutes_mapping.get(timeframe, 1440)
    
    @staticmethod
    def convert_timeframe_to_seconds(timeframe: str) -> int:
        """
        Конвертировать таймфрейм в секунды
        
        Args:
            timeframe: Таймфрейм
            
        Returns:
            Количество секунд
        """
        return TimeframeUtils.get_minutes_in_timeframe(timeframe) * 60 