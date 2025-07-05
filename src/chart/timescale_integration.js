/**
 * TradingView TimeScale API Integration
 * Замена самописной агрегации данных на встроенные возможности TradingView
 */

class TimeScaleManager {
    
    constructor(chart) {
        this.chart = chart;
        this.timeScale = chart.timeScale();
        this.visibleRangeChangeListeners = new Set();
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация TimeScale API
     */
    initialize() {
        try {
            // Подписываемся на изменения видимого диапазона
            this.timeScale.subscribeVisibleTimeRangeChange(this.handleVisibleRangeChange.bind(this));
            
            // Настройка параметров временной шкалы для оптимальной работы
            this.timeScale.applyOptions({
                rightOffset: 12,
                barSpacing: 6,
                minBarSpacing: 0.5,
                fixLeftEdge: false,
                fixRightEdge: false,
                lockVisibleTimeRangeOnResize: false,
                rightBarStaysOnScroll: false,
                shiftVisibleRangeOnNewBar: false,
                timeVisible: true,
                secondsVisible: false
            });
            
            this.isInitialized = true;
            console.log('✅ TimeScale API initialized');
            
        } catch (error) {
            console.error('❌ TimeScale API initialization failed:', error);
        }
    }

    /**
     * Обработчик изменения видимого диапазона
     */
    handleVisibleRangeChange(newVisibleRange) {
        if (!newVisibleRange) return;
        
        console.log('📊 Visible range changed:', {
            from: new Date(newVisibleRange.from * 1000).toLocaleDateString(),
            to: new Date(newVisibleRange.to * 1000).toLocaleDateString()
        });
        
        // Уведомляем слушателей об изменении
        this.visibleRangeChangeListeners.forEach(listener => {
            try {
                listener(newVisibleRange);
            } catch (error) {
                console.error('❌ Error in visible range change listener:', error);
            }
        });
    }

    // ==========================================
    // АВТОМАТИЧЕСКАЯ АГРЕГАЦИЯ ДАННЫХ
    // ==========================================

    /**
     * Автоматическая агрегация данных на основе видимого диапазона
     * Заменяет самописные функции aggregateToWeeks(), aggregateToThreeDays()
     */
    autoAggregateDataByVisibleRange(data, options = {}) {
        if (!data || data.length === 0) return data;
        
        const visibleRange = this.getVisibleRange();
        if (!visibleRange) return data;
        
        const timeSpan = visibleRange.to - visibleRange.from;
        const dataPoints = this.getVisibleDataPointsCount(data, visibleRange);
        
        // Автоматически определяем нужную агрегацию
        const aggregationLevel = this.determineOptimalAggregation(timeSpan, dataPoints, options);
        
        console.log(`📊 Auto-aggregation: ${aggregationLevel.level} (${dataPoints} points in ${Math.round(timeSpan / 86400)} days)`);
        
        return this.performSmartAggregation(data, aggregationLevel);
    }

    /**
     * Определение оптимального уровня агрегации
     */
    determineOptimalAggregation(timeSpanSeconds, dataPointsCount, options = {}) {
        const days = timeSpanSeconds / 86400;
        const maxPoints = options.maxDataPoints || 500;
        const minPoints = options.minDataPoints || 50;
        
        // Если данных слишком много, агрегируем
        if (dataPointsCount > maxPoints) {
            if (days > 365 * 2) {
                return { level: 'monthly', intervalSeconds: 86400 * 30 };
            } else if (days > 365) {
                return { level: 'weekly', intervalSeconds: 86400 * 7 };
            } else if (days > 90) {
                return { level: 'daily', intervalSeconds: 86400 };
            } else {
                return { level: '4hour', intervalSeconds: 14400 };
            }
        }
        
        // Если данных слишком мало, используем более детальный уровень
        if (dataPointsCount < minPoints && days > 30) {
            return { level: 'hourly', intervalSeconds: 3600 };
        }
        
        // По умолчанию не агрегируем
        return { level: 'none', intervalSeconds: 0 };
    }

    /**
     * Умная агрегация данных
     */
    performSmartAggregation(data, aggregationLevel) {
        if (aggregationLevel.level === 'none') {
            return data;
        }
        
        const aggregatedData = [];
        const intervalSeconds = aggregationLevel.intervalSeconds;
        
        const buckets = new Map();
        
        // Группируем данные по интервалам
        for (const item of data) {
            const bucketTime = Math.floor(item.time / intervalSeconds) * intervalSeconds;
            
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, []);
            }
            buckets.get(bucketTime).push(item);
        }
        
        // Агрегируем каждый bucket
        for (const [bucketTime, bucketData] of buckets) {
            const aggregatedItem = this.aggregateBucket(bucketData, bucketTime);
            if (aggregatedItem) {
                aggregatedData.push(aggregatedItem);
            }
        }
        
        return aggregatedData.sort((a, b) => a.time - b.time);
    }

    /**
     * Агрегация bucket данных
     */
    aggregateBucket(bucketData, bucketTime) {
        if (!bucketData || bucketData.length === 0) return null;
        
        const result = { time: bucketTime };
        
        // Сортируем по времени
        bucketData.sort((a, b) => a.time - b.time);
        
        // Агрегируем простые значения (среднее)
        if (bucketData[0].value !== undefined) {
            const values = bucketData.map(item => item.value).filter(v => !isNaN(v));
            if (values.length > 0) {
                result.value = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
        }
        
        // Агрегируем OHLC данные
        if (bucketData[0].open !== undefined) {
            const ohlcData = bucketData.filter(item => 
                item.open !== undefined && 
                item.high !== undefined && 
                item.low !== undefined && 
                item.close !== undefined
            );
            
            if (ohlcData.length > 0) {
                result.open = ohlcData[0].open;
                result.high = Math.max(...ohlcData.map(item => item.high));
                result.low = Math.min(...ohlcData.map(item => item.low));
                result.close = ohlcData[ohlcData.length - 1].close;
            }
        }
        
        return result;
    }

    /**
     * Получение количества видимых точек данных
     */
    getVisibleDataPointsCount(data, visibleRange) {
        if (!visibleRange) return data.length;
        
        return data.filter(item => 
            item.time >= visibleRange.from && item.time <= visibleRange.to
        ).length;
    }

    // ==========================================
    // УПРАВЛЕНИЕ ВИДИМЫМ ДИАПАЗОНОМ
    // ==========================================

    /**
     * Установить видимый диапазон
     */
    setVisibleRange(from, to) {
        try {
            this.timeScale.setVisibleRange({ from, to });
            console.log(`📊 Visible range set: ${new Date(from * 1000).toLocaleDateString()} - ${new Date(to * 1000).toLocaleDateString()}`);
            return true;
        } catch (error) {
            console.error('❌ Error setting visible range:', error);
            return false;
        }
    }

    /**
     * Получить текущий видимый диапазон
     */
    getVisibleRange() {
        try {
            return this.timeScale.getVisibleRange();
        } catch (error) {
            console.error('❌ Error getting visible range:', error);
            return null;
        }
    }

    /**
     * Подогнать все содержимое
     */
    fitContent() {
        try {
            this.timeScale.fitContent();
            console.log('📊 Content fitted to visible area');
            return true;
        } catch (error) {
            console.error('❌ Error fitting content:', error);
            return false;
        }
    }

    /**
     * Сброс временной шкалы
     */
    resetTimeScale() {
        try {
            if (this.timeScale.resetTimeScale) {
                this.timeScale.resetTimeScale();
            } else {
                // Fallback для старых версий
                this.timeScale.fitContent();
            }
            console.log('🔄 TimeScale reset');
            return true;
        } catch (error) {
            console.error('❌ Error resetting time scale:', error);
            return false;
        }
    }

    /**
     * Установить диапазон по последним N дням
     */
    setLastNDays(days) {
        const now = Math.floor(Date.now() / 1000);
        const from = now - (days * 24 * 60 * 60);
        return this.setVisibleRange(from, now);
    }

    /**
     * Установить диапазон по последним N месяцам
     */
    setLastNMonths(months) {
        const now = new Date();
        const from = new Date(now);
        from.setMonth(from.getMonth() - months);
        
        return this.setVisibleRange(
            Math.floor(from.getTime() / 1000),
            Math.floor(now.getTime() / 1000)
        );
    }

    /**
     * Установить диапазон по году
     */
    setYear(year) {
        const from = Math.floor(new Date(year, 0, 1).getTime() / 1000);
        const to = Math.floor(new Date(year + 1, 0, 1).getTime() / 1000) - 1;
        return this.setVisibleRange(from, to);
    }

    // ==========================================
    // СОБЫТИЯ И ПОДПИСКИ
    // ==========================================

    /**
     * Добавить слушатель изменения видимого диапазона
     */
    addVisibleRangeChangeListener(listener) {
        this.visibleRangeChangeListeners.add(listener);
    }

    /**
     * Удалить слушатель изменения видимого диапазона
     */
    removeVisibleRangeChangeListener(listener) {
        this.visibleRangeChangeListeners.delete(listener);
    }

    /**
     * Очистить все слушатели
     */
    clearVisibleRangeChangeListeners() {
        this.visibleRangeChangeListeners.clear();
    }

    // ==========================================
    // УТИЛИТЫ И СТАТИСТИКА
    // ==========================================

    /**
     * Получить информацию о текущем состоянии
     */
    getTimeScaleInfo() {
        const visibleRange = this.getVisibleRange();
        if (!visibleRange) return null;
        
        const timeSpan = visibleRange.to - visibleRange.from;
        const days = Math.round(timeSpan / 86400);
        
        return {
            visibleRange,
            timeSpanSeconds: timeSpan,
            timeSpanDays: days,
            from: new Date(visibleRange.from * 1000),
            to: new Date(visibleRange.to * 1000),
            isInitialized: this.isInitialized
        };
    }

    /**
     * Оптимизация данных для текущего диапазона
     */
    optimizeDataForCurrentRange(data, options = {}) {
        const info = this.getTimeScaleInfo();
        if (!info) return data;
        
        // Фильтруем данные по видимому диапазону с небольшим буфером
        const bufferSeconds = options.bufferSeconds || 86400; // 1 день буфер
        const filteredData = data.filter(item => 
            item.time >= (info.visibleRange.from - bufferSeconds) && 
            item.time <= (info.visibleRange.to + bufferSeconds)
        );
        
        // Применяем автоматическую агрегацию
        return this.autoAggregateDataByVisibleRange(filteredData, options);
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.clearVisibleRangeChangeListeners();
        this.isInitialized = false;
        console.log('🗑️ TimeScale Manager destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeScaleManager;
} else if (typeof window !== 'undefined') {
    window.TimeScaleManager = TimeScaleManager;
} 