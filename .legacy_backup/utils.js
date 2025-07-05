/**
 * Универсальные утилиты для работы с данными и графиками
 * JavaScript версия common модулей для браузера
 * 
 * NOTE: Многие функции можно заменить на встроенные TradingView решения:
 * - Для агрегации данных можно использовать встроенный TimeFrame API
 * - Для технических индикаторов есть готовые Pine Script библиотеки  
 * - Moving Average можно получить через TradingView Technical Analysis API
 */

/**
 * Утилиты для работы с датами
 */
const DateUtils = {
    /**
     * Конвертировать Date в Unix timestamp (секунды)
     * @param {Date} date - Дата для конвертации
     * @returns {number} Unix timestamp в секундах
     * 
     * NOTE: TradingView использует стандартный Unix timestamp
     * Можно использовать напрямую date.getTime() / 1000
     */
    toTimestamp: (date) => Math.floor(date.getTime() / 1000),
    
    /**
     * Конвертировать Unix timestamp в Date
     * @param {number} timestamp - Unix timestamp в секундах
     * @returns {Date} Объект Date
     */
    fromTimestamp: (timestamp) => new Date(timestamp * 1000),
    
    /**
     * Форматировать timestamp в локализованную строку
     * @param {number} timestamp - Unix timestamp в секундах
     * @param {string} locale - Локаль для форматирования
     * @returns {string} Отформатированная строка даты
     */
    toLocaleDateString: (timestamp, locale = 'ru-RU') => {
        return new Date(timestamp * 1000).toLocaleDateString(locale);
    },
    
    /**
     * Получить количество дней с Unix эпохи
     * @param {Date} date - Дата
     * @returns {number} Количество дней с эпохи
     */
    getDaysSinceEpoch: (date) => Math.floor(date.getTime() / (24 * 60 * 60 * 1000)),
    
    /**
     * Получить текущий Unix timestamp
     * @returns {number} Текущий timestamp
     */
    getCurrentTimestamp: () => Math.floor(Date.now() / 1000)
};

/**
 * Утилиты для работы с таймфреймами
 */
const TimeframeUtils = {
    /**
     * Мапинг таймфреймов в суффиксы для файлов
     * @param {string} timeframe - Таймфрейм
     * @returns {string} Суффикс для файла
     */
    getFileSuffix: (timeframe) => {
        const mapping = { '240': '4H', 'D': '1D', '3D': '1D', 'W': '1W' };
        return mapping[timeframe] || '1D';
    },
    
    /**
     * Мапинг таймфреймов в отображаемый текст
     * @param {string} timeframe - Таймфрейм
     * @returns {string} Отображаемый текст
     */
    getDisplayText: (timeframe) => {
        const mapping = { '240': '4H', 'D': '1D', '3D': '3D', 'W': '1W' };
        return mapping[timeframe] || '1D';
    },
    
    /**
     * Проверить, нужна ли агрегация данных
     * @param {string} timeframe - Таймфрейм
     * @returns {boolean} True если нужна агрегация
     */
    needsAggregation: (timeframe) => ['3D', 'W'].includes(timeframe),
    
    /**
     * Получить API таймфрейм
     * @param {string} timeframe - Таймфрейм
     * @returns {string} API таймфрейм
     */
    getApiTimeframe: (timeframe) => {
        return TimeframeUtils.needsAggregation(timeframe) ? 'D' : timeframe;
    },
    
    /**
     * Получить все поддерживаемые таймфреймы
     * @returns {string[]} Список таймфреймов
     */
    getSupportedTimeframes: () => ['240', 'D', '3D', 'W'],
    
    /**
     * Проверить валидность таймфрейма
     * @param {string} timeframe - Таймфрейм
     * @returns {boolean} True если валидный
     */
    isValidTimeframe: (timeframe) => TimeframeUtils.getSupportedTimeframes().includes(timeframe)
};

/**
 * Утилиты для расчета скользящих средних
 */
const MovingAverageCalculator = {
    /**
     * Простая скользящая средняя (SMA)
     * @param {number[]} values - Массив значений
     * @param {number} period - Период для расчета
     * @returns {number[]} Массив значений SMA
     */
    simpleMa: (values, period) => {
        if (values.length < period || period <= 0) {
            return [];
        }
        
        const maValues = [];
        for (let i = period - 1; i < values.length; i++) {
            const window = values.slice(i - period + 1, i + 1);
            const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
            maValues.push(avg);
        }
        
        return maValues;
    },
    
    /**
     * Экспоненциальная скользящая средняя (EMA)
     * @param {number[]} values - Массив значений
     * @param {number} period - Период для расчета
     * @returns {number[]} Массив значений EMA
     */
    exponentialMa: (values, period) => {
        if (!values.length || period <= 0) {
            return [];
        }
        
        const alpha = 2.0 / (period + 1);
        const emaValues = [values[0]];
        
        for (let i = 1; i < values.length; i++) {
            const ema = alpha * values[i] + (1 - alpha) * emaValues[emaValues.length - 1];
            emaValues.push(ema);
        }
        
        return emaValues;
    },
    
    /**
     * Универсальная функция расчета скользящей средней
     * @param {number[]} values - Массив значений
     * @param {number} period - Период для расчета
     * @param {string} type - Тип MA ('sma', 'ema')
     * @returns {number[]} Массив значений MA
     */
    calculate: (values, period, type = 'sma') => {
        switch (type.toLowerCase()) {
            case 'sma':
                return MovingAverageCalculator.simpleMa(values, period);
            case 'ema':
                return MovingAverageCalculator.exponentialMa(values, period);
            default:
                throw new Error(`Unsupported MA type: ${type}`);
        }
    }
};

/**
 * Утилиты для агрегации данных
 */
const DataAggregator = {
    /**
     * Агрегировать данные по неделям
     * @param {Object[]} data - Данные с полями time и value
     * @returns {Object[]} Недельные данные
     */
    aggregateToWeeks: (data) => {
        const weekMap = new Map();
        
        data.forEach(item => {
            const date = new Date(item.time * 1000);
            // Получаем понедельник недели
            const monday = new Date(date);
            monday.setDate(date.getDate() - date.getDay() + 1);
            monday.setHours(0, 0, 0, 0);
            
            const weekKey = DateUtils.toTimestamp(monday);
            
            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, []);
            }
            weekMap.get(weekKey).push(item.value);
        });
        
        // Преобразуем в массив с усредненными значениями
        const weeklyData = [];
        weekMap.forEach((values, weekTime) => {
            const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
            weeklyData.push({
                time: weekTime,
                value: avgValue
            });
        });
        
        return weeklyData.sort((a, b) => a.time - b.time);
    },
    
    /**
     * Агрегировать данные по 3-дневным периодам
     * @param {Object[]} data - Данные с полями time и value
     * @returns {Object[]} 3-дневные данные
     */
    aggregateToThreeDays: (data) => {
        const threeDayMap = new Map();
        
        data.forEach(item => {
            const date = new Date(item.time * 1000);
            const daysSinceEpoch = DateUtils.getDaysSinceEpoch(date);
            const threeDayPeriod = Math.floor(daysSinceEpoch / 3) * 3;
            
            const periodStart = new Date(threeDayPeriod * 24 * 60 * 60 * 1000);
            periodStart.setHours(0, 0, 0, 0);
            
            const periodKey = DateUtils.toTimestamp(periodStart);
            
            if (!threeDayMap.has(periodKey)) {
                threeDayMap.set(periodKey, []);
            }
            threeDayMap.get(periodKey).push(item.value);
        });
        
        // Преобразуем в массив с усредненными значениями
        const threeDayData = [];
        threeDayMap.forEach((values, periodTime) => {
            const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
            threeDayData.push({
                time: periodTime,
                value: avgValue
            });
        });
        
        return threeDayData.sort((a, b) => a.time - b.time);
    },
    
    /**
     * Агрегировать свечи по неделям
     * @param {Object[]} candleData - Данные свечей
     * @returns {Object[]} Недельные свечи
     */
    aggregateCandlesToWeeks: (candleData) => {
        const weekMap = new Map();
        
        candleData.forEach(candle => {
            const date = new Date(candle.time * 1000);
            const monday = new Date(date);
            monday.setDate(date.getDate() - date.getDay() + 1);
            monday.setHours(0, 0, 0, 0);
            
            const weekKey = DateUtils.toTimestamp(monday);
            
            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, []);
            }
            weekMap.get(weekKey).push(candle);
        });
        
        // Преобразуем в недельные свечи
        const weeklyCandles = [];
        weekMap.forEach((candles, weekTime) => {
            if (candles.length > 0) {
                candles.sort((a, b) => a.time - b.time);
                
                const weeklyCandle = {
                    time: weekTime,
                    open: candles[0].open,
                    high: Math.max(...candles.map(c => c.high)),
                    low: Math.min(...candles.map(c => c.low)),
                    close: candles[candles.length - 1].close
                };
                
                weeklyCandles.push(weeklyCandle);
            }
        });
        
        return weeklyCandles.sort((a, b) => a.time - b.time);
    },
    
    /**
     * Агрегировать свечи по 3-дневным периодам
     * @param {Object[]} candleData - Данные свечей
     * @returns {Object[]} 3-дневные свечи
     */
    aggregateCandlesToThreeDays: (candleData) => {
        const threeDayMap = new Map();
        
        candleData.forEach(candle => {
            const date = new Date(candle.time * 1000);
            const daysSinceEpoch = DateUtils.getDaysSinceEpoch(date);
            const threeDayPeriod = Math.floor(daysSinceEpoch / 3) * 3;
            
            const periodStart = new Date(threeDayPeriod * 24 * 60 * 60 * 1000);
            periodStart.setHours(0, 0, 0, 0);
            
            const periodKey = DateUtils.toTimestamp(periodStart);
            
            if (!threeDayMap.has(periodKey)) {
                threeDayMap.set(periodKey, []);
            }
            threeDayMap.get(periodKey).push(candle);
        });
        
        // Преобразуем в 3-дневные свечи
        const threeDayCandles = [];
        threeDayMap.forEach((candles, periodTime) => {
            if (candles.length > 0) {
                candles.sort((a, b) => a.time - b.time);
                
                const threeDayCandle = {
                    time: periodTime,
                    open: candles[0].open,
                    high: Math.max(...candles.map(c => c.high)),
                    low: Math.min(...candles.map(c => c.low)),
                    close: candles[candles.length - 1].close
                };
                
                threeDayCandles.push(threeDayCandle);
            }
        });
        
        return threeDayCandles.sort((a, b) => a.time - b.time);
    },
    
    /**
     * Универсальная функция агрегации данных
     * @param {Object[]} data - Данные для агрегации
     * @param {string} timeframe - Таймфрейм
     * @returns {Object[]} Агрегированные данные
     */
    aggregateByTimeframe: (data, timeframe) => {
        switch (timeframe) {
            case '3D':
                return DataAggregator.aggregateToThreeDays(data);
            case 'W':
                return DataAggregator.aggregateToWeeks(data);
            default:
                return data;
        }
    },
    
    /**
     * Универсальная функция агрегации свечей
     * @param {Object[]} candleData - Данные свечей
     * @param {string} timeframe - Таймфрейм
     * @returns {Object[]} Агрегированные свечи
     */
    aggregateCandlesByTimeframe: (candleData, timeframe) => {
        switch (timeframe) {
            case '3D':
                return DataAggregator.aggregateCandlesToThreeDays(candleData);
            case 'W':
                return DataAggregator.aggregateCandlesToWeeks(candleData);
            default:
                return candleData;
        }
    }
};

/**
 * Утилиты для обновления данных
 */
const DataUpdateUtils = {
    /**
     * Обновить дату начала если нужно и перезагрузить данные
     * @param {string} reason - Причина обновления
     * @param {Function} getCommonStartDate - Функция получения общей даты
     * @param {Function} loadData - Функция загрузки данных
     * @param {Function} updateStatus - Функция обновления статуса
     * @returns {Promise<void>}
     */
    async updateStartDateAndReload(reason = 'доступности данных', getCommonStartDate, loadData, updateStatus) {
        const commonStartDate = await getCommonStartDate();
        const fromDateInput = document.getElementById('fromDate');
        const currentFromDate = fromDateInput.value;
        
        // Если текущая дата раньше общей даты, обновляем ее
        if (!currentFromDate || new Date(currentFromDate) < new Date(commonStartDate)) {
            fromDateInput.value = commonStartDate;
            console.log(`📅 Updated start date to: ${commonStartDate}`);
            updateStatus(`Дата начала скорректирована до ${DateUtils.toLocaleDateString(DateUtils.toTimestamp(new Date(commonStartDate)))} из-за ${reason}`, 'info');
        }
        
        console.log('🔄 Reloading data...');
        loadData();
    }
};

// Экспорт для использования в HTML
if (typeof window !== 'undefined') {
    window.DateUtils = DateUtils;
    window.TimeframeUtils = TimeframeUtils;
    window.MovingAverageCalculator = MovingAverageCalculator;
    window.DataAggregator = DataAggregator;
    window.DataUpdateUtils = DataUpdateUtils;
}

// Для совместимости с Node.js (если понадобится)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DateUtils,
        TimeframeUtils,
        MovingAverageCalculator,
        DataAggregator,
        DataUpdateUtils
    };
} 