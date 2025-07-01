#!/usr/bin/env python3
"""
Генератор Pine Script с встроенными данными композитного индекса
Читает CSV файлы и создает Pine Script с массивами данных
"""

import pandas as pd
import os
from datetime import datetime


def load_csv_data(csv_path):
    """Загружает данные из CSV файла"""
    df = pd.read_csv(csv_path)
    df['time'] = pd.to_datetime(df['time'])
    df = df.sort_values('time')
    return df


def generate_pine_script(comp_ma_df, comp_raw_df, template_path='tradingview_indicator_template.pine'):
    """
    Генерирует Pine Script с встроенными данными
    
    Args:
        comp_ma_df: DataFrame с MA данными
        comp_raw_df: DataFrame с сырыми данными
        template_path: Путь к шаблону Pine Script
    """
    
    # Конвертируем даты в Unix timestamp (миллисекунды)
    ma_timestamps = (comp_ma_df['time'].astype('int64') // 10**6).tolist()
    ma_values = comp_ma_df['close'].round(2).tolist()
    
    raw_timestamps = (comp_raw_df['time'].astype('int64') // 10**6).tolist()
    raw_values = comp_raw_df['close'].round(2).tolist()
    
    # Форматируем массивы для Pine Script (макс 500 значений на строку)
    def format_array(values, items_per_line=20):
        lines = []
        for i in range(0, len(values), items_per_line):
            chunk = values[i:i+items_per_line]
            line = ", ".join(str(v) for v in chunk)
            lines.append(f"     {line}")
        return ",\n".join(lines)
    
    # Создаем Pine Script
    pine_code = f"""//@version=6
indicator("Композитный Индекс Рейтингов (Embedded)", shorttitle="App-Rank Embedded", overlay=true, scale=scale.right)

// ═══════════════════════════════════════════════════════════════════════
// ПАРАМЕТРЫ ИНДИКАТОРА
// ═══════════════════════════════════════════════════════════════════════

// Основные настройки
scaleFactor = input.float(100., title="Scale factor", tooltip="Масштаб композита для сопоставления с ценой", minval=0.1)
offset      = input.float(0., title="Vertical shift", tooltip="Вертикальный сдвиг композита")
showRaw = input.bool(false, title="Показать сырой ранг?", tooltip="Отображать ли сырые данные композитного ранга")
showBTC = input.bool(true, title="Показать цену BTC?", tooltip="Отображать ли цену Bitcoin")

// Визуальные настройки
compColor = input.color(color.red, title="Цвет MA композита", group="Цвета")
rawColor = input.color(color.orange, title="Цвет сырого ранга", group="Цвета") 
btcColor = input.color(color.blue, title="Цвет BTC", group="Цвета")

// ═══════════════════════════════════════════════════════════════════════
// ВСТРОЕННЫЕ ДАННЫЕ (обновлено: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')})
// ═══════════════════════════════════════════════════════════════════════

// Временные метки (Unix ms)
var ma_times = array.from(
{format_array(ma_timestamps)})

// Значения MA композита
var ma_values = array.from(
{format_array(ma_values)})

// Временные метки для сырых данных
var raw_times = array.from(
{format_array(raw_timestamps)})

// Сырые значения композита
var raw_values = array.from(
{format_array(raw_values)})

// ═══════════════════════════════════════════════════════════════════════
// ФУНКЦИЯ ИНТЕРПОЛЯЦИИ ДАННЫХ
// ═══════════════════════════════════════════════════════════════════════

// Находит значение для текущего бара по временной метке
get_value_at_time(times_array, values_array, current_time) =>
    result = float(na)
    array_size = array.size(times_array)
    
    if array_size > 0
        // Бинарный поиск ближайшей временной метки
        left = 0
        right = array_size - 1
        
        while left <= right
            mid = math.floor((left + right) / 2)
            mid_time = array.get(times_array, mid)
            
            if mid_time == current_time
                result := array.get(values_array, mid)
                break
            else if mid_time < current_time
                left := mid + 1
            else
                right := mid - 1
        
        // Если точного совпадения нет, берем ближайшее предыдущее значение
        if na(result) and right >= 0
            result := array.get(values_array, right)
    
    result

// ═══════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ ДАННЫХ
// ═══════════════════════════════════════════════════════════════════════

// Текущее время бара в миллисекундах
current_time_ms = time

// Получаем значения для текущего бара
compMA = get_value_at_time(ma_times, ma_values, current_time_ms)
compRaw = showRaw ? get_value_at_time(raw_times, raw_values, current_time_ms) : na

// Масштабирование
compMA_scaled = compMA * scaleFactor + offset
compRaw_scaled = showRaw ? compRaw * scaleFactor + offset : na

// Цена BTC
btcPrice = showBTC ? request.security("BINANCE:BTCUSDT", timeframe.period, close) : na

// ═══════════════════════════════════════════════════════════════════════
// ОТРИСОВКА ГРАФИКОВ
// ═══════════════════════════════════════════════════════════════════════

// Основная линия композитного MA
plot(compMA_scaled, 
     title="Композитный MA", 
     color=compColor, 
     linewidth=2, 
     display=display.all)

// Сырые данные композита (если включено)
plot(compRaw_scaled, 
     title="Сырой композитный ранг", 
     color=rawColor, 
     linewidth=1, 
     display=display.all)

// Цена Bitcoin
plot(btcPrice, 
     title="BTC Price", 
     color=btcColor, 
     linewidth=2, 
     display=display.all)

// ═══════════════════════════════════════════════════════════════════════
// ИНФОРМАЦИОННАЯ ПАНЕЛЬ
// ═══════════════════════════════════════════════════════════════════════

if barstate.islast
    var table infoTable = table.new(position.top_right, 2, 4, bgcolor=color.new(color.white, 80))
    
    table.cell(infoTable, 0, 0, "Данные обновлены", text_color=color.gray, text_size=size.small)
    table.cell(infoTable, 1, 0, "{datetime.now().strftime('%d.%m.%Y')}", text_color=color.gray, text_size=size.small)
    
    table.cell(infoTable, 0, 1, "Записей MA", text_color=color.gray, text_size=size.small)
    table.cell(infoTable, 1, 1, str.tostring(array.size(ma_values)), text_color=color.gray, text_size=size.small)
    
    if not na(compMA)
        table.cell(infoTable, 0, 2, "Текущий MA", text_color=color.black, text_size=size.small)
        table.cell(infoTable, 1, 2, str.tostring(compMA, "#.##"), text_color=color.black, text_size=size.small)
        
        table.cell(infoTable, 0, 3, "Масштаб", text_color=color.gray, text_size=size.small)
        table.cell(infoTable, 1, 3, str.tostring(compMA_scaled, "#.##"), text_color=color.gray, text_size=size.small)
"""
    
    return pine_code


def main():
    """Основная функция"""
    # Пути к файлам
    comp_ma_path = 'data/COMP_MA.csv'
    comp_raw_path = 'data/COMP_RAW.csv'
    output_path = 'tradingview_indicator_embedded.pine'
    
    print("🔧 Генерация Pine Script с встроенными данными...")
    
    # Загружаем данные
    try:
        comp_ma_df = load_csv_data(comp_ma_path)
        comp_raw_df = load_csv_data(comp_raw_path)
        
        print(f"✅ Загружено MA записей: {len(comp_ma_df)}")
        print(f"✅ Загружено Raw записей: {len(comp_raw_df)}")
        
        # Генерируем Pine Script
        pine_code = generate_pine_script(comp_ma_df, comp_raw_df)
        
        # Сохраняем
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(pine_code)
            
        print(f"✅ Pine Script сохранен: {output_path}")
        print(f"📏 Размер файла: {len(pine_code) / 1024:.1f} KB")
        
        # Статистика
        print(f"\n📊 Статистика данных:")
        print(f"   Период: {comp_ma_df['time'].min()} - {comp_ma_df['time'].max()}")
        print(f"   MA диапазон: {comp_ma_df['close'].min():.1f} - {comp_ma_df['close'].max():.1f}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        raise


if __name__ == "__main__":
    main() 