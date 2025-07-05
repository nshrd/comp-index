/**
 * Advanced Lightweight Charts Features
 * Использование продвинутых возможностей Lightweight Charts API
 */

class AdvancedChartFeatures {
    
    constructor(chart) {
        this.chart = chart;
        this.priceLines = new Map();
        this.markers = new Map();
        this.isInitialized = false;
        this.currentTheme = 'light';
        this.initialize();
    }

    /**
     * Инициализация продвинутых возможностей
     */
    initialize() {
        try {
            this.setupWatermark();
            this.setupCrosshair();
            this.setupPriceFormatting();
            this.setupGrid();
            this.setupLocalization();
            
            this.isInitialized = true;
            console.log('✅ Advanced Chart Features initialized');
            
        } catch (error) {
            console.error('❌ Advanced Chart Features initialization failed:', error);
        }
    }

    // ==========================================
    // WATERMARK API
    // ==========================================

    /**
     * Настройка водяного знака
     */
    setupWatermark() {
        try {
            this.chart.applyOptions({
                watermark: {
                    visible: true,
                    fontSize: 32,
                    text: 'CBMA14 Analytics',
                    color: 'rgba(171, 71, 188, 0.15)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontStyle: 'normal',
                    horzAlign: 'center',
                    vertAlign: 'center'
                }
            });
            
            console.log('✅ Watermark configured');
            
        } catch (error) {
            console.error('❌ Watermark setup failed:', error);
        }
    }

    /**
     * Обновление водяного знака
     */
    updateWatermark(text, options = {}) {
        try {
            this.chart.applyOptions({
                watermark: {
                    visible: true,
                    text: text,
                    fontSize: options.fontSize || 32,
                    color: options.color || 'rgba(171, 71, 188, 0.15)',
                    fontFamily: options.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    horzAlign: options.horzAlign || 'center',
                    vertAlign: options.vertAlign || 'center',
                    ...options
                }
            });
            
            console.log(`✅ Watermark updated: ${text}`);
            
        } catch (error) {
            console.error('❌ Watermark update failed:', error);
        }
    }

    // ==========================================
    // CROSSHAIR API
    // ==========================================

    /**
     * Настройка курсора (crosshair)
     */
    setupCrosshair() {
        try {
            this.chart.applyOptions({
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                    vertLine: {
                        width: 1,
                        color: 'rgba(224, 227, 235, 0.8)',
                        style: LightweightCharts.LineStyle.Dashed,
                        labelVisible: true,
                        labelBackgroundColor: '#2962FF'
                    },
                    horzLine: {
                        width: 1,
                        color: 'rgba(224, 227, 235, 0.8)',
                        style: LightweightCharts.LineStyle.Dashed,
                        labelVisible: true,
                        labelBackgroundColor: '#2962FF'
                    }
                }
            });
            
            console.log('✅ Enhanced crosshair configured');
            
        } catch (error) {
            console.error('❌ Crosshair setup failed:', error);
        }
    }

    /**
     * Подписка на движения курсора
     */
    subscribeToCrosshairMove(callback) {
        try {
            this.chart.subscribeCrosshairMove(callback);
            console.log('✅ Crosshair move subscriber added');
            
        } catch (error) {
            console.error('❌ Crosshair move subscription failed:', error);
        }
    }

    // ==========================================
    // PRICE LINES API
    // ==========================================

    /**
     * Добавление горизонтальной линии цены
     */
    addPriceLine(series, price, options = {}) {
        try {
            const defaultOptions = {
                price: price,
                color: options.color || '#2962FF',
                lineWidth: options.lineWidth || 2,
                lineStyle: options.lineStyle || LightweightCharts.LineStyle.Solid,
                axisLabelVisible: options.axisLabelVisible !== false,
                title: options.title || `Уровень ${price}`
            };
            
            const priceLine = series.createPriceLine(defaultOptions);
            
            const lineId = options.id || `line_${Date.now()}`;
            this.priceLines.set(lineId, {
                priceLine: priceLine,
                series: series,
                options: defaultOptions
            });
            
            console.log(`✅ Price line added: ${price} (${lineId})`);
            return lineId;
            
        } catch (error) {
            console.error('❌ Price line creation failed:', error);
            return null;
        }
    }

    /**
     * Удаление линии цены
     */
    removePriceLine(lineId) {
        try {
            const lineData = this.priceLines.get(lineId);
            if (lineData) {
                lineData.series.removePriceLine(lineData.priceLine);
                this.priceLines.delete(lineId);
                console.log(`✅ Price line removed: ${lineId}`);
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('❌ Price line removal failed:', error);
            return false;
        }
    }

    /**
     * Добавление уровней поддержки и сопротивления
     */
    addSupportResistanceLevels(series, levels) {
        try {
            const supportColor = '#00C851'; // Зеленый для поддержки
            const resistanceColor = '#FF4444'; // Красный для сопротивления
            
            levels.forEach(level => {
                const color = level.type === 'support' ? supportColor : resistanceColor;
                const title = `${level.type === 'support' ? 'Поддержка' : 'Сопротивление'}: ${level.price}`;
                
                this.addPriceLine(series, level.price, {
                    color: color,
                    title: title,
                    id: `${level.type}_${level.price}`,
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Dashed
                });
            });
            
            console.log(`✅ Support/Resistance levels added: ${levels.length}`);
            
        } catch (error) {
            console.error('❌ Support/Resistance levels failed:', error);
        }
    }

    // ==========================================
    // SERIES MARKERS API
    // ==========================================

    /**
     * Добавление маркеров на график
     */
    addMarker(series, time, options = {}) {
        try {
            const marker = {
                time: time,
                position: options.position || 'belowBar',
                color: options.color || '#2962FF',
                shape: options.shape || 'circle',
                text: options.text || '',
                size: options.size || 1
            };
            
            const markerId = options.id || `marker_${Date.now()}`;
            
            // Получаем существующие маркеры серии
            const existingMarkers = series.markers() || [];
            
            // Добавляем новый маркер
            const updatedMarkers = [...existingMarkers, marker];
            series.setMarkers(updatedMarkers);
            
            this.markers.set(markerId, {
                series: series,
                marker: marker
            });
            
            console.log(`✅ Marker added: ${markerId}`);
            return markerId;
            
        } catch (error) {
            console.error('❌ Marker creation failed:', error);
            return null;
        }
    }

    /**
     * Добавление маркеров важных событий
     */
    addEventMarkers(series, events) {
        try {
            const markers = events.map(event => ({
                time: event.time,
                position: event.type === 'bullish' ? 'belowBar' : 'aboveBar',
                color: event.type === 'bullish' ? '#00C851' : '#FF4444',
                shape: event.shape || 'arrowUp',
                text: event.text || event.title || '',
                size: event.importance || 1
            }));
            
            // Получаем существующие маркеры
            const existingMarkers = series.markers() || [];
            
            // Объединяем с новыми маркерами
            const allMarkers = [...existingMarkers, ...markers];
            series.setMarkers(allMarkers);
            
            console.log(`✅ Event markers added: ${events.length}`);
            
        } catch (error) {
            console.error('❌ Event markers failed:', error);
        }
    }

    // ==========================================
    // PRICE FORMATTING API
    // ==========================================

    /**
     * Настройка форматирования цен
     */
    setupPriceFormatting() {
        try {
            // Форматирование правой шкалы (цены)
            this.chart.priceScale('right').applyOptions({
                autoScale: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
                borderVisible: true,
                borderColor: 'rgba(197, 203, 206, 0.8)',
                textColor: '#2d3748',
                entireTextOnly: false,
                visible: true,
                ticksVisible: true,
                // Кастомное форматирование цен
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01,
                }
            });
            
            // Форматирование левой шкалы (индекс)
            this.chart.priceScale('left').applyOptions({
                autoScale: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
                borderVisible: true,
                borderColor: 'rgba(197, 203, 206, 0.8)',
                textColor: '#2d3748',
                invertScale: true, // Инвертируем для рангов
                // Кастомное форматирование для индексов
                priceFormat: {
                    type: 'custom',
                    formatter: (price) => {
                        return `#${Math.round(price)}`;
                    },
                }
            });
            
            console.log('✅ Price formatting configured');
            
        } catch (error) {
            console.error('❌ Price formatting setup failed:', error);
        }
    }

    /**
     * Настройка форматирования для конкретной серии
     */
    setSeriesPriceFormat(series, formatType, options = {}) {
        try {
            let priceFormat;
            
            switch (formatType) {
                case 'currency':
                    priceFormat = {
                        type: 'custom',
                        formatter: (price) => `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        ...options
                    };
                    break;
                    
                case 'percentage':
                    priceFormat = {
                        type: 'custom',
                        formatter: (price) => `${price.toFixed(2)}%`,
                        ...options
                    };
                    break;
                    
                case 'index':
                    priceFormat = {
                        type: 'custom',
                        formatter: (price) => `#${Math.round(price)}`,
                        ...options
                    };
                    break;
                    
                // case 'volume':
                //     priceFormat = {
                //         type: 'custom',
                //         formatter: (price) => {
                //             if (price >= 1e9) return `${(price / 1e9).toFixed(1)}B`;
                //             if (price >= 1e6) return `${(price / 1e6).toFixed(1)}M`;
                //             if (price >= 1e3) return `${(price / 1e3).toFixed(1)}K`;
                //             return price.toFixed(0);
                //         },
                //         ...options
                //     };
                //     break;
                    
                default:
                    priceFormat = {
                        type: 'price',
                        precision: options.precision || 2,
                        minMove: options.minMove || 0.01,
                        ...options
                    };
            }
            
            series.applyOptions({ priceFormat });
            console.log(`✅ Series price format set: ${formatType}`);
            
        } catch (error) {
            console.error('❌ Series price format failed:', error);
        }
    }

    // ==========================================
    // GRID API
    // ==========================================

    /**
     * Настройка сетки
     */
    setupGrid() {
        try {
            this.chart.applyOptions({
                grid: {
                    vertLines: {
                        color: 'rgba(197, 203, 206, 0.3)',
                        style: LightweightCharts.LineStyle.Dotted,
                        visible: true,
                    },
                    horzLines: {
                        color: 'rgba(197, 203, 206, 0.3)',
                        style: LightweightCharts.LineStyle.Dotted,
                        visible: true,
                    },
                }
            });
            
            console.log('✅ Grid configured');
            
        } catch (error) {
            console.error('❌ Grid setup failed:', error);
        }
    }

    /**
     * Переключение видимости сетки
     */
    toggleGrid(visible = null) {
        try {
            const currentVisible = visible !== null ? visible : !this.gridVisible;
            
            this.chart.applyOptions({
                grid: {
                    vertLines: { visible: currentVisible },
                    horzLines: { visible: currentVisible },
                }
            });
            
            this.gridVisible = currentVisible;
            console.log(`✅ Grid ${currentVisible ? 'shown' : 'hidden'}`);
            
        } catch (error) {
            console.error('❌ Grid toggle failed:', error);
        }
    }

    // ==========================================
    // LOCALIZATION API
    // ==========================================

    /**
     * Настройка локализации
     */
    setupLocalization() {
        try {
            this.chart.applyOptions({
                localization: {
                    locale: 'ru-RU',
                    priceFormatter: (price) => {
                        return price.toLocaleString('ru-RU', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }).replace('US$', '$');
                    },
                    timeFormatter: (time) => {
                        return new Date(time * 1000).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });
                    },
                }
            });
            
            console.log('✅ Russian localization configured');
            
        } catch (error) {
            console.error('❌ Localization setup failed:', error);
        }
    }

    // ==========================================
    // THEME MANAGEMENT
    // ==========================================

    /**
     * Переключение темы
     */
    setTheme(theme) {
        try {
            const themes = {
                light: {
                    layout: {
                        background: { 
                            type: 'gradient',
                            topColor: '#f8fafc',
                            bottomColor: '#ffffff'
                        },
                        textColor: '#1a202c',
                    },
                    grid: {
                        vertLines: { color: 'rgba(197, 203, 206, 0.3)' },
                        horzLines: { color: 'rgba(197, 203, 206, 0.3)' },
                    },
                    crosshair: {
                        vertLine: { labelBackgroundColor: '#2962FF' },
                        horzLine: { labelBackgroundColor: '#2962FF' },
                    }
                },
                dark: {
                    layout: {
                        background: { 
                            type: 'gradient',
                            topColor: '#1a202c',
                            bottomColor: '#2d3748'
                        },
                        textColor: '#e2e8f0',
                    },
                    grid: {
                        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    },
                    crosshair: {
                        vertLine: { labelBackgroundColor: '#4299e1' },
                        horzLine: { labelBackgroundColor: '#4299e1' },
                    }
                }
            };
            
            if (themes[theme]) {
                this.chart.applyOptions(themes[theme]);
                this.currentTheme = theme;
                console.log(`✅ Theme changed to: ${theme}`);
                
                // Обновляем водяной знак для темы
                this.updateWatermark('CBMA14 Analytics', {
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(171, 71, 188, 0.15)'
                });
            }
            
        } catch (error) {
            console.error('❌ Theme change failed:', error);
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Получение информации о продвинутых функциях
     */
    getFeatureInfo() {
        return {
            isInitialized: this.isInitialized,
            currentTheme: this.currentTheme,
            priceLines: Array.from(this.priceLines.keys()),
            markers: Array.from(this.markers.keys()),
            features: {
                watermark: true,
                crosshair: true,
                priceLines: true,
                markers: true,
                priceFormatting: true,
                grid: true,
                localization: true,
                themes: true
            }
        };
    }

    /**
     * Очистка всех расширений
     */
    clearAll() {
        try {
            // Удаляем все линии цен
            this.priceLines.forEach((lineData, lineId) => {
                this.removePriceLine(lineId);
            });
            
            // Очищаем маркеры (нужно для каждой серии отдельно)
            this.markers.forEach((markerData) => {
                try {
                    markerData.series.setMarkers([]);
                } catch (error) {
                    console.warn('⚠️ Error clearing markers:', error);
                }
            });
            this.markers.clear();
            
            console.log('✅ All advanced features cleared');
            
        } catch (error) {
            console.error('❌ Clear all failed:', error);
        }
    }

    /**
     * Уничтожение объекта
     */
    destroy() {
        this.clearAll();
        this.isInitialized = false;
        console.log('🗑️ Advanced Chart Features destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedChartFeatures;
} else if (typeof window !== 'undefined') {
    window.AdvancedChartFeatures = AdvancedChartFeatures;
} 