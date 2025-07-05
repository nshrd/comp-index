/**
 * Candlestick & Bar Series for Lightweight Charts
 * Интеграция свечных и бар-графиков с расширенными возможностями
 */

class CandlestickBarSeries {
    
    constructor(chart) {
        this.chart = chart;
        this.candlestickSeries = new Map();
        this.barSeries = new Map();
        this.seriesConfig = {
            candlestick: {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                borderUpColor: '#26a69a',
                borderDownColor: '#ef5350',
                wickVisible: true,
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01
                }
            },
            bar: {
                upColor: '#26a69a',
                downColor: '#ef5350',
                openVisible: true,
                thinBars: false,
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01
                }
            }
        };
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация модуля
     */
    initialize() {
        try {
            this.isInitialized = true;
            console.log('✅ Candlestick & Bar Series initialized');
            
        } catch (error) {
            console.error('❌ Candlestick & Bar Series initialization failed:', error);
        }
    }

    // ==========================================
    // CANDLESTICK SERIES
    // ==========================================

    /**
     * Создание свечного графика
     */
    addCandlestickSeries(id, options = {}) {
        try {
            const config = { ...this.seriesConfig.candlestick, ...options };
            
            const series = this.chart.addCandlestickSeries(config);
            this.candlestickSeries.set(id, {
                series: series,
                config: config,
                type: 'candlestick'
            });
            
            console.log(`✅ Candlestick series '${id}' created`);
            return series;
            
        } catch (error) {
            console.error(`❌ Candlestick series '${id}' creation failed:`, error);
            throw error;
        }
    }

    /**
     * Установка данных для свечного графика
     */
    setCandlestickData(id, data) {
        try {
            const seriesInfo = this.candlestickSeries.get(id);
            if (!seriesInfo) {
                throw new Error(`Candlestick series '${id}' not found`);
            }

            // Валидация данных OHLC
            const validatedData = this.validateOHLCData(data);
            seriesInfo.series.setData(validatedData);
            
            console.log(`✅ Candlestick data set for '${id}': ${validatedData.length} candles`);
            
        } catch (error) {
            console.error(`❌ Candlestick data setting failed for '${id}':`, error);
            throw error;
        }
    }

    /**
     * Обновление свечного графика в реальном времени
     */
    updateCandlestick(id, candle) {
        try {
            const seriesInfo = this.candlestickSeries.get(id);
            if (!seriesInfo) {
                throw new Error(`Candlestick series '${id}' not found`);
            }

            const validatedCandle = this.validateOHLCCandle(candle);
            seriesInfo.series.update(validatedCandle);
            
        } catch (error) {
            console.error(`❌ Candlestick update failed for '${id}':`, error);
            throw error;
        }
    }

    /**
     * Настройка стилей свечного графика
     */
    setCandlestickStyle(id, styleOptions) {
        try {
            const seriesInfo = this.candlestickSeries.get(id);
            if (!seriesInfo) {
                throw new Error(`Candlestick series '${id}' not found`);
            }

            seriesInfo.series.applyOptions(styleOptions);
            seriesInfo.config = { ...seriesInfo.config, ...styleOptions };
            
            console.log(`✅ Candlestick style updated for '${id}'`);
            
        } catch (error) {
            console.error(`❌ Candlestick style update failed for '${id}':`, error);
        }
    }

    // ==========================================
    // BAR SERIES
    // ==========================================

    /**
     * Создание бар-графика
     */
    addBarSeries(id, options = {}) {
        try {
            const config = { ...this.seriesConfig.bar, ...options };
            
            const series = this.chart.addBarSeries(config);
            this.barSeries.set(id, {
                series: series,
                config: config,
                type: 'bar'
            });
            
            console.log(`✅ Bar series '${id}' created`);
            return series;
            
        } catch (error) {
            console.error(`❌ Bar series '${id}' creation failed:`, error);
            throw error;
        }
    }

    /**
     * Установка данных для бар-графика
     */
    setBarData(id, data) {
        try {
            const seriesInfo = this.barSeries.get(id);
            if (!seriesInfo) {
                throw new Error(`Bar series '${id}' not found`);
            }

            const validatedData = this.validateOHLCData(data);
            seriesInfo.series.setData(validatedData);
            
            console.log(`✅ Bar data set for '${id}': ${validatedData.length} bars`);
            
        } catch (error) {
            console.error(`❌ Bar data setting failed for '${id}':`, error);
            throw error;
        }
    }

    /**
     * Настройка стилей бар-графика
     */
    setBarStyle(id, styleOptions) {
        try {
            const seriesInfo = this.barSeries.get(id);
            if (!seriesInfo) {
                throw new Error(`Bar series '${id}' not found`);
            }

            seriesInfo.series.applyOptions(styleOptions);
            seriesInfo.config = { ...seriesInfo.config, ...styleOptions };
            
            console.log(`✅ Bar style updated for '${id}'`);
            
        } catch (error) {
            console.error(`❌ Bar style update failed for '${id}':`, error);
        }
    }

    // ==========================================
    // DATA VALIDATION
    // ==========================================

    /**
     * Валидация OHLC данных
     */
    validateOHLCData(data) {
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        return data.map(item => this.validateOHLCCandle(item));
    }

    /**
     * Валидация одной свечи/бара
     */
    validateOHLCCandle(candle) {
        const required = ['time', 'open', 'high', 'low', 'close'];
        
        for (const field of required) {
            if (candle[field] === undefined || candle[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Проверка логики OHLC
        const { open, high, low, close } = candle;
        
        if (high < Math.max(open, close) || low > Math.min(open, close)) {
            console.warn('⚠️ Invalid OHLC data detected:', candle);
        }

        return {
            time: candle.time,
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close)
        };
    }

    // ==========================================
    // DATA CONVERSION
    // ==========================================

    /**
     * Конвертация line-данных в OHLC
     */
    convertLineToOHLC(lineData, timeframe = '1D') {
        if (!Array.isArray(lineData) || lineData.length === 0) {
            return [];
        }

        const ohlcData = [];
        const timeframeMs = this.getTimeframeMs(timeframe);
        
        let currentCandle = null;
        
        for (const point of lineData) {
            const candleStart = Math.floor(point.time / timeframeMs) * timeframeMs;
            
            if (!currentCandle || currentCandle.time !== candleStart) {
                // Сохраняем предыдущую свечу
                if (currentCandle) {
                    ohlcData.push(currentCandle);
                }
                
                // Начинаем новую свечу
                currentCandle = {
                    time: candleStart,
                    open: point.value,
                    high: point.value,
                    low: point.value,
                    close: point.value
                };
            } else {
                // Обновляем текущую свечу
                currentCandle.high = Math.max(currentCandle.high, point.value);
                currentCandle.low = Math.min(currentCandle.low, point.value);
                currentCandle.close = point.value;
            }
        }
        
        // Добавляем последнюю свечу
        if (currentCandle) {
            ohlcData.push(currentCandle);
        }
        
        return ohlcData;
    }

    /**
     * Получение интервала в миллисекундах
     */
    getTimeframeMs(timeframe) {
        const intervals = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1H': 60 * 60 * 1000,
            '4H': 4 * 60 * 60 * 1000,
            '1D': 24 * 60 * 60 * 1000,
            '1W': 7 * 24 * 60 * 60 * 1000
        };
        
        return intervals[timeframe] || intervals['1D'];
    }

    // ==========================================
    // PRESET CONFIGURATIONS
    // ==========================================

    /**
     * Создание классического свечного графика
     */
    createClassicCandlesticks(id, data, options = {}) {
        const classicConfig = {
            upColor: '#00C851',
            downColor: '#FF4444',
            borderVisible: true,
            wickUpColor: '#00C851',
            wickDownColor: '#FF4444',
            borderUpColor: '#00C851',
            borderDownColor: '#FF4444',
            ...options
        };
        
        const series = this.addCandlestickSeries(id, classicConfig);
        
        if (data) {
            this.setCandlestickData(id, data);
        }
        
        return series;
    }

    /**
     * Создание полых свечей (Hollow Candles)
     */
    createHollowCandlesticks(id, data, options = {}) {
        const hollowConfig = {
            upColor: 'transparent',
            downColor: '#FF4444',
            borderVisible: true,
            wickUpColor: '#00C851',
            wickDownColor: '#FF4444',
            borderUpColor: '#00C851',
            borderDownColor: '#FF4444',
            ...options
        };
        
        const series = this.addCandlestickSeries(id, hollowConfig);
        
        if (data) {
            this.setCandlestickData(id, data);
        }
        
        return series;
    }

    /**
     * Создание Heikin-Ashi стиля
     */
    createHeikinAshiCandlesticks(id, data, options = {}) {
        if (!data || data.length === 0) {
            throw new Error('Data required for Heikin-Ashi calculation');
        }

        const heikinAshiData = this.calculateHeikinAshi(data);
        
        const heikinAshiConfig = {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            ...options
        };
        
        const series = this.addCandlestickSeries(id, heikinAshiConfig);
        this.setCandlestickData(id, heikinAshiData);
        
        return series;
    }

    /**
     * Расчёт Heikin-Ashi
     */
    calculateHeikinAshi(data) {
        const heikinAshi = [];
        let prevHA = null;
        
        for (const candle of data) {
            const ha = {
                time: candle.time,
                close: (candle.open + candle.high + candle.low + candle.close) / 4
            };
            
            if (prevHA) {
                ha.open = (prevHA.open + prevHA.close) / 2;
            } else {
                ha.open = (candle.open + candle.close) / 2;
            }
            
            ha.high = Math.max(candle.high, ha.open, ha.close);
            ha.low = Math.min(candle.low, ha.open, ha.close);
            
            heikinAshi.push(ha);
            prevHA = ha;
        }
        
        return heikinAshi;
    }

    // ==========================================
    // PATTERN RECOGNITION
    // ==========================================

    /**
     * Поиск паттернов свечей
     */
    findCandlestickPatterns(data, patterns = ['doji', 'hammer', 'engulfing']) {
        const foundPatterns = [];
        
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i - 1];
            
            for (const pattern of patterns) {
                const result = this.checkPattern(pattern, current, previous, data, i);
                if (result) {
                    foundPatterns.push({
                        time: current.time,
                        pattern: pattern,
                        confidence: result.confidence,
                        direction: result.direction
                    });
                }
            }
        }
        
        return foundPatterns;
    }

    /**
     * Проверка конкретного паттерна
     */
    checkPattern(pattern, current, previous, data, index) {
        const body = Math.abs(current.close - current.open);
        const range = current.high - current.low;
        const bodyRatio = range > 0 ? body / range : 0;
        
        switch (pattern) {
            case 'doji':
                return bodyRatio < 0.1 ? { confidence: 0.8, direction: 'neutral' } : null;
                
            case 'hammer':
                const isHammer = current.close > current.open && 
                               (current.close - current.open) < (current.open - current.low) * 0.3 &&
                               (current.high - current.close) < body * 0.3;
                return isHammer ? { confidence: 0.7, direction: 'bullish' } : null;
                
            case 'engulfing':
                const isBullishEngulfing = current.close > current.open &&
                                         previous.close < previous.open &&
                                         current.open < previous.close &&
                                         current.close > previous.open;
                const isBearishEngulfing = current.close < current.open &&
                                         previous.close > previous.open &&
                                         current.open > previous.close &&
                                         current.close < previous.open;
                
                if (isBullishEngulfing) return { confidence: 0.8, direction: 'bullish' };
                if (isBearishEngulfing) return { confidence: 0.8, direction: 'bearish' };
                return null;
                
            default:
                return null;
        }
    }

    // ==========================================
    // MANAGEMENT FUNCTIONS
    // ==========================================

    /**
     * Удаление серии
     */
    removeSeries(id) {
        try {
            let seriesInfo = this.candlestickSeries.get(id);
            if (seriesInfo) {
                this.chart.removeSeries(seriesInfo.series);
                this.candlestickSeries.delete(id);
                console.log(`✅ Candlestick series '${id}' removed`);
                return true;
            }
            
            seriesInfo = this.barSeries.get(id);
            if (seriesInfo) {
                this.chart.removeSeries(seriesInfo.series);
                this.barSeries.delete(id);
                console.log(`✅ Bar series '${id}' removed`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Series '${id}' removal failed:`, error);
            return false;
        }
    }

    /**
     * Получение всех серий
     */
    getAllSeries() {
        const allSeries = [];
        
        this.candlestickSeries.forEach((info, id) => {
            allSeries.push({ id, type: 'candlestick', config: info.config });
        });
        
        this.barSeries.forEach((info, id) => {
            allSeries.push({ id, type: 'bar', config: info.config });
        });
        
        return allSeries;
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            candlestickCount: this.candlestickSeries.size,
            barCount: this.barSeries.size,
            totalSeries: this.candlestickSeries.size + this.barSeries.size
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        // Удаляем все серии
        [...this.candlestickSeries.keys()].forEach(id => this.removeSeries(id));
        [...this.barSeries.keys()].forEach(id => this.removeSeries(id));
        
        this.candlestickSeries.clear();
        this.barSeries.clear();
        this.isInitialized = false;
        
        console.log('🗑️ Candlestick & Bar Series destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CandlestickBarSeries;
} else if (typeof window !== 'undefined') {
    window.CandlestickBarSeries = CandlestickBarSeries;
} 