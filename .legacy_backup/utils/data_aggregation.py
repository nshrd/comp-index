"""
Data aggregation utilities for trading applications
Functions to aggregate data by different timeframes
"""

from typing import List, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from .date_utils import DateUtils


class DataAggregator:
    """Утилиты для агрегации торговых данных"""
    
    @staticmethod
    def aggregate_to_weeks(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Агрегировать данные по неделям (начиная с понедельника)
        
        Args:
            data: Список данных с полями 'time' и 'value'
            
        Returns:
            Агрегированные недельные данные
        """
        if not data:
            return []
        
        week_map = {}
        
        for item in data:
            timestamp = item.get('time')
            value = item.get('value')
            
            if timestamp is None or value is None:
                continue
            
            # Получаем дату
            date = DateUtils.from_timestamp(timestamp)
            
            # Получаем понедельник недели
            days_since_monday = date.weekday()
            monday = date - timedelta(days=days_since_monday)
            monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
            
            week_key = DateUtils.to_timestamp(monday)
            
            if week_key not in week_map:
                week_map[week_key] = []
            week_map[week_key].append(value)
        
        # Преобразуем в массив с усредненными значениями
        weekly_data = []
        for week_time, values in week_map.items():
            avg_value = sum(values) / len(values)
            weekly_data.append({
                'time': week_time,
                'value': avg_value
            })
        
        # Сортируем по времени
        weekly_data.sort(key=lambda x: x['time'])
        
        return weekly_data
    
    @staticmethod
    def aggregate_to_three_days(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Агрегировать данные по 3-дневным периодам
        
        Args:
            data: Список данных с полями 'time' и 'value'
            
        Returns:
            Агрегированные 3-дневные данные
        """
        if not data:
            return []
        
        three_day_map = {}
        
        for item in data:
            timestamp = item.get('time')
            value = item.get('value')
            
            if timestamp is None or value is None:
                continue
            
            # Получаем дату
            date = DateUtils.from_timestamp(timestamp)
            
            # Получаем дату начала 3-дневного периода
            days_since_epoch = DateUtils.get_days_since_epoch(date)
            three_day_period = (days_since_epoch // 3) * 3
            
            epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
            period_start = epoch + timedelta(days=three_day_period)
            period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
            
            period_key = DateUtils.to_timestamp(period_start)
            
            if period_key not in three_day_map:
                three_day_map[period_key] = []
            three_day_map[period_key].append(value)
        
        # Преобразуем в массив с усредненными значениями
        three_day_data = []
        for period_time, values in three_day_map.items():
            avg_value = sum(values) / len(values)
            three_day_data.append({
                'time': period_time,
                'value': avg_value
            })
        
        # Сортируем по времени
        three_day_data.sort(key=lambda x: x['time'])
        
        return three_day_data
    
    @staticmethod
    def aggregate_candlestick_to_weeks(candle_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Агрегировать свечи в недельные данные
        
        Args:
            candle_data: Список свечей с полями 'time', 'open', 'high', 'low', 'close'
            
        Returns:
            Недельные свечи
        """
        if not candle_data:
            return []
        
        week_map = {}
        
        for candle in candle_data:
            timestamp = candle.get('time')
            if timestamp is None:
                continue
            
            # Получаем дату
            date = DateUtils.from_timestamp(timestamp)
            
            # Получаем понедельник недели
            days_since_monday = date.weekday()
            monday = date - timedelta(days=days_since_monday)
            monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
            
            week_key = DateUtils.to_timestamp(monday)
            
            if week_key not in week_map:
                week_map[week_key] = []
            week_map[week_key].append(candle)
        
        # Преобразуем в недельные свечи
        weekly_candles = []
        for week_time, candles in week_map.items():
            if candles:
                # Сортируем свечи по времени
                candles.sort(key=lambda x: x.get('time', 0))
                
                weekly_candle = {
                    'time': week_time,
                    'open': candles[0].get('open'),
                    'high': max(c.get('high', 0) for c in candles),
                    'low': min(c.get('low', float('inf')) for c in candles),
                    'close': candles[-1].get('close')
                }
                
                weekly_candles.append(weekly_candle)
        
        # Сортируем по времени
        weekly_candles.sort(key=lambda x: x['time'])
        
        return weekly_candles
    
    @staticmethod
    def aggregate_candlestick_to_three_days(candle_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Агрегировать свечи в 3-дневные данные
        
        Args:
            candle_data: Список свечей с полями 'time', 'open', 'high', 'low', 'close'
            
        Returns:
            3-дневные свечи
        """
        if not candle_data:
            return []
        
        three_day_map = {}
        
        for candle in candle_data:
            timestamp = candle.get('time')
            if timestamp is None:
                continue
            
            # Получаем дату
            date = DateUtils.from_timestamp(timestamp)
            
            # Получаем дату начала 3-дневного периода
            days_since_epoch = DateUtils.get_days_since_epoch(date)
            three_day_period = (days_since_epoch // 3) * 3
            
            epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
            period_start = epoch + timedelta(days=three_day_period)
            period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
            
            period_key = DateUtils.to_timestamp(period_start)
            
            if period_key not in three_day_map:
                three_day_map[period_key] = []
            three_day_map[period_key].append(candle)
        
        # Преобразуем в 3-дневные свечи
        three_day_candles = []
        for period_time, candles in three_day_map.items():
            if candles:
                # Сортируем свечи по времени
                candles.sort(key=lambda x: x.get('time', 0))
                
                three_day_candle = {
                    'time': period_time,
                    'open': candles[0].get('open'),
                    'high': max(c.get('high', 0) for c in candles),
                    'low': min(c.get('low', float('inf')) for c in candles),
                    'close': candles[-1].get('close')
                }
                
                three_day_candles.append(three_day_candle)
        
        # Сортируем по времени
        three_day_candles.sort(key=lambda x: x['time'])
        
        return three_day_candles
    
    @staticmethod
    def aggregate_by_timeframe(data: List[Dict[str, Any]], timeframe: str) -> List[Dict[str, Any]]:
        """
        Универсальная функция агрегации по таймфрейму
        
        Args:
            data: Данные для агрегации
            timeframe: Таймфрейм ('240', 'D', '3D', 'W')
            
        Returns:
            Агрегированные данные
        """
        if timeframe == '3D':
            return DataAggregator.aggregate_to_three_days(data)
        elif timeframe == 'W':
            return DataAggregator.aggregate_to_weeks(data)
        else:
            # Для '240' и 'D' агрегация не нужна
            return data
    
    @staticmethod
    def aggregate_candlestick_by_timeframe(candle_data: List[Dict[str, Any]], timeframe: str) -> List[Dict[str, Any]]:
        """
        Универсальная функция агрегации свечей по таймфрейму
        
        Args:
            candle_data: Свечи для агрегации
            timeframe: Таймфрейм ('240', 'D', '3D', 'W')
            
        Returns:
            Агрегированные свечи
        """
        if timeframe == '3D':
            return DataAggregator.aggregate_candlestick_to_three_days(candle_data)
        elif timeframe == 'W':
            return DataAggregator.aggregate_candlestick_to_weeks(candle_data)
        else:
            # Для '240' и 'D' агрегация не нужна
            return candle_data 