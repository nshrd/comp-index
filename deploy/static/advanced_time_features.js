/**
 * Advanced Time Features for Lightweight Charts
 * Расширенные возможности работы со временем
 */

class AdvancedTimeFeatures {
    
    constructor(chart) {
        this.chart = chart;
        this.customTickMarks = [];
        this.businessHours = null;
        this.timeZone = 'UTC';
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация модуля
     */
    initialize() {
        try {
            this.setupTimeScale();
            this.isInitialized = true;
            console.log('✅ Advanced Time Features initialized');
            
        } catch (error) {
            console.error('❌ Advanced Time Features initialization failed:', error);
        }
    }

    /**
     * Базовая настройка временной шкалы
     */
    setupTimeScale() {
        try {
            // Применяем базовые настройки временной шкалы
            this.chart.timeScale().applyOptions({
                timeVisible: true,
                secondsVisible: false
            });
            
            console.log('✅ Time scale setup completed');
            
        } catch (error) {
            console.error('❌ Time scale setup failed:', error);
        }
    }

    // ==========================================
    // CUSTOM TICK MARKS
    // ==========================================

    /**
     * Установка кастомных меток времени
     */
    setCustomTickMarks(tickMarks) {
        try {
            this.customTickMarks = tickMarks;
            
            const timeScale = this.chart.timeScale();
            if (timeScale.setCustomTickMarks) {
                timeScale.setCustomTickMarks(tickMarks);
                console.log(`✅ Custom tick marks set: ${tickMarks.length} marks`);
            }
            
        } catch (error) {
            console.error('❌ Custom tick marks setting failed:', error);
        }
    }

    /**
     * Добавление важного события
     */
    addEventMark(time, label, color = '#FF6B6B') {
        const eventMark = {
            time: time,
            label: label,
            color: color
        };
        
        this.customTickMarks.push(eventMark);
        this.setCustomTickMarks(this.customTickMarks);
        
        console.log(`✅ Event mark added: ${label} at ${new Date(time * 1000).toLocaleString()}`);
    }

    /**
     * Очистка кастомных меток
     */
    clearCustomTickMarks() {
        this.customTickMarks = [];
        this.setCustomTickMarks([]);
        console.log('✅ Custom tick marks cleared');
    }

    // ==========================================
    // BUSINESS HOURS
    // ==========================================

    /**
     * Настройка торговых часов
     */
    setBusinessHours(config) {
        try {
            this.businessHours = {
                from: config.from || '09:30',
                to: config.to || '16:00',
                timezone: config.timezone || 'America/New_York',
                excludeWeekends: config.excludeWeekends !== false,
                excludeHolidays: config.excludeHolidays || []
            };
            
            console.log('✅ Business hours configured:', this.businessHours);
            
        } catch (error) {
            console.error('❌ Business hours configuration failed:', error);
        }
    }

    /**
     * Проверка торгового времени
     */
    isBusinessTime(timestamp) {
        if (!this.businessHours) return true;
        
        const date = new Date(timestamp * 1000);
        const dayOfWeek = date.getDay();
        
        // Проверка выходных
        if (this.businessHours.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return false;
        }
        
        // Проверка времени (упрощенная версия)
        const timeString = date.toTimeString().slice(0, 5);
        return timeString >= this.businessHours.from && timeString <= this.businessHours.to;
    }

    // ==========================================
    // TIME FORMATTING
    // ==========================================

    /**
     * Настройка продвинутого форматирования времени
     */
    setupAdvancedTimeFormatting() {
        try {
            const timeScale = this.chart.timeScale();
            
            timeScale.applyOptions({
                tickMarkFormatter: (time, tickMarkType, locale) => {
                    return this.formatTimeAdvanced(time, tickMarkType, locale);
                }
            });
            
            console.log('✅ Advanced time formatting applied');
            
        } catch (error) {
            console.error('❌ Advanced time formatting failed:', error);
        }
    }

    /**
     * Продвинутое форматирование времени
     */
    formatTimeAdvanced(time, tickMarkType, locale = 'ru-RU') {
        const date = new Date(time * 1000);
        
        switch (tickMarkType) {
            case 0: // Year
                return date.getFullYear().toString();
                
            case 1: // Month
                return date.toLocaleDateString(locale, { 
                    month: 'short',
                    year: 'numeric'
                });
                
            case 2: // DayOfMonth
                return date.toLocaleDateString(locale, { 
                    day: 'numeric',
                    month: 'short'
                });
                
            case 3: // Time
                return date.toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
            case 4: // TimeWithSeconds
                return date.toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
            default:
                return date.toLocaleDateString(locale);
        }
    }

    // ==========================================
    // TIMEZONE SUPPORT
    // ==========================================

    /**
     * Установка часового пояса
     */
    setTimeZone(timezone) {
        try {
            this.timeZone = timezone;
            console.log(`✅ Timezone set to: ${timezone}`);
            
            // Переформатируем существующие метки
            this.setupAdvancedTimeFormatting();
            
        } catch (error) {
            console.error('❌ Timezone setting failed:', error);
        }
    }

    /**
     * Конвертация времени в нужный часовой пояс
     */
    convertToTimeZone(timestamp, targetTimezone = null) {
        const timezone = targetTimezone || this.timeZone;
        
        try {
            const date = new Date(timestamp * 1000);
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(date);
            
        } catch (error) {
            console.error('❌ Timezone conversion failed:', error);
            return new Date(timestamp * 1000).toISOString();
        }
    }

    // ==========================================
    // TIME NAVIGATION
    // ==========================================

    /**
     * Переход к конкретному времени
     */
    goToTime(timestamp, animated = true) {
        try {
            const timeScale = this.chart.timeScale();
            
            if (animated) {
                // Плавное перемещение
                timeScale.scrollToPosition(0, true);
                setTimeout(() => {
                    timeScale.setVisibleLogicalRange({
                        from: timestamp - 3600,
                        to: timestamp + 3600
                    });
                }, 100);
            } else {
                timeScale.setVisibleLogicalRange({
                    from: timestamp - 3600,
                    to: timestamp + 3600
                });
            }
            
            console.log(`✅ Navigated to time: ${new Date(timestamp * 1000).toLocaleString()}`);
            
        } catch (error) {
            console.error('❌ Time navigation failed:', error);
        }
    }

    /**
     * Переход к текущему времени
     */
    goToNow() {
        const nowTimestamp = Math.floor(Date.now() / 1000);
        this.goToTime(nowTimestamp);
    }

    // ==========================================
    // TIME UTILITIES
    // ==========================================

    /**
     * Получение информации о времени
     */
    getTimeInfo() {
        const timeScale = this.chart.timeScale();
        const visibleRange = timeScale.getVisibleRange();
        
        return {
            visibleRange: visibleRange,
            businessHours: this.businessHours,
            timeZone: this.timeZone,
            customTickMarks: this.customTickMarks.length,
            currentTime: Math.floor(Date.now() / 1000)
        };
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            timeZone: this.timeZone,
            businessHoursEnabled: !!this.businessHours,
            customTickMarksCount: this.customTickMarks.length
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.clearCustomTickMarks();
        this.businessHours = null;
        this.isInitialized = false;
        console.log('🗑️ Advanced Time Features destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedTimeFeatures;
} else if (typeof window !== 'undefined') {
    window.AdvancedTimeFeatures = AdvancedTimeFeatures;
} 