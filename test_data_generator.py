#!/usr/bin/env python3
"""
Генератор тестовых данных для демонстрации работы композитного индекса
Используется для тестирования без реального API
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json
import random


def generate_test_rankings_data(days=90):
    """
    Генерирует тестовые данные рейтингов для трех категорий
    
    Args:
        days: Количество дней для генерации данных
        
    Returns:
        Словарь с тестовыми данными по категориям
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Генерируем даты
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    data = {}
    
    # Параметры для разных категорий (разные тренды)
    categories = {
        'coin': {'base': 200, 'volatility': 50, 'trend': 0.2},
        'moon': {'base': 150, 'volatility': 80, 'trend': -0.1}, 
        'phantom': {'base': 300, 'volatility': 60, 'trend': 0.15}
    }
    
    for category, params in categories.items():
        ranks = []
        current_rank = params['base']
        
        for i, date in enumerate(dates):
            # Добавляем тренд
            trend_change = params['trend'] * i / len(dates)
            
            # Добавляем случайную волатильность
            random_change = random.gauss(0, params['volatility'] / 10)
            
            # Добавляем циклические колебания (недельные/месячные)
            weekly_cycle = 20 * np.sin(2 * np.pi * i / 7)
            monthly_cycle = 30 * np.sin(2 * np.pi * i / 30)
            
            current_rank = (params['base'] + 
                          trend_change + 
                          random_change + 
                          weekly_cycle + 
                          monthly_cycle)
            
            # Ограничиваем разумными пределами
            current_rank = max(50, min(500, current_rank))
            
            ranks.append({
                'date': date.strftime('%Y-%m-%d'),
                'rank': round(current_rank, 1),
                'app_name': f'Test App {category.title()}',
                'category': category
            })
        
        data[category] = ranks
    
    return data


def save_test_data(data, output_dir='test_data'):
    """
    Сохраняет тестовые данные в файлы JSON
    
    Args:
        data: Словарь с данными
        output_dir: Директория для сохранения
    """
    os.makedirs(output_dir, exist_ok=True)
    
    for category, category_data in data.items():
        filename = os.path.join(output_dir, f'{category}_rankings.json')
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(category_data, f, indent=2, ensure_ascii=False)
        print(f"✅ Сохранены тестовые данные для {category}: {filename}")


def create_sample_csv():
    """
    Создает пример CSV файлов в формате Pine Seeds для демонстрации
    """
    os.makedirs('data', exist_ok=True)
    
    # Генерируем тестовые данные
    dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='D')
    
    # Создаем синтетические значения композитного индекса
    base_values = np.linspace(250, 300, len(dates))
    noise = np.random.normal(0, 10, len(dates))
    composite_raw = base_values + noise
    
    # MA версия (сглаженная)
    composite_ma = pd.Series(composite_raw).rolling(window=7, min_periods=1).mean()
    
    # Создаем COMP_RAW.csv
    comp_raw_df = pd.DataFrame({
        'time': dates.strftime('%Y-%m-%d'),
        'open': composite_raw,
        'high': composite_raw,
        'low': composite_raw,
        'close': composite_raw,
        'volume': 1000
    })
    
    comp_raw_df.to_csv('data/COMP_RAW.csv', index=False)
    print("✅ Создан файл: data/COMP_RAW.csv")
    
    # Создаем COMP_MA.csv
    comp_ma_df = pd.DataFrame({
        'time': dates.strftime('%Y-%m-%d'),
        'open': composite_ma,
        'high': composite_ma,
        'low': composite_ma,
        'close': composite_ma,
        'volume': 1000
    })
    
    comp_ma_df.to_csv('data/COMP_MA.csv', index=False)
    print("✅ Создан файл: data/COMP_MA.csv")
    
    # Выводим статистику
    print(f"\n📊 Статистика тестовых данных:")
    print(f"   Период: {dates[0].strftime('%Y-%m-%d')} - {dates[-1].strftime('%Y-%m-%d')}")
    print(f"   Записей: {len(dates)}")
    print(f"   Сырой композит: {composite_raw.min():.1f} - {composite_raw.max():.1f}")
    print(f"   MA композит: {composite_ma.min():.1f} - {composite_ma.max():.1f}")


def main():
    """
    Главная функция для генерации всех тестовых данных
    """
    print("🎲 Генерация тестовых данных для композитного индекса...")
    
    # Генерируем данные рейтингов
    test_data = generate_test_rankings_data(days=90)
    save_test_data(test_data)
    
    # Создаем примеры CSV файлов
    create_sample_csv()
    
    print("\n🎉 Генерация тестовых данных завершена!")
    print("\n📝 Что было создано:")
    print("   📁 test_data/ - тестовые JSON файлы рейтингов")
    print("   📁 data/ - примеры CSV файлов для Pine Seeds")
    print("\n⚡ Для тестирования с реальными данными:")
    print("   1. Настройте API в .env файле")
    print("   2. Запустите: python3 data_processor.py")
    print("   3. Или используйте: ./run_updater.sh")


if __name__ == "__main__":
    main() 