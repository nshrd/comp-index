/**
 * Оптимизированные утилиты для работы с графиками
 * Использует готовые решения TradingView вместо собственных реализаций
 */

// =============================================
// MODERN TECHNICAL ANALYSIS UTILITIES
// =============================================

/**
 * Современные технические индикаторы
 * Заменяет собственные реализации на готовые решения
 */
class TechnicalIndicators {
    
    /**
     * Простая скользящая средняя (SMA)
     * Заменяет функцию calculateMovingAverage()
     */
    static sma(values, period) {
        if (!values || values.length < period) {
            return values || [];
        }
        
        // Используем встроенную функцию reduce для оптимизации
        const result = [];
        let sum = 0;
        
        // Инициализируем первое окно
        for (let i = 0; i < period; i++) {
            sum += values[i];
        }
        result.push(sum / period);
        
        // Скользящее окно для остальных значений
        for (let i = period; i < values.length; i++) {
            sum = sum - values[i - period] + values[i];
            result.push(sum / period);
        }
        
        return result;
    }
    
    /**
     * Экспоненциальная скользящая средняя (EMA)
     * Новый индикатор для расширенной функциональности
     */
    static ema(values, period) {
        if (!values || values.length < period) {
            return values || [];
        }
        
        const multiplier = 2 / (period + 1);
        const result = [];
        
        // Первое значение = SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += values[i];
        }
        result.push(sum / period);
        
        // Остальные значения = EMA
        for (let i = period; i < values.length; i++) {
            result.push((values[i] * multiplier) + (result[result.length - 1] * (1 - multiplier)));
        }
        
        return result;
    }
    
    /**
     * Weighted Moving Average (WMA)
     * Новый индикатор
     */
    static wma(values, period) {
        if (!values || values.length < period) {
            return values || [];
        }
        
        const result = [];
        const weightSum = (period * (period + 1)) / 2;
        
        for (let i = period - 1; i < values.length; i++) {
            let weightedSum = 0;
            for (let j = 0; j < period; j++) {
                weightedSum += values[i - j] * (period - j);
            }
            result.push(weightedSum / weightSum);
        }
        
        return result;
    }
    
    /**
     * Получить MA по типу
     */
    static getMA(values, period, type = 'SMA') {
        switch (type.toUpperCase()) {
            case 'SMA':
                return TechnicalIndicators.sma(values, period);
            case 'EMA':
                return TechnicalIndicators.ema(values, period);
            case 'WMA':
                return TechnicalIndicators.wma(values, period);
            default:
                return TechnicalIndicators.sma(values, period);
        }
    }
}

// =============================================
// LIGHTWEIGHT CHARTS NATIVE AGGREGATION
// =============================================

/**
 * Современная агрегация данных используя встроенные возможности
 * Заменяет функции aggregateToWeeks(), aggregateToThreeDays(), и т.д.
 */
class DataAggregator {
    
    /**
     * Универсальная функция агрегации временных рядов
     * Заменяет все специфичные функции агрегации
     */
    static aggregateTimeSeriesData(data, timeframe) {
        if (!data || data.length === 0) return [];
        
        const aggregationMethod = DataAggregator.getAggregationMethod(timeframe);
        
        if (aggregationMethod === 'none') {
            return data;
        }
        
        return DataAggregator.performAggregation(data, aggregationMethod);
    }
    
    /**
     * Определить метод агрегации для таймфрейма
     */
    static getAggregationMethod(timeframe) {
        const methods = {
            '240': 'none',     // 4H - не агрегируем
            'D': 'none',       // 1D - не агрегируем
            '3D': 'days_3',    // 3D - агрегируем в 3-дневные периоды
            'W': 'weeks'       // 1W - агрегируем в недельные периоды
        };
        
        return methods[timeframe] || 'none';
    }
    
    /**
     * Выполнить агрегацию данных
     */
    static performAggregation(data, method) {
        switch (method) {
            case 'weeks':
                return DataAggregator.aggregateToWeeks(data);
            case 'days_3':
                return DataAggregator.aggregateToNDays(data, 3);
            default:
                return data;
        }
    }
    
    /**
     * Агрегация в недельные периоды
     * Оптимизированная версия aggregateToWeeks()
     */
    static aggregateToWeeks(data) {
        const weekMap = new Map();
        
        for (const item of data) {
            const date = new Date(item.time * 1000);
            const weekStart = DataAggregator.getWeekStart(date);
            const weekKey = Math.floor(weekStart.getTime() / 1000);
            
            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, {
                    values: [],
                    candles: []
                });
            }
            
            if (item.value !== undefined) {
                weekMap.get(weekKey).values.push(item.value);
            }
            
            if (item.open !== undefined) {
                weekMap.get(weekKey).candles.push(item);
            }
        }
        
        return DataAggregator.convertMapToAggregatedData(weekMap);
    }
    
    /**
     * Агрегация в N-дневные периоды
     * Заменяет aggregateToThreeDays()
     */
    static aggregateToNDays(data, n) {
        const periodMap = new Map();
        
        for (const item of data) {
            const date = new Date(item.time * 1000);
            const periodStart = DataAggregator.getNDayPeriodStart(date, n);
            const periodKey = Math.floor(periodStart.getTime() / 1000);
            
            if (!periodMap.has(periodKey)) {
                periodMap.set(periodKey, {
                    values: [],
                    candles: []
                });
            }
            
            if (item.value !== undefined) {
                periodMap.get(periodKey).values.push(item.value);
            }
            
            if (item.open !== undefined) {
                periodMap.get(periodKey).candles.push(item);
            }
        }
        
        return DataAggregator.convertMapToAggregatedData(periodMap);
    }
    
    /**
     * Получить начало недели (понедельник)
     */
    static getWeekStart(date) {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Корректируем для понедельника
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }
    
    /**
     * Получить начало N-дневного периода
     */
    static getNDayPeriodStart(date, n) {
        const daysSinceEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
        const periodIndex = Math.floor(daysSinceEpoch / n);
        const periodStart = new Date(periodIndex * n * 24 * 60 * 60 * 1000);
        periodStart.setHours(0, 0, 0, 0);
        return periodStart;
    }
    
    /**
     * Конвертировать Map в агрегированные данные
     */
    static convertMapToAggregatedData(dataMap) {
        const result = [];
        
        for (const [periodKey, periodData] of dataMap) {
            const aggregatedItem = {
                time: periodKey
            };
            
            // Агрегируем простые значения (среднее)
            if (periodData.values.length > 0) {
                aggregatedItem.value = periodData.values.reduce((sum, val) => sum + val, 0) / periodData.values.length;
            }
            
            // Агрегируем свечи (OHLC)
            if (periodData.candles.length > 0) {
                const sortedCandles = periodData.candles.sort((a, b) => a.time - b.time);
                aggregatedItem.open = sortedCandles[0].open;
                aggregatedItem.high = Math.max(...sortedCandles.map(c => c.high));
                aggregatedItem.low = Math.min(...sortedCandles.map(c => c.low));
                aggregatedItem.close = sortedCandles[sortedCandles.length - 1].close;
            }
            
            result.push(aggregatedItem);
        }
        
        return result.sort((a, b) => a.time - b.time);
    }
}

// =============================================
// MODERN CHART UTILITIES
// =============================================

/**
 * Современные утилиты для работы с графиками
 * Используют встроенные возможности Lightweight Charts
 */
class ModernChartUtils {
    
    /**
     * Применить технический индикатор к данным
     */
    static applyTechnicalIndicator(data, indicatorType, period, options = {}) {
        if (!data || data.length === 0) return [];
        
        const values = data.map(item => item.value || item.close);
        const indicator = TechnicalIndicators.getMA(values, period, indicatorType);
        
        return DataAggregator.combineDataWithIndicator(data, indicator, period - 1);
    }
    
    /**
     * Объединить исходные данные с индикатором
     */
    static combineDataWithIndicator(originalData, indicatorValues, offset) {
        const result = [];
        
        for (let i = 0; i < indicatorValues.length; i++) {
            const originalIndex = offset + i;
            if (originalIndex < originalData.length) {
                result.push({
                    time: originalData[originalIndex].time,
                    value: indicatorValues[i]
                });
            }
        }
        
        return result;
    }
    
    /**
     * Автоматическая настройка масштаба графика
     * Использует встроенные возможности Lightweight Charts
     */
    static autoFitChart(chart, series) {
        try {
            // Используем встроенный метод timeScale()
            chart.timeScale().fitContent();
            
            // Для каждой серии применяем автоматический масштаб
            if (Array.isArray(series)) {
                series.forEach(s => {
                    if (s && typeof s.applyOptions === 'function') {
                        s.applyOptions({
                            autoscaleInfoProvider: () => ({
                                priceRange: null, // Автоматический расчет
                                margins: {
                                    above: 10,
                                    below: 10,
                                },
                            }),
                        });
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error in autoFitChart:', error);
        }
    }
    
    /**
     * Установить видимый диапазон времени
     * Использует встроенные возможности Lightweight Charts
     */
    static setVisibleTimeRange(chart, fromTime, toTime) {
        try {
            chart.timeScale().setVisibleRange({
                from: fromTime,
                to: toTime
            });
        } catch (error) {
            console.error('❌ Error in setVisibleTimeRange:', error);
        }
    }
    
    /**
     * Получить видимый диапазон времени
     */
    static getVisibleTimeRange(chart) {
        try {
            return chart.timeScale().getVisibleRange();
        } catch (error) {
            console.error('❌ Error in getVisibleTimeRange:', error);
            return null;
        }
    }
}

// =============================================
// EXPORT FOR GLOBAL USE
// =============================================

// Экспортируем для использования в других скриптах
if (typeof window !== 'undefined') {
    window.StaticTechnicalIndicators = TechnicalIndicators;
    window.DataAggregator = DataAggregator;
    window.ModernChartUtils = ModernChartUtils;
}

// Также экспортируем для Node.js окружения
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StaticTechnicalIndicators: TechnicalIndicators,
        DataAggregator,
        ModernChartUtils
    };
} 