/**
 * Enhanced Technical Indicators Library for CBMA14 Project
 * Максимальная оптимизация для TradingView Lightweight Charts
 */

class EnhancedTechnicalIndicators {
    
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут кэш
    }

    /**
     * Генерация уникального ключа для кэширования
     */
    _generateCacheKey(data, indicator, params) {
        const dataHash = this._hashArray(data.slice(-100)); // Последние 100 точек
        return `${indicator}_${JSON.stringify(params)}_${dataHash}`;
    }

    /**
     * Простой хэш массива данных
     */
    _hashArray(arr) {
        return arr.reduce((hash, item) => {
            return hash + (typeof item === 'object' ? item.close || item.value || 0 : item);
        }, 0).toString(36);
    }

    /**
     * Получить из кэша или вычислить
     */
    _getOrCalculate(cacheKey, calculator) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        
        const result = calculator();
        this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        // Очистка старого кэша
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        return result;
    }

    // ==========================================
    // ОСНОВНЫЕ ИНДИКАТОРЫ
    // ==========================================

    /**
     * Simple Moving Average (SMA) с кэшированием
     */
    sma(data, period = 14) {
        const cacheKey = this._generateCacheKey(data, 'sma', { period });
        
        return this._getOrCalculate(cacheKey, () => {
            if (data.length < period) return [];
            
            const result = [];
            for (let i = period - 1; i < data.length; i++) {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    const value = typeof data[i - j] === 'object' ? data[i - j].close : data[i - j];
                    sum += value;
                }
                result.push({
                    time: data[i].time || i,
                    value: sum / period
                });
            }
            return result;
        });
    }

    /**
     * Exponential Moving Average (EMA)
     */
    ema(data, period = 14) {
        const cacheKey = this._generateCacheKey(data, 'ema', { period });
        
        return this._getOrCalculate(cacheKey, () => {
            if (data.length < period) return [];
            
            const multiplier = 2 / (period + 1);
            const result = [];
            
            // Первое значение - SMA
            let sum = 0;
            for (let i = 0; i < period; i++) {
                const value = typeof data[i] === 'object' ? data[i].close : data[i];
                sum += value;
            }
            let ema = sum / period;
            
            result.push({
                time: data[period - 1].time || (period - 1),
                value: ema
            });
            
            // Остальные значения - EMA
            for (let i = period; i < data.length; i++) {
                const value = typeof data[i] === 'object' ? data[i].close : data[i];
                ema = (value * multiplier) + (ema * (1 - multiplier));
                result.push({
                    time: data[i].time || i,
                    value: ema
                });
            }
            
            return result;
        });
    }

    /**
     * Relative Strength Index (RSI)
     */
    rsi(data, period = 14) {
        const cacheKey = this._generateCacheKey(data, 'rsi', { period });
        
        return this._getOrCalculate(cacheKey, () => {
            if (data.length < period + 1) return [];
            
            const result = [];
            const gains = [];
            const losses = [];
            
            // Вычисляем изменения цен
            for (let i = 1; i < data.length; i++) {
                const current = typeof data[i] === 'object' ? data[i].close : data[i];
                const previous = typeof data[i-1] === 'object' ? data[i-1].close : data[i-1];
                const change = current - previous;
                
                gains.push(change > 0 ? change : 0);
                losses.push(change < 0 ? Math.abs(change) : 0);
            }
            
            // Первый RSI на основе простого среднего
            let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
            let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
            
            let rs = avgGain / avgLoss;
            let rsi = 100 - (100 / (1 + rs));
            
            result.push({
                time: data[period].time || period,
                value: rsi
            });
            
            // Остальные значения с экспоненциальным сглаживанием
            for (let i = period; i < gains.length; i++) {
                avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
                avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
                
                rs = avgGain / avgLoss;
                rsi = 100 - (100 / (1 + rs));
                
                result.push({
                    time: data[i + 1].time || (i + 1),
                    value: rsi
                });
            }
            
            return result;
        });
    }

    /**
     * MACD (Moving Average Convergence Divergence)
     */
    macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const cacheKey = this._generateCacheKey(data, 'macd', { fastPeriod, slowPeriod, signalPeriod });
        
        return this._getOrCalculate(cacheKey, () => {
            const fastEMA = this.ema(data, fastPeriod);
            const slowEMA = this.ema(data, slowPeriod);
            
            if (fastEMA.length === 0 || slowEMA.length === 0) return { macd: [], signal: [], histogram: [] };
            
            // MACD линия
            const macdLine = [];
            const minLength = Math.min(fastEMA.length, slowEMA.length);
            
            for (let i = 0; i < minLength; i++) {
                macdLine.push({
                    time: fastEMA[i].time,
                    value: fastEMA[i].value - slowEMA[i].value
                });
            }
            
            // Signal линия (EMA от MACD)
            const signalLine = this.ema(macdLine, signalPeriod);
            
            // Histogram
            const histogram = [];
            const histMinLength = Math.min(macdLine.length, signalLine.length);
            
            for (let i = 0; i < histMinLength; i++) {
                histogram.push({
                    time: macdLine[i].time,
                    value: macdLine[i].value - signalLine[i].value
                });
            }
            
            return {
                macd: macdLine,
                signal: signalLine,
                histogram: histogram
            };
        });
    }

    /**
     * Bollinger Bands
     */
    bollingerBands(data, period = 20, stdDev = 2) {
        const cacheKey = this._generateCacheKey(data, 'bb', { period, stdDev });
        
        return this._getOrCalculate(cacheKey, () => {
            const smaData = this.sma(data, period);
            if (smaData.length === 0) return { upper: [], middle: [], lower: [] };
            
            const result = { upper: [], middle: [], lower: [] };
            
            for (let i = 0; i < smaData.length; i++) {
                const dataIndex = i + period - 1;
                
                // Стандартное отклонение
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    const value = typeof data[dataIndex - j] === 'object' ? data[dataIndex - j].close : data[dataIndex - j];
                    sum += Math.pow(value - smaData[i].value, 2);
                }
                const standardDeviation = Math.sqrt(sum / period);
                
                const time = smaData[i].time;
                const middle = smaData[i].value;
                const upper = middle + (standardDeviation * stdDev);
                const lower = middle - (standardDeviation * stdDev);
                
                result.upper.push({ time, value: upper });
                result.middle.push({ time, value: middle });
                result.lower.push({ time, value: lower });
            }
            
            return result;
        });
    }

    /**
     * Stochastic Oscillator
     */
    stochastic(data, kPeriod = 14, dPeriod = 3) {
        const cacheKey = this._generateCacheKey(data, 'stoch', { kPeriod, dPeriod });
        
        return this._getOrCalculate(cacheKey, () => {
            if (data.length < kPeriod) return { k: [], d: [] };
            
            const kValues = [];
            
            for (let i = kPeriod - 1; i < data.length; i++) {
                let highest = -Infinity;
                let lowest = Infinity;
                
                for (let j = 0; j < kPeriod; j++) {
                    const candle = data[i - j];
                    const high = candle.high || candle.close || candle;
                    const low = candle.low || candle.close || candle;
                    
                    highest = Math.max(highest, high);
                    lowest = Math.min(lowest, low);
                }
                
                const close = data[i].close || data[i];
                const k = ((close - lowest) / (highest - lowest)) * 100;
                
                kValues.push({
                    time: data[i].time || i,
                    value: k
                });
            }
            
            const dValues = this.sma(kValues, dPeriod);
            
            return { k: kValues, d: dValues };
        });
    }

    // ==========================================
    // КАСТОМНЫЕ ИНДИКАТОРЫ ДЛЯ CBMA14
    // ==========================================

    /**
     * Кастомный CBMA14 Enhanced индикатор
     */
    cbma14Enhanced(data, period = 14, smoothing = 3) {
        const cacheKey = this._generateCacheKey(data, 'cbma14_enhanced', { period, smoothing });
        
        return this._getOrCalculate(cacheKey, () => {
            // Базовый CBMA14
            const cbma14 = this._calculateBasicCBMA14(data, period);
            
            // Добавляем сглаживание
            const smoothed = this.ema(cbma14, smoothing);
            
            // Добавляем сигнальную линию
            const signal = this.ema(smoothed, Math.floor(smoothing * 1.5));
            
            return {
                main: smoothed,
                signal: signal,
                histogram: this._calculateHistogram(smoothed, signal)
            };
        });
    }

    /**
     * Базовый расчет CBMA14 (упрощенная версия)
     */
    _calculateBasicCBMA14(data, period) {
        // Здесь должна быть ваша логика CBMA14
        // Пока возвращаем модифицированную EMA как пример
        return this.ema(data, period).map(item => ({
            ...item,
            value: item.value * 1.1 // Пример модификации
        }));
    }

    /**
     * Расчет гистограммы между двумя линиями
     */
    _calculateHistogram(series1, series2) {
        const result = [];
        const minLength = Math.min(series1.length, series2.length);
        
        for (let i = 0; i < minLength; i++) {
            result.push({
                time: series1[i].time,
                value: series1[i].value - series2[i].value
            });
        }
        
        return result;
    }

    // ==========================================
    // ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ
    // ==========================================

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Получение статистики кэша
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    /**
     * Универсальная функция для применения индикатора
     */
    applyIndicator(indicatorName, data, params = {}) {
        switch (indicatorName.toLowerCase()) {
            case 'sma':
                return this.sma(data, params.period || 14);
            case 'ema':
                return this.ema(data, params.period || 14);
            case 'rsi':
                return this.rsi(data, params.period || 14);
            case 'macd':
                return this.macd(data, params.fast || 12, params.slow || 26, params.signal || 9);
            case 'bollinger':
            case 'bb':
                return this.bollingerBands(data, params.period || 20, params.stdDev || 2);
            case 'stochastic':
            case 'stoch':
                return this.stochastic(data, params.k || 14, params.d || 3);
            case 'cbma14':
                return this.cbma14Enhanced(data, params.period || 14, params.smoothing || 3);
            default:
                throw new Error(`Unknown indicator: ${indicatorName}`);
        }
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedTechnicalIndicators;
} else if (typeof window !== 'undefined') {
    window.EnhancedTechnicalIndicators = EnhancedTechnicalIndicators;
}

// Создание глобального экземпляра
const EnhancedIndicators = new EnhancedTechnicalIndicators(); 