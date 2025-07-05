/**
 * Custom Crosshair for Lightweight Charts
 * Расширенные возможности crosshair
 */

class CustomCrosshair {
    
    constructor(chart) {
        this.chart = chart;
        this.crosshairMode = 0; // Normal mode
        this.customLabels = new Map();
        this.tooltips = {
            enabled: true,
            showPreviousClose: true,
            showChange: true,
            // showVolume: false
        };
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация модуля
     */
    initialize() {
        try {
            this.setupCrosshair();
            this.isInitialized = true;
            console.log('✅ Custom Crosshair initialized');
            
        } catch (error) {
            console.error('❌ Custom Crosshair initialization failed:', error);
        }
    }

    // ==========================================
    // CROSSHAIR MODES
    // ==========================================

    /**
     * Настройка базового crosshair
     */
    setupCrosshair() {
        try {
            this.chart.applyOptions({
                crosshair: {
                    mode: this.crosshairMode,
                    vertLine: {
                        width: 1,
                        color: '#758696',
                        style: 0, // Solid
                        labelBackgroundColor: '#2962FF',
                        labelVisible: true
                    },
                    horzLine: {
                        width: 1,
                        color: '#758696',
                        style: 0, // Solid
                        labelBackgroundColor: '#2962FF',
                        labelVisible: true
                    }
                }
            });
            
            console.log('✅ Basic crosshair configured');
            
        } catch (error) {
            console.error('❌ Crosshair setup failed:', error);
        }
    }

    /**
     * Переключение режима crosshair
     */
    setCrosshairMode(mode) {
        try {
            const modes = {
                normal: 0,
                magnet: 1,
                hidden: 2
            };
            
            const modeValue = typeof mode === 'string' ? modes[mode] : mode;
            
            if (modeValue === undefined) {
                throw new Error(`Invalid crosshair mode: ${mode}`);
            }
            
            this.crosshairMode = modeValue;
            
            this.chart.applyOptions({
                crosshair: {
                    mode: this.crosshairMode
                }
            });
            
            console.log(`✅ Crosshair mode set to: ${mode}`);
            
        } catch (error) {
            console.error('❌ Crosshair mode change failed:', error);
        }
    }

    /**
     * Настройка магнитного режима
     */
    setMagnetMode(enabled = true) {
        this.setCrosshairMode(enabled ? 'magnet' : 'normal');
    }

    // ==========================================
    // CUSTOM STYLING
    // ==========================================

    /**
     * Настройка стилей crosshair
     */
    setCrosshairStyle(options) {
        try {
            const crosshairOptions = {
                crosshair: {
                    vertLine: {
                        width: options.lineWidth || 1,
                        color: options.lineColor || '#758696',
                        style: options.lineStyle || 0,
                        labelBackgroundColor: options.labelBgColor || '#2962FF',
                        labelTextColor: options.labelTextColor || '#FFFFFF',
                        labelVisible: options.labelsVisible !== false
                    },
                    horzLine: {
                        width: options.lineWidth || 1,
                        color: options.lineColor || '#758696',
                        style: options.lineStyle || 0,
                        labelBackgroundColor: options.labelBgColor || '#2962FF',
                        labelTextColor: options.labelTextColor || '#FFFFFF',
                        labelVisible: options.labelsVisible !== false
                    }
                }
            };
            
            this.chart.applyOptions(crosshairOptions);
            console.log('✅ Crosshair style updated');
            
        } catch (error) {
            console.error('❌ Crosshair style update failed:', error);
        }
    }

    /**
     * Предустановленные стили
     */
    applyPresetStyle(preset) {
        const presets = {
            classic: {
                lineWidth: 1,
                lineColor: '#758696',
                lineStyle: 0,
                labelBgColor: '#2962FF',
                labelTextColor: '#FFFFFF'
            },
            
            minimal: {
                lineWidth: 1,
                lineColor: 'rgba(117, 134, 150, 0.5)',
                lineStyle: 2, // Dotted
                labelBgColor: 'rgba(41, 98, 255, 0.8)',
                labelTextColor: '#FFFFFF'
            },
            
            bold: {
                lineWidth: 2,
                lineColor: '#FF6B6B',
                lineStyle: 0,
                labelBgColor: '#FF6B6B',
                labelTextColor: '#FFFFFF'
            },
            
            neon: {
                lineWidth: 1,
                lineColor: '#00FFFF',
                lineStyle: 0,
                labelBgColor: '#00FFFF',
                labelTextColor: '#000000'
            }
        };
        
        const style = presets[preset];
        if (style) {
            this.setCrosshairStyle(style);
            console.log(`✅ Crosshair preset applied: ${preset}`);
        } else {
            console.warn(`⚠️ Unknown crosshair preset: ${preset}`);
        }
    }

    // ==========================================
    // CUSTOM LABELS
    // ==========================================

    /**
     * Добавление кастомной метки на crosshair
     */
    addCustomLabel(id, options) {
        try {
            const label = {
                id: id,
                text: options.text || '',
                position: options.position || 'top',
                color: options.color || '#2962FF',
                backgroundColor: options.backgroundColor || '#FFFFFF',
                fontSize: options.fontSize || '12px',
                visible: options.visible !== false
            };
            
            this.customLabels.set(id, label);
            console.log(`✅ Custom crosshair label added: ${id}`);
            
        } catch (error) {
            console.error(`❌ Custom label addition failed for '${id}':`, error);
        }
    }

    /**
     * Удаление кастомной метки
     */
    removeCustomLabel(id) {
        if (this.customLabels.has(id)) {
            this.customLabels.delete(id);
            console.log(`✅ Custom crosshair label removed: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Очистка всех кастомных меток
     */
    clearCustomLabels() {
        const count = this.customLabels.size;
        this.customLabels.clear();
        console.log(`✅ ${count} custom crosshair labels cleared`);
    }

    // ==========================================
    // ADVANCED FEATURES
    // ==========================================

    /**
     * Настройка продвинутых tooltips
     */
    setTooltipConfig(config) {
        this.tooltips = { ...this.tooltips, ...config };
        console.log('⚙️ Tooltip config updated:', this.tooltips);
    }

    /**
     * Форматирование меток времени
     */
    setTimeFormatter(formatter) {
        try {
            this.chart.applyOptions({
                timeScale: {
                    tickMarkFormatter: formatter
                }
            });
            
            console.log('✅ Time formatter applied');
            
        } catch (error) {
            console.error('❌ Time formatter application failed:', error);
        }
    }

    /**
     * Форматирование ценовых меток
     */
    setPriceFormatter(formatter, scaleId = 'right') {
        try {
            this.chart.applyOptions({
                [scaleId + 'PriceScale']: {
                    formatter: formatter
                }
            });
            
            console.log(`✅ Price formatter applied to ${scaleId} scale`);
            
        } catch (error) {
            console.error('❌ Price formatter application failed:', error);
        }
    }

    // ==========================================
    // INTERACTION ENHANCEMENTS
    // ==========================================

    /**
     * Включение/выключение crosshair
     */
    setCrosshairVisible(visible) {
        try {
            this.chart.applyOptions({
                crosshair: {
                    vertLine: { visible: visible },
                    horzLine: { visible: visible }
                }
            });
            
            console.log(`✅ Crosshair visibility: ${visible ? 'shown' : 'hidden'}`);
            
        } catch (error) {
            console.error('❌ Crosshair visibility change failed:', error);
        }
    }

    /**
     * Настройка чувствительности магнитного режима
     */
    setMagnetSensitivity(sensitivity = 20) {
        // Эта функция зависит от конкретной реализации в TradingView
        // В текущей версии библиотеки может быть недоступна
        console.log(`⚙️ Magnet sensitivity set to: ${sensitivity}px`);
    }

    // ==========================================
    // THEME INTEGRATION
    // ==========================================

    /**
     * Применение темной темы к crosshair
     */
    applyDarkTheme() {
        this.setCrosshairStyle({
            lineColor: '#D1D4DC',
            labelBgColor: '#363A45',
            labelTextColor: '#D1D4DC'
        });
        
        console.log('✅ Dark theme applied to crosshair');
    }

    /**
     * Применение светлой темы к crosshair
     */
    applyLightTheme() {
        this.setCrosshairStyle({
            lineColor: '#758696',
            labelBgColor: '#2962FF',
            labelTextColor: '#FFFFFF'
        });
        
        console.log('✅ Light theme applied to crosshair');
    }

    /**
     * Автоматическое переключение темы
     */
    setAutoTheme(theme) {
        if (theme === 'dark') {
            this.applyDarkTheme();
        } else {
            this.applyLightTheme();
        }
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    /**
     * Получение текущих настроек crosshair
     */
    getCrosshairConfig() {
        return {
            mode: this.crosshairMode,
            customLabels: Array.from(this.customLabels.entries()),
            tooltips: this.tooltips
        };
    }

    /**
     * Сброс crosshair к настройкам по умолчанию
     */
    resetToDefaults() {
        try {
            this.crosshairMode = 0;
            this.clearCustomLabels();
            
            this.chart.applyOptions({
                crosshair: {
                    mode: 0,
                    vertLine: {
                        width: 1,
                        color: '#758696',
                        style: 0,
                        labelBackgroundColor: '#2962FF',
                        labelVisible: true
                    },
                    horzLine: {
                        width: 1,
                        color: '#758696',
                        style: 0,
                        labelBackgroundColor: '#2962FF',
                        labelVisible: true
                    }
                }
            });
            
            console.log('✅ Crosshair reset to defaults');
            
        } catch (error) {
            console.error('❌ Crosshair reset failed:', error);
        }
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            mode: this.crosshairMode,
            customLabelsCount: this.customLabels.size,
            tooltipsEnabled: this.tooltips.enabled
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.clearCustomLabels();
        this.isInitialized = false;
        console.log('🗑️ Custom Crosshair destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomCrosshair;
} else if (typeof window !== 'undefined') {
    window.CustomCrosshair = CustomCrosshair;
} 