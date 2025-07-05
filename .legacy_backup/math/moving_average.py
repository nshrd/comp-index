"""
Moving average calculations for trading applications
Universal moving average utilities
"""

from typing import List, Optional
import math


class MovingAverageCalculator:
    """Калькулятор скользящих средних"""
    
    @staticmethod
    def simple_ma(values: List[float], period: int) -> List[float]:
        """
        Простая скользящая средняя (SMA)
        
        Args:
            values: Список значений
            period: Период для расчета
            
        Returns:
            Список значений скользящей средней
        """
        if len(values) < period or period <= 0:
            return []
        
        ma_values = []
        for i in range(period - 1, len(values)):
            window = values[i - period + 1:i + 1]
            ma_value = sum(window) / len(window)
            ma_values.append(ma_value)
        
        return ma_values
    
    @staticmethod
    def exponential_ma(values: List[float], period: int) -> List[float]:
        """
        Экспоненциальная скользящая средняя (EMA)
        
        Args:
            values: Список значений
            period: Период для расчета
            
        Returns:
            Список значений EMA
        """
        if not values or period <= 0:
            return []
        
        alpha = 2.0 / (period + 1)
        ema_values = [values[0]]  # Первое значение = первое значение ряда
        
        for i in range(1, len(values)):
            ema = alpha * values[i] + (1 - alpha) * ema_values[-1]
            ema_values.append(ema)
        
        return ema_values
    
    @staticmethod
    def weighted_ma(values: List[float], period: int) -> List[float]:
        """
        Взвешенная скользящая средняя (WMA)
        
        Args:
            values: Список значений
            period: Период для расчета
            
        Returns:
            Список значений WMA
        """
        if len(values) < period or period <= 0:
            return []
        
        weights = list(range(1, period + 1))
        weight_sum = sum(weights)
        
        wma_values = []
        for i in range(period - 1, len(values)):
            window = values[i - period + 1:i + 1]
            wma = sum(val * weight for val, weight in zip(window, weights)) / weight_sum
            wma_values.append(wma)
        
        return wma_values
    
    @staticmethod
    def adaptive_ma(values: List[float], period: int, efficiency_ratio_period: int = 10) -> List[float]:
        """
        Адаптивная скользящая средняя (AMA/KAMA)
        
        Args:
            values: Список значений
            period: Период для расчета
            efficiency_ratio_period: Период для расчета коэффициента эффективности
            
        Returns:
            Список значений AMA
        """
        if len(values) < max(period, efficiency_ratio_period) + 1:
            return []
        
        # Константы сглаживания
        fastest_sc = 2.0 / (2 + 1)  # Fastest SC (period = 2)
        slowest_sc = 2.0 / (30 + 1)  # Slowest SC (period = 30)
        
        ama_values = [values[efficiency_ratio_period]]
        
        for i in range(efficiency_ratio_period + 1, len(values)):
            # Направление
            direction = abs(values[i] - values[i - efficiency_ratio_period])
            
            # Волатильность
            volatility = sum(abs(values[j] - values[j - 1]) 
                           for j in range(i - efficiency_ratio_period + 1, i + 1))
            
            # Коэффициент эффективности
            efficiency_ratio = direction / volatility if volatility != 0 else 0
            
            # Константа сглаживания
            smoothing_constant = (efficiency_ratio * (fastest_sc - slowest_sc) + slowest_sc) ** 2
            
            # AMA
            ama = ama_values[-1] + smoothing_constant * (values[i] - ama_values[-1])
            ama_values.append(ama)
        
        return ama_values
    
    @staticmethod
    def hull_ma(values: List[float], period: int) -> List[float]:
        """
        Hull Moving Average (HMA)
        
        Args:
            values: Список значений
            period: Период для расчета
            
        Returns:
            Список значений HMA
        """
        if len(values) < period:
            return []
        
        # WMA с периодом period
        wma_full = MovingAverageCalculator.weighted_ma(values, period)
        
        # WMA с периодом period/2
        half_period = period // 2
        wma_half = MovingAverageCalculator.weighted_ma(values, half_period)
        
        if len(wma_half) < len(wma_full):
            # Обрезаем более длинный массив
            start_index = len(wma_half) - len(wma_full)
            wma_full = wma_full[start_index:]
        elif len(wma_full) < len(wma_half):
            start_index = len(wma_full) - len(wma_half)
            wma_half = wma_half[start_index:]
        
        # 2 * WMA(period/2) - WMA(period)
        raw_hma = []
        for i in range(min(len(wma_half), len(wma_full))):
            raw_hma.append(2 * wma_half[i] - wma_full[i])
        
        # WMA raw_hma с периодом sqrt(period)
        sqrt_period = int(math.sqrt(period))
        hma = MovingAverageCalculator.weighted_ma(raw_hma, sqrt_period)
        
        return hma
    
    @staticmethod
    def calculate_ma(values: List[float], period: int, ma_type: str = 'sma') -> List[float]:
        """
        Универсальная функция расчета скользящей средней
        
        Args:
            values: Список значений
            period: Период для расчета
            ma_type: Тип скользящей средней ('sma', 'ema', 'wma', 'ama', 'hma')
            
        Returns:
            Список значений скользящей средней
        """
        ma_type = ma_type.lower()
        
        if ma_type == 'sma':
            return MovingAverageCalculator.simple_ma(values, period)
        elif ma_type == 'ema':
            return MovingAverageCalculator.exponential_ma(values, period)
        elif ma_type == 'wma':
            return MovingAverageCalculator.weighted_ma(values, period)
        elif ma_type == 'ama' or ma_type == 'kama':
            return MovingAverageCalculator.adaptive_ma(values, period)
        elif ma_type == 'hma':
            return MovingAverageCalculator.hull_ma(values, period)
        else:
            raise ValueError(f"Unsupported MA type: {ma_type}")
    
    @staticmethod
    def get_supported_types() -> List[str]:
        """
        Получить список поддерживаемых типов скользящих средних
        
        Returns:
            Список типов
        """
        return ['sma', 'ema', 'wma', 'ama', 'kama', 'hma'] 