/**
 * Advanced Series Types & Price Scale Features
 * Дополнительные типы серий и продвинутые возможности шкалы цен
 */

class AdvancedSeriesAndScale {
    
    constructor(chart) {
        this.chart = chart;
        this.series = new Map();
        this.priceScales = new Map();
        this.seriesConfig = {
            histogram: {
                priceFormat: {
                    // type: 'volume',
                    type: 'price',
                    precision: 0,
                    minMove: 1
                },
                priceScaleId: 'right' // 'volume'
            },
            area: {
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01
                },
                priceScaleId: 'right'
            },
            baseline: {
                priceFormat: {
                    type: 'price',
                    precision: 4,
                    minMove: 0.0001
                },
                priceScaleId: 'right'
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
            this.setupPriceScales();
            this.isInitialized = true;
            console.log('✅ Advanced Series & Scale initialized');
            
        } catch (error) {
            console.error('❌ Advanced Series & Scale initialization failed:', error);
        }
    }

    // ==========================================
    // PRICE SCALE FEATURES
    // ==========================================

    /**
     * Настройка продвинутых шкал цен
     */
    setupPriceScales() {
        try {
            // Настройка основной шкалы цен
            this.configurePriceScale('right', {
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1
                },
                mode: 0, // Normal mode
                autoScale: true,
                invertScale: false,
                alignLabels: true,
                borderVisible: true,
                borderColor: '#E0E3EB',
                textColor: '#191919',
                entireTextOnly: false,
                ticksVisible: true,
                minimumWidth: 60
            });
            
            // Настройка шкалы для объёмов
            // this.configurePriceScale('volume', {
            //     scaleMargins: {
            //         top: 0.7,
            //         bottom: 0.0
            //     },
            //     mode: 0,
            //     autoScale: true,
            //     invertScale: false,
            //     alignLabels: true,
            //     borderVisible: false,
            //     textColor: '#787B86',
            //     entireTextOnly: false,
            //     ticksVisible: false,
            //     minimumWidth: 0
            // });
            
            console.log('✅ Price scales configured');
            
        } catch (error) {
            console.error('❌ Price scales setup failed:', error);
        }
    }

    /**
     * Настройка конкретной шкалы цен
     */
    configurePriceScale(scaleId, options) {
        try {
            const priceScale = this.chart.priceScale(scaleId);
            if (priceScale) {
                priceScale.applyOptions(options);
                this.priceScales.set(scaleId, { scale: priceScale, options: options });
                console.log(`✅ Price scale '${scaleId}' configured`);
            }
            
        } catch (error) {
            console.error(`❌ Price scale '${scaleId}' configuration failed:`, error);
        }
    }

    /**
     * Переключение режима шкалы цен
     */
    setPriceScaleMode(scaleId, mode) {
        try {
            const modes = {
                'normal': 0,
                'logarithmic': 1,
                'percentage': 2,
                'indexed': 3
            };
            
            const modeValue = typeof mode === 'string' ? modes[mode] : mode;
            
            if (modeValue === undefined) {
                throw new Error(`Invalid mode: ${mode}`);
            }
            
            const priceScale = this.chart.priceScale(scaleId);
            if (priceScale) {
                priceScale.applyOptions({ mode: modeValue });
                console.log(`✅ Price scale '${scaleId}' mode set to: ${mode}`);
            }
            
        } catch (error) {
            console.error(`❌ Price scale mode change failed:`, error);
        }
    }

    /**
     * Настройка автоматического масштабирования
     */
    setAutoScale(scaleId, enabled, disallowCrossing = false) {
        try {
            const priceScale = this.chart.priceScale(scaleId);
            if (priceScale) {
                priceScale.applyOptions({ 
                    autoScale: enabled,
                    ...(disallowCrossing && { disallowCrossing: true })
                });
                console.log(`✅ Auto scale '${scaleId}': ${enabled ? 'enabled' : 'disabled'}`);
            }
            
        } catch (error) {
            console.error(`❌ Auto scale configuration failed:`, error);
        }
    }

    /**
     * Инвертирование шкалы цен
     */
    invertPriceScale(scaleId, inverted) {
        try {
            const priceScale = this.chart.priceScale(scaleId);
            if (priceScale) {
                priceScale.applyOptions({ invertScale: inverted });
                console.log(`✅ Price scale '${scaleId}' ${inverted ? 'inverted' : 'normal'}`);
            }
            
        } catch (error) {
            console.error(`❌ Price scale inversion failed:`, error);
        }
    }

    // ==========================================
    // HISTOGRAM SERIES
    // ==========================================

    /**
     * Добавление серии гистограммы (для объёмов)
     */
    addHistogramSeries(id, options = {}) {
        try {
            const defaultOptions = {
                color: '#26a69a',
                priceFormat: this.seriesConfig.histogram.priceFormat,
                priceScaleId: this.seriesConfig.histogram.priceScaleId,
                priceLineVisible: false,
                lastValueVisible: false,
                baseLineVisible: false,
                ...options
            };
            
            const series = this.chart.addHistogramSeries(defaultOptions);
            this.series.set(id, { series: series, type: 'histogram', options: defaultOptions });
            
            console.log(`✅ Histogram series '${id}' added`);
            return series;
            
        } catch (error) {
            console.error(`❌ Histogram series '${id}' creation failed:`, error);
            throw error;
        }
    }

    /**
     * Настройка данных для гистограммы объёмов
     */
    // setVolumeHistogramData(seriesId, data) {
    //     try {
    //         const seriesInfo = this.series.get(seriesId);
    //         if (!seriesInfo || seriesInfo.type !== 'histogram') {
    //             throw new Error(`Histogram series '${seriesId}' not found`);
    //         }
    //         
    //         // Форматируем данные для гистограммы
    //         const histogramData = data.map(item => ({
    //             time: item.time,
    //             value: item.volume || item.value || 0,
    //             color: this.getVolumeColor(item)
    //         }));
    //         
    //         seriesInfo.series.setData(histogramData);
    //         console.log(`✅ Histogram data set for '${seriesId}': ${histogramData.length} points`);
    //         
    //     } catch (error) {
    //         console.error(`❌ Histogram data setting failed:`, error);
    //     }
    // }

    /**
     * Получение цвета для объёма
     */
    // getVolumeColor(item) {
    //     if (item.close && item.open) {
    //         return item.close >= item.open ? '#26a69a' : '#ef5350';
    //     }
    //     
    //     if (item.color) {
    //         return item.color;
    //     }
    //     
    //     return '#757575';
    // }

    // ==========================================
    // AREA SERIES
    // ==========================================

    /**
     * Добавление серии области
     */
    addAreaSeries(id, options = {}) {
        try {
            const defaultOptions = {
                topColor: 'rgba(41, 98, 255, 0.3)',
                bottomColor: 'rgba(41, 98, 255, 0.1)',
                lineColor: '#2962FF',
                lineWidth: 2,
                priceFormat: this.seriesConfig.area.priceFormat,
                priceScaleId: this.seriesConfig.area.priceScaleId,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 3,
                ...options
            };
            
            const series = this.chart.addAreaSeries(defaultOptions);
            this.series.set(id, { series: series, type: 'area', options: defaultOptions });
            
            console.log(`✅ Area series '${id}' added`);
            return series;
            
        } catch (error) {
            console.error(`❌ Area series '${id}' creation failed:`, error);
            throw error;
        }
    }

    /**
     * Настройка градиента для области
     */
    setAreaGradient(seriesId, topColor, bottomColor, lineColor) {
        try {
            const seriesInfo = this.series.get(seriesId);
            if (!seriesInfo || seriesInfo.type !== 'area') {
                throw new Error(`Area series '${seriesId}' not found`);
            }
            
            seriesInfo.series.applyOptions({
                topColor: topColor,
                bottomColor: bottomColor,
                lineColor: lineColor
            });
            
            console.log(`✅ Area gradient updated for '${seriesId}'`);
            
        } catch (error) {
            console.error(`❌ Area gradient update failed:`, error);
        }
    }

    // ==========================================
    // BASELINE SERIES
    // ==========================================

    /**
     * Добавление базовой линии
     */
    addBaselineSeries(id, options = {}) {
        try {
            const defaultOptions = {
                baseValue: { type: 'price', price: 0 },
                topFillColor1: 'rgba(38, 166, 154, 0.28)',
                topFillColor2: 'rgba(38, 166, 154, 0.05)',
                topLineColor: '#26a69a',
                bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
                bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
                bottomLineColor: '#ef5350',
                lineWidth: 2,
                priceFormat: this.seriesConfig.baseline.priceFormat,
                priceScaleId: this.seriesConfig.baseline.priceScaleId,
                crosshairMarkerVisible: true,
                ...options
            };
            
            const series = this.chart.addBaselineSeries(defaultOptions);
            this.series.set(id, { series: series, type: 'baseline', options: defaultOptions });
            
            console.log(`✅ Baseline series '${id}' added`);
            return series;
            
        } catch (error) {
            console.error(`❌ Baseline series '${id}' creation failed:`, error);
            throw error;
        }
    }

    /**
     * Настройка базового значения
     */
    setBaselineValue(seriesId, baseValue) {
        try {
            const seriesInfo = this.series.get(seriesId);
            if (!seriesInfo || seriesInfo.type !== 'baseline') {
                throw new Error(`Baseline series '${seriesId}' not found`);
            }
            
            const baseValueConfig = typeof baseValue === 'number' 
                ? { type: 'price', price: baseValue }
                : baseValue;
            
            seriesInfo.series.applyOptions({
                baseValue: baseValueConfig
            });
            
            console.log(`✅ Baseline value updated for '${seriesId}': ${JSON.stringify(baseValueConfig)}`);
            
        } catch (error) {
            console.error(`❌ Baseline value update failed:`, error);
        }
    }

    // ==========================================
    // ОБЩИЕ МЕТОДЫ СЕРИЙ
    // ==========================================

    /**
     * Получение серии по ID
     */
    getSeries(id) {
        const seriesInfo = this.series.get(id);
        return seriesInfo ? seriesInfo.series : null;
    }

    /**
     * Получение информации о серии
     */
    getSeriesInfo(id) {
        return this.series.get(id);
    }

    /**
     * Удаление серии
     */
    removeSeries(id) {
        try {
            const seriesInfo = this.series.get(id);
            if (seriesInfo) {
                this.chart.removeSeries(seriesInfo.series);
                this.series.delete(id);
                console.log(`✅ Series '${id}' removed`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Series '${id}' removal failed:`, error);
            return false;
        }
    }

    /**
     * Обновление опций серии
     */
    updateSeriesOptions(id, options) {
        try {
            const seriesInfo = this.series.get(id);
            if (seriesInfo) {
                seriesInfo.series.applyOptions(options);
                seriesInfo.options = { ...seriesInfo.options, ...options };
                console.log(`✅ Series '${id}' options updated`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Series '${id}' options update failed:`, error);
            return false;
        }
    }

    /**
     * Установка данных для серии
     */
    setSeriesData(id, data) {
        try {
            const seriesInfo = this.series.get(id);
            if (seriesInfo) {
                seriesInfo.series.setData(data);
                console.log(`✅ Data set for series '${id}': ${data.length} points`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Data setting for series '${id}' failed:`, error);
            return false;
        }
    }

    /**
     * Обновление данных серии
     */
    updateSeriesData(id, data) {
        try {
            const seriesInfo = this.series.get(id);
            if (seriesInfo) {
                seriesInfo.series.update(data);
                console.log(`✅ Data updated for series '${id}'`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Data update for series '${id}' failed:`, error);
            return false;
        }
    }

    // ==========================================
    // СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ
    // ==========================================

    /**
     * Создание серии объёмов с автоматической настройкой
     */
    // createVolumesSeries(id, volumeData, options = {}) {
    //     try {
    //         const series = this.addHistogramSeries(id, {
    //             ...options,
    //             priceFormat: {
    //                 type: 'volume',
    //                 precision: 0,
    //                 minMove: 1
    //             }
    //         });
    //         
    //         this.setVolumeHistogramData(id, volumeData);
    //         
    //         console.log(`✅ Volume series '${id}' created with ${volumeData.length} data points`);
    //         return series;
    //         
    //     } catch (error) {
    //         console.error(`❌ Volume series '${id}' creation failed:`, error);
    //         throw error;
    //     }
    // }

    /**
     * Создание серии тренда с областью
     */
    createTrendAreaSeries(id, trendData, baseColor = '#2962FF', options = {}) {
        try {
            const series = this.addAreaSeries(id, {
                topColor: `${baseColor}30`,
                bottomColor: `${baseColor}10`,
                lineColor: baseColor,
                ...options
            });
            
            this.setSeriesData(id, trendData);
            
            console.log(`✅ Trend area series '${id}' created`);
            return series;
            
        } catch (error) {
            console.error(`❌ Trend area series '${id}' creation failed:`, error);
            throw error;
        }
    }

    /**
     * Создание серии отклонений от базовой линии
     */
    createDeviationBaselineSeries(id, data, baselineValue, options = {}) {
        try {
            const series = this.addBaselineSeries(id, {
                baseValue: { type: 'price', price: baselineValue },
                ...options
            });
            
            this.setSeriesData(id, data);
            
            console.log(`✅ Deviation baseline series '${id}' created with baseline: ${baselineValue}`);
            return series;
            
        } catch (error) {
            console.error(`❌ Deviation baseline series '${id}' creation failed:`, error);
            throw error;
        }
    }

    // ==========================================
    // УТИЛИТЫ И НАСТРОЙКИ
    // ==========================================

    /**
     * Получение списка всех серий
     */
    getAllSeries() {
        const seriesList = [];
        
        this.series.forEach((info, id) => {
            seriesList.push({
                id: id,
                type: info.type,
                options: info.options
            });
        });
        
        return seriesList;
    }

    /**
     * Получение списка шкал цен
     */
    getAllPriceScales() {
        const scalesList = [];
        
        this.priceScales.forEach((info, id) => {
            scalesList.push({
                id: id,
                options: info.options
            });
        });
        
        return scalesList;
    }

    /**
     * Настройка темы для серий
     */
    applyTheme(theme) {
        try {
            const isDark = theme === 'dark';
            
            // Обновляем цвета шкал цен
            this.priceScales.forEach((info, scaleId) => {
                this.configurePriceScale(scaleId, {
                    ...info.options,
                    textColor: isDark ? '#D1D4DC' : '#191919',
                    borderColor: isDark ? '#2A2E39' : '#E0E3EB'
                });
            });
            
            console.log(`✅ Theme '${theme}' applied to series and scales`);
            
        } catch (error) {
            console.error(`❌ Theme application failed:`, error);
        }
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            seriesCount: this.series.size,
            priceScalesCount: this.priceScales.size,
            seriesTypes: this.getAllSeries().map(s => s.type),
            availableScales: Array.from(this.priceScales.keys())
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        // Удаляем все серии
        this.series.forEach((info, id) => {
            try {
                this.chart.removeSeries(info.series);
            } catch (error) {
                console.error(`❌ Error removing series '${id}':`, error);
            }
        });
        
        this.series.clear();
        this.priceScales.clear();
        this.isInitialized = false;
        
        console.log('🗑️ Advanced Series & Scale destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedSeriesAndScale;
} else if (typeof window !== 'undefined') {
    window.AdvancedSeriesAndScale = AdvancedSeriesAndScale;
} 