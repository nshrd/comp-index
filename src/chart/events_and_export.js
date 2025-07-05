/**
 * Events API & Export Features for Lightweight Charts
 * Интеграция событий и экспорта данных
 */

class ChartEventsAndExport {
    
    constructor(chart) {
        this.chart = chart;
        this.eventListeners = new Map();
        this.exportConfig = {
            format: 'png',
            quality: 0.92,
            width: 1920,
            height: 1080
        };
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация событий и экспорта
     */
    initialize() {
        try {
            this.setupChartEvents();
            this.setupExportCapabilities();
            this.isInitialized = true;
            console.log('✅ Chart Events & Export initialized');
            
        } catch (error) {
            console.error('❌ Events & Export initialization failed:', error);
        }
    }

    // ==========================================
    // EVENTS API
    // ==========================================

    /**
     * Настройка базовых событий графика
     */
    setupChartEvents() {
        try {
            // Подписка на движения курсора
            this.chart.subscribeCrosshairMove(this.handleCrosshairMove.bind(this));
            
            // Подписка на клики
            this.chart.subscribeClick(this.handleChartClick.bind(this));
            
            console.log('✅ Basic chart events subscribed');
            
        } catch (error) {
            console.error('❌ Chart events setup failed:', error);
        }
    }

    /**
     * Обработка движения курсора
     */
    handleCrosshairMove(param) {
        if (!param || !param.time) {
            this.clearPriceInfo();
            return;
        }
        
        try {
            // Получаем данные для всех серий в точке курсора
            const seriesData = this.getSeriesDataAtTime(param);
            
            // Обновляем информационную панель
            this.updatePriceInfo(param.time, seriesData);
            
            // Уведомляем подписчиков
            this.notifyEventListeners('crosshairMove', {
                time: param.time,
                seriesData: seriesData,
                point: param.point
            });
            
        } catch (error) {
            console.error('❌ Crosshair move handler error:', error);
        }
    }

    /**
     * Обработка кликов по графику
     */
    handleChartClick(param) {
        if (!param || !param.time) return;
        
        try {
            const seriesData = this.getSeriesDataAtTime(param);
            
            console.log('📊 Chart clicked:', {
                time: new Date(param.time * 1000).toLocaleString(),
                data: seriesData
            });
            
            // Добавляем маркер на место клика (если включено)
            if (this.markClicksEnabled) {
                this.addClickMarker(param.time, seriesData);
            }
            
            // Уведомляем подписчиков
            this.notifyEventListeners('chartClick', {
                time: param.time,
                seriesData: seriesData,
                point: param.point
            });
            
        } catch (error) {
            console.error('❌ Chart click handler error:', error);
        }
    }

    /**
     * Получение данных серий в определенное время
     */
    getSeriesDataAtTime(param) {
        const seriesData = {};
        
        // Собираем данные из всех доступных серий
        if (window.coinbaseLineSeries && param.seriesData) {
            const coinbaseData = param.seriesData.get(window.coinbaseLineSeries);
            if (coinbaseData) {
                seriesData.coinbase = {
                    name: 'Coinbase Index',
                    value: coinbaseData.value,
                    color: '#2962FF'
                };
            }
        }
        
        if (window.comparisonLineSeries && param.seriesData) {
            const comparisonData = param.seriesData.get(window.comparisonLineSeries);
            if (comparisonData) {
                const instrument = CONFIG.INSTRUMENTS[currentComparisonInstrument];
                seriesData.comparison = {
                    name: instrument?.name || 'Comparison',
                    value: comparisonData.value,
                    color: instrument?.color || '#F7931A'
                };
            }
        }
        
        return seriesData;
    }

    /**
     * Обновление информационной панели
     */
    updatePriceInfo(time, seriesData) {
        const infoElement = this.getOrCreateInfoPanel();
        
        const dateStr = new Date(time * 1000).toLocaleString('ru-RU');
        let html = `<div class="chart-info-time">📅 ${dateStr}</div>`;
        
        Object.entries(seriesData).forEach(([key, data]) => {
            const formattedValue = this.formatValue(data.value, key);
            html += `
                <div class="chart-info-series" style="color: ${data.color}">
                    <span class="series-name">${data.name}:</span>
                    <span class="series-value">${formattedValue}</span>
                </div>
            `;
        });
        
        infoElement.innerHTML = html;
        infoElement.style.display = 'block';
    }

    /**
     * Очистка информационной панели
     */
    clearPriceInfo() {
        const infoElement = document.getElementById('chart-price-info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }

    /**
     * Создание или получение информационной панели
     */
    getOrCreateInfoPanel() {
        let infoElement = document.getElementById('chart-price-info');
        
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.id = 'chart-price-info';
            infoElement.className = 'chart-price-info';
            
            // Добавляем стили
            infoElement.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 12px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                display: none;
                min-width: 200px;
            `;
            
            const chartContainer = document.getElementById('chart-container');
            if (chartContainer) {
                chartContainer.style.position = 'relative';
                chartContainer.appendChild(infoElement);
            }
        }
        
        return infoElement;
    }

    /**
     * Форматирование значений
     */
    formatValue(value, seriesType) {
        if (typeof value !== 'number') return 'N/A';
        
        switch (seriesType) {
            case 'coinbase':
                return `#${Math.round(value)}`;
                
            case 'comparison':
                if (currentComparisonInstrument === 'btc') {
                    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                return value.toFixed(4);
                
            default:
                return value.toFixed(2);
        }
    }

    /**
     * Добавление маркера клика
     */
    addClickMarker(time, seriesData) {
        if (!window.advancedFeatures) return;
        
        const series = window.comparisonLineSeries || window.coinbaseLineSeries;
        if (!series) return;
        
        const mainValue = seriesData.comparison?.value || seriesData.coinbase?.value;
        if (!mainValue) return;
        
        window.advancedFeatures.addMarker(series, time, {
            position: 'inBar',
            color: '#FF6B6B',
            shape: 'circle',
            text: '📍',
            size: 1,
            id: `click_${time}`
        });
    }

    /**
     * Подписка на события
     */
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        
        this.eventListeners.get(eventType).add(callback);
        console.log(`✅ Event listener added: ${eventType}`);
    }

    /**
     * Отписка от событий
     */
    removeEventListener(eventType, callback) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Уведомление подписчиков
     */
    notifyEventListeners(eventType, data) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Event listener error (${eventType}):`, error);
                }
            });
        }
    }

    // ==========================================
    // EXPORT FEATURES
    // ==========================================

    /**
     * Настройка возможностей экспорта
     */
    setupExportCapabilities() {
        try {
            // Экспорт доступен через методы chart
            console.log('✅ Export capabilities ready');
            
        } catch (error) {
            console.error('❌ Export setup failed:', error);
        }
    }

    /**
     * Экспорт графика как изображение
     */
    async exportChartAsImage(options = {}) {
        try {
            const config = { ...this.exportConfig, ...options };
            
            // Получаем canvas графика
            const canvas = this.chart.takeScreenshot();
            
            if (!canvas) {
                throw new Error('Failed to get chart canvas');
            }
            
            // Создаем ссылку для скачивания
            const link = document.createElement('a');
            link.download = options.filename || `cbma14_chart_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', config.quality);
            
            // Автоматически скачиваем
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ Chart exported as ${link.download}`);
            return true;
            
        } catch (error) {
            console.error('❌ Chart export failed:', error);
            throw error;
        }
    }

    /**
     * Экспорт данных как CSV
     */
    exportDataAsCSV(options = {}) {
        try {
            const data = this.collectChartData();
            
            if (!data || data.length === 0) {
                throw new Error('No data to export');
            }
            
            const csvContent = this.convertToCSV(data, options);
            
            // Создаем Blob и ссылку для скачивания
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.download = options.filename || `cbma14_data_${new Date().toISOString().split('T')[0]}.csv`;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
            
            console.log(`✅ Data exported as ${link.download}`);
            return true;
            
        } catch (error) {
            console.error('❌ Data export failed:', error);
            throw error;
        }
    }

    /**
     * Экспорт данных как JSON
     */
    exportDataAsJSON(options = {}) {
        try {
            const data = this.collectChartData();
            
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    instrument: currentComparisonInstrument,
                    timeframe: currentTimeframe,
                    period: currentMAPeriod
                },
                data: data
            };
            
            const jsonContent = JSON.stringify(exportData, null, 2);
            
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            link.download = options.filename || `cbma14_data_${new Date().toISOString().split('T')[0]}.json`;
            link.href = URL.createObjectURL(blob);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
            
            console.log(`✅ Data exported as ${link.download}`);
            return true;
            
        } catch (error) {
            console.error('❌ JSON export failed:', error);
            throw error;
        }
    }

    /**
     * Сбор данных графика
     */
    collectChartData() {
        const combinedData = [];
        
        try {
            // Получаем данные из серий
            const coinbaseData = window.coinbaseLineSeries ? window.coinbaseLineSeries.data() : [];
            const comparisonData = window.comparisonLineSeries ? window.comparisonLineSeries.data() : [];
            
            // Создаем объединенный dataset
            const timeMap = new Map();
            
            coinbaseData.forEach(item => {
                timeMap.set(item.time, {
                    time: item.time,
                    date: new Date(item.time * 1000).toISOString(),
                    coinbase_index: item.value
                });
            });
            
            comparisonData.forEach(item => {
                const existing = timeMap.get(item.time) || {
                    time: item.time,
                    date: new Date(item.time * 1000).toISOString()
                };
                
                existing[`${currentComparisonInstrument}_price`] = item.value;
                timeMap.set(item.time, existing);
            });
            
            // Конвертируем в массив и сортируем
            combinedData.push(...Array.from(timeMap.values()).sort((a, b) => a.time - b.time));
            
        } catch (error) {
            console.error('❌ Data collection error:', error);
        }
        
        return combinedData;
    }

    /**
     * Конвертация в CSV формат
     */
    convertToCSV(data, options = {}) {
        if (!data || data.length === 0) return '';
        
        const separator = options.separator || ',';
        const headers = Object.keys(data[0]);
        
        let csv = headers.join(separator) + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                
                // Обрабатываем специальные символы
                if (typeof value === 'string' && (value.includes(separator) || value.includes('\n') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                
                return value !== null && value !== undefined ? value : '';
            });
            
            csv += values.join(separator) + '\n';
        });
        
        return csv;
    }

    /**
     * Сохранение состояния графика
     */
    saveChartState() {
        try {
            const state = {
                timestamp: Date.now(),
                timeScale: window.timeScaleManager ? window.timeScaleManager.getTimeScaleInfo() : null,
                indicators: window.indicatorsManager ? window.indicatorsManager.exportSettings() : {},
                features: window.advancedFeatures ? window.advancedFeatures.getFeatureInfo() : {},
                settings: {
                    instrument: currentComparisonInstrument,
                    timeframe: currentTimeframe,
                    maPeriod: currentMAPeriod,
                    dateRange: {
                        from: fromDate,
                        to: toDate
                    }
                }
            };
            
            const stateJson = JSON.stringify(state, null, 2);
            localStorage.setItem('cbma14_chart_state', stateJson);
            
            console.log('✅ Chart state saved to localStorage');
            return state;
            
        } catch (error) {
            console.error('❌ Chart state save failed:', error);
            throw error;
        }
    }

    /**
     * Загрузка состояния графика
     */
    loadChartState() {
        try {
            const stateJson = localStorage.getItem('cbma14_chart_state');
            if (!stateJson) {
                console.log('ℹ️ No saved chart state found');
                return null;
            }
            
            const state = JSON.parse(stateJson);
            console.log('✅ Chart state loaded from localStorage');
            return state;
            
        } catch (error) {
            console.error('❌ Chart state load failed:', error);
            return null;
        }
    }

    // ==========================================
    // НАСТРОЙКИ И УТИЛИТЫ
    // ==========================================

    /**
     * Включение/выключение маркеров кликов
     */
    setMarkClicksEnabled(enabled) {
        this.markClicksEnabled = enabled;
        console.log(`📍 Click markers ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Настройка конфигурации экспорта
     */
    setExportConfig(config) {
        this.exportConfig = { ...this.exportConfig, ...config };
        console.log('⚙️ Export config updated:', this.exportConfig);
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            eventListeners: Array.from(this.eventListeners.keys()),
            exportConfig: this.exportConfig,
            markClicksEnabled: this.markClicksEnabled
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.eventListeners.clear();
        this.clearPriceInfo();
        this.isInitialized = false;
        console.log('🗑️ Chart Events & Export destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartEventsAndExport;
} else if (typeof window !== 'undefined') {
    window.ChartEventsAndExport = ChartEventsAndExport;
} 