#!/usr/bin/env python3
"""
Скрипт для обработки данных рейтингов приложений и создания композитного индекса
для использования в TradingView через Pine Seeds
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json
from typing import Dict, List, Optional
# Опциональный импорт TA-Lib
try:
    import talib
    HAS_TALIB = True
except ImportError:
    HAS_TALIB = False
    print("⚠️  TA-Lib не установлен. Используется pandas для технических индикаторов.")


class AppRankProcessor:
    def __init__(self, api_base_url: str, api_key: Optional[str] = None):
        """
        Инициализация процессора данных
        
        Args:
            api_base_url: Базовый URL вашего API
            api_key: API ключ для аутентификации (если нужен)
        """
        self.api_base_url = api_base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {'Content-Type': 'application/json'}
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'
    
    def fetch_rankings_data(self) -> Dict:
        """
        Загружает данные рейтингов с вашего API
        
        Returns:
            Словарь с данными рейтингов по каждой категории
        """
        endpoints = {
            'coin': '/api/rankings/coin',
            'moon': '/api/rankings/moon', 
            'phantom': '/api/rankings/phantom'
        }
        
        data = {}
        for category, endpoint in endpoints.items():
            try:
                url = f"{self.api_base_url}{endpoint}"
                response = requests.get(url, headers=self.headers, timeout=30)
                response.raise_for_status()
                data[category] = response.json()
                print(f"✓ Загружены данные {category}: {len(data[category])} записей")
            except requests.exceptions.RequestException as e:
                print(f"✗ Ошибка загрузки {category}: {e}")
                data[category] = []
        
        return data
    
    def calculate_composite_rank(self, rankings_data: Dict) -> pd.DataFrame:
        """
        Рассчитывает композитный рейтинг
        
        Args:
            rankings_data: Данные рейтингов по категориям
            
        Returns:
            DataFrame с временными рядами композитного рейтинга
        """
        # Предполагаем, что данные содержат поля: date, rank
        dfs = []
        
        for category, data in rankings_data.items():
            if not data:
                continue
                
            df = pd.DataFrame(data)
            if 'date' in df.columns and 'rank' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df = df.set_index('date')
                df = df.rename(columns={'rank': f'rank_{category}'})
                dfs.append(df[[f'rank_{category}']])
        
        if not dfs:
            print("⚠️  Нет данных для расчета композитного индекса")
            return pd.DataFrame()
        
        # Объединяем все рейтинги по датам
        composite_df = pd.concat(dfs, axis=1, join='outer')
        
        # Заполняем пропуски методом forward fill
        composite_df = composite_df.fillna(method='ffill')
        
        # Рассчитываем среднее арифметическое рангов
        rank_columns = [col for col in composite_df.columns if col.startswith('rank_')]
        composite_df['rank_composite'] = composite_df[rank_columns].mean(axis=1)
        
        return composite_df
    
    def apply_moving_average(self, df: pd.DataFrame, ma_length: int = 30) -> pd.DataFrame:
        """
        Применяет скользящее среднее к композитному рангу
        
        Args:
            df: DataFrame с композитным рангом
            ma_length: Длина периода скользящего среднего
            
        Returns:
            DataFrame с добавлением MA
        """
        if 'rank_composite' not in df.columns:
            return df
            
        # Простое скользящее среднее
        if HAS_TALIB:
            # Используем TA-Lib если доступен
            df['rank_ma'] = talib.SMA(df['rank_composite'].values, timeperiod=ma_length)
        else:
            # Используем pandas
            df['rank_ma'] = df['rank_composite'].rolling(window=ma_length, min_periods=1).mean()
        
        return df
    
    def create_pine_seeds_csv(self, df: pd.DataFrame, output_dir: str = 'data'):
        """
        Создает CSV файлы в формате Pine Seeds
        
        Args:
            df: DataFrame с обработанными данными
            output_dir: Директория для сохранения файлов
        """
        os.makedirs(output_dir, exist_ok=True)
        
        if df.empty:
            print("⚠️  Нет данных для создания CSV файлов")
            return
        
        # Подготавливаем данные в формате OHLC для Pine Seeds
        # time,open,high,low,close,volume
        
        # Для композитного ранга (сырые данные)
        if 'rank_composite' in df.columns:
            comp_raw = df[['rank_composite']].copy()
            comp_raw = comp_raw.dropna()
            
            # Создаем OHLC формат (все значения равны rank_composite)
            comp_raw_ohlc = pd.DataFrame({
                'time': comp_raw.index.strftime('%Y-%m-%d'),
                'open': comp_raw['rank_composite'],
                'high': comp_raw['rank_composite'], 
                'low': comp_raw['rank_composite'],
                'close': comp_raw['rank_composite'],
                'volume': 1000  # Фиктивный объем
            })
            
            comp_raw_file = os.path.join(output_dir, 'COMP_RAW.csv')
            comp_raw_ohlc.to_csv(comp_raw_file, index=False)
            print(f"✓ Создан файл: {comp_raw_file}")
        
        # Для MA композитного ранга
        if 'rank_ma' in df.columns:
            comp_ma = df[['rank_ma']].copy()
            comp_ma = comp_ma.dropna()
            
            comp_ma_ohlc = pd.DataFrame({
                'time': comp_ma.index.strftime('%Y-%m-%d'),
                'open': comp_ma['rank_ma'],
                'high': comp_ma['rank_ma'],
                'low': comp_ma['rank_ma'], 
                'close': comp_ma['rank_ma'],
                'volume': 1000
            })
            
            comp_ma_file = os.path.join(output_dir, 'COMP_MA.csv')
            comp_ma_ohlc.to_csv(comp_ma_file, index=False)
            print(f"✓ Создан файл: {comp_ma_file}")
    
    def process_all(self, ma_length: int = 30):
        """
        Выполняет полный цикл обработки данных
        
        Args:
            ma_length: Длина периода скользящего среднего
        """
        print(f"🚀 Начинаю обработку данных ({datetime.now()})")
        
        # 1. Загружаем данные рейтингов
        rankings_data = self.fetch_rankings_data()
        
        # 2. Рассчитываем композитный рейтинг
        composite_df = self.calculate_composite_rank(rankings_data)
        
        if composite_df.empty:
            print("❌ Не удалось рассчитать композитный индекс")
            return
        
        # 3. Применяем скользящее среднее
        composite_df = self.apply_moving_average(composite_df, ma_length)
        
        # 4. Создаем CSV файлы для Pine Seeds
        self.create_pine_seeds_csv(composite_df)
        
        print(f"✅ Обработка завершена ({datetime.now()})")
        
        # Выводим краткую статистику
        if not composite_df.empty:
            print(f"\n📊 Статистика:")
            print(f"   Период данных: {composite_df.index.min()} - {composite_df.index.max()}")
            print(f"   Всего записей: {len(composite_df)}")
            if 'rank_composite' in composite_df.columns:
                print(f"   Композитный ранг: {composite_df['rank_composite'].min():.1f} - {composite_df['rank_composite'].max():.1f}")
            if 'rank_ma' in composite_df.columns:
                print(f"   MA({ma_length}): {composite_df['rank_ma'].min():.1f} - {composite_df['rank_ma'].max():.1f}")


def main():
    """
    Основная функция для запуска обработки
    """
    # Настройки API (замените на ваши)
    API_BASE_URL = "https://your-api-domain.com"  # Ваш API URL
    API_KEY = os.getenv('APP_RANKINGS_API_KEY')  # API ключ из переменной окружения
    
    # Длина скользящего среднего
    MA_LENGTH = 30
    
    try:
        processor = AppRankProcessor(API_BASE_URL, API_KEY)
        processor.process_all(MA_LENGTH)
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
        raise


if __name__ == "__main__":
    main() 