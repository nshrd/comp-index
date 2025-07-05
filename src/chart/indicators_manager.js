/**
 * Indicators Manager for CBMA14 Project
 * Управление множественными техническими индикаторами на Lightweight Charts
 */

class IndicatorsManager {
    
    constructor(chart) {
        this.chart = chart;
        this.indicators = new Map();
        this.data = [];
        this.activeIndicators = new Set();
    }

    /**
     * Установка данных для индикаторов
     */
    setData(data) {
        this.data = data;
        this.updateAllIndicators();
    }

    /**
     * Добавление нового индикатора
     */
    addIndicator(name, type, params = {}, options = {}) {
        try {
            // Удаляем существующий индикатор с тем же именем
            this.removeIndicator(name);

            // Создаем серию для индикатора
            const series = this._createIndicatorSeries(type, options);
            
            // Вычисляем данные индикатора
            const indicatorData = TechnicalIndicators.applyIndicator(type, this.data, params);
            
            // Сохраняем информацию об индикаторе
            this.indicators.set(name, {
                type,
                params,
                series,
                options,
                data: indicatorData
            });
            
            // Добавляем данные на график
            this._setIndicatorData(series, indicatorData, type);
            
            this.activeIndicators.add(name);
            
            console.log(`✅ Индикатор ${name} (${type}) добавлен успешно`);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка добавления индикатора ${name}:`, error);
            return false;
        }
    }

    /**
     * Удаление индикатора
     */
    removeIndicator(name) {
        if (this.indicators.has(name)) {
            const indicator = this.indicators.get(name);
            this.chart.removeSeries(indicator.series);
            this.indicators.delete(name);
            this.activeIndicators.delete(name);
            console.log(`🗑️ Индикатор ${name} удален`);
            return true;
        }
        return false;
    }

    /**
     * Создание серии для индикатора
     */
    _createIndicatorSeries(type, options = {}) {
        const defaultOptions = this._getDefaultOptions(type);
        const mergedOptions = { ...defaultOptions, ...options };
        
        switch (type.toLowerCase()) {
            case 'sma':
            case 'ema':
                return this.chart.addLineSeries(mergedOptions);
                
            case 'bollinger':
            case 'bb':
                // Для Bollinger Bands создаем 3 линии
                return {
                    upper: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(255, 0, 0, 0.7)',
                        title: 'BB Upper'
                    }),
                    middle: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(0, 0, 255, 0.7)',
                        title: 'BB Middle'
                    }),
                    lower: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(255, 0, 0, 0.7)',
                        title: 'BB Lower'
                    })
                };
                
            case 'macd':
                // Для MACD создаем гистограмму и линии
                return {
                    macd: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(0, 150, 255, 1)',
                        title: 'MACD'
                    }),
                    signal: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(255, 150, 0, 1)',
                        title: 'Signal'
                    }),
                    histogram: this.chart.addHistogramSeries({
                        color: 'rgba(100, 100, 100, 0.8)',
                        title: 'MACD Histogram'
                    })
                };
                
            case 'rsi':
            case 'stochastic':
            case 'stoch':
                return this.chart.addLineSeries(mergedOptions);
                
            case 'cbma14':
                return {
                    main: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(255, 215, 0, 1)',
                        lineWidth: 2,
                        title: 'CBMA14'
                    }),
                    signal: this.chart.addLineSeries({
                        ...mergedOptions,
                        color: 'rgba(255, 100, 100, 1)',
                        title: 'CBMA14 Signal'
                    })
                };
                
            default:
                return this.chart.addLineSeries(mergedOptions);
        }
    }

    /**
     * Установка данных для индикатора
     */
    _setIndicatorData(series, data, type) {
        switch (type.toLowerCase()) {
            case 'bollinger':
            case 'bb':
                if (data.upper) series.upper.setData(data.upper);
                if (data.middle) series.middle.setData(data.middle);
                if (data.lower) series.lower.setData(data.lower);
                break;
                
            case 'macd':
                if (data.macd) series.macd.setData(data.macd);
                if (data.signal) series.signal.setData(data.signal);
                if (data.histogram) series.histogram.setData(data.histogram);
                break;
                
            case 'stochastic':
            case 'stoch':
                if (data.k) series.setData(data.k);
                break;
                
            case 'cbma14':
                if (data.main) series.main.setData(data.main);
                if (data.signal) series.signal.setData(data.signal);
                break;
                
            default:
                if (Array.isArray(data)) {
                    series.setData(data);
                }
        }
    }

    /**
     * Получение стандартных опций для типа индикатора
     */
    _getDefaultOptions(type) {
        const baseOptions = {
            lineWidth: 1,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
        };
        
        switch (type.toLowerCase()) {
            case 'sma':
                return {
                    ...baseOptions,
                    color: 'rgba(0, 150, 255, 1)',
                    title: 'SMA'
                };
                
            case 'ema':
                return {
                    ...baseOptions,
                    color: 'rgba(255, 150, 0, 1)',
                    title: 'EMA'
                };
                
            case 'rsi':
                return {
                    ...baseOptions,
                    color: 'rgba(128, 0, 128, 1)',
                    title: 'RSI'
                };
                
            case 'bollinger':
            case 'bb':
                return {
                    ...baseOptions,
                    lineWidth: 1
                };
                
            case 'macd':
                return {
                    ...baseOptions,
                    lineWidth: 1
                };
                
            case 'stochastic':
            case 'stoch':
                return {
                    ...baseOptions,
                    color: 'rgba(0, 128, 0, 1)',
                    title: 'Stochastic'
                };
                
            case 'cbma14':
                return {
                    ...baseOptions,
                    lineWidth: 2
                };
                
            default:
                return baseOptions;
        }
    }

    /**
     * Обновление всех активных индикаторов
     */
    updateAllIndicators() {
        for (const [name, indicator] of this.indicators) {
            try {
                const newData = TechnicalIndicators.applyIndicator(
                    indicator.type, 
                    this.data, 
                    indicator.params
                );
                
                indicator.data = newData;
                this._setIndicatorData(indicator.series, newData, indicator.type);
                
            } catch (error) {
                console.error(`❌ Ошибка обновления индикатора ${name}:`, error);
            }
        }
    }

    /**
     * Переключение видимости индикатора
     */
    toggleIndicator(name) {
        if (this.activeIndicators.has(name)) {
            this.hideIndicator(name);
        } else {
            this.showIndicator(name);
        }
    }

    /**
     * Скрытие индикатора
     */
    hideIndicator(name) {
        if (this.indicators.has(name)) {
            const indicator = this.indicators.get(name);
            this._setSeriesVisible(indicator.series, false);
            this.activeIndicators.delete(name);
        }
    }

    /**
     * Показ индикатора
     */
    showIndicator(name) {
        if (this.indicators.has(name)) {
            const indicator = this.indicators.get(name);
            this._setSeriesVisible(indicator.series, true);
            this.activeIndicators.add(name);
        }
    }

    /**
     * Установка видимости серии
     */
    _setSeriesVisible(series, visible) {
        const visibility = visible ? 0 : 1; // 0 = visible, 1 = hidden в Lightweight Charts
        
        if (series.upper && series.middle && series.lower) {
            // Bollinger Bands
            series.upper.priceScale().setMode(visibility);
            series.middle.priceScale().setMode(visibility);
            series.lower.priceScale().setMode(visibility);
        } else if (series.macd && series.signal && series.histogram) {
            // MACD
            series.macd.priceScale().setMode(visibility);
            series.signal.priceScale().setMode(visibility);
            series.histogram.priceScale().setMode(visibility);
        } else if (series.main && series.signal) {
            // CBMA14
            series.main.priceScale().setMode(visibility);
            series.signal.priceScale().setMode(visibility);
        } else {
            // Простая серия
            series.priceScale().setMode(visibility);
        }
    }

    /**
     * Получение списка активных индикаторов
     */
    getActiveIndicators() {
        return Array.from(this.activeIndicators);
    }

    /**
     * Получение всех доступных индикаторов
     */
    getAllIndicators() {
        return Array.from(this.indicators.keys());
    }

    /**
     * Очистка всех индикаторов
     */
    clearAll() {
        for (const name of this.indicators.keys()) {
            this.removeIndicator(name);
        }
    }

    /**
     * Экспорт настроек индикаторов
     */
    exportSettings() {
        const settings = {};
        for (const [name, indicator] of this.indicators) {
            settings[name] = {
                type: indicator.type,
                params: indicator.params,
                options: indicator.options,
                active: this.activeIndicators.has(name)
            };
        }
        return settings;
    }

    /**
     * Импорт настроек индикаторов
     */
    importSettings(settings) {
        this.clearAll();
        
        for (const [name, config] of Object.entries(settings)) {
            this.addIndicator(name, config.type, config.params, config.options);
            
            if (!config.active) {
                this.hideIndicator(name);
            }
        }
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndicatorsManager;
} else if (typeof window !== 'undefined') {
    window.IndicatorsManager = IndicatorsManager;
} 