/**
 * Animation Effects for Lightweight Charts
 * Анимационные эффекты и стилизация
 */

class AnimationEffects {
    
    constructor(chart, chartContainer) {
        this.chart = chart;
        this.chartContainer = chartContainer;
        this.animations = new Map();
        this.transitions = {
            duration: 300,
            easing: 'ease-in-out',
            enabled: true
        };
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация модуля
     */
    initialize() {
        try {
            this.setupAnimationStyles();
            this.setupTransitions();
            this.isInitialized = true;
            console.log('✅ Animation Effects initialized');
            
        } catch (error) {
            console.error('❌ Animation Effects initialization failed:', error);
        }
    }

    // ==========================================
    // CHART ANIMATIONS
    // ==========================================

    /**
     * Настройка базовых анимационных стилей
     */
    setupAnimationStyles() {
        if (!this.chartContainer) return;
        
        try {
            // Добавляем CSS для анимаций
            const style = document.createElement('style');
            style.textContent = `
                .chart-fade-in {
                    animation: chartFadeIn 0.5s ease-in-out;
                }
                
                .chart-slide-in {
                    animation: chartSlideIn 0.3s ease-out;
                }
                
                .chart-zoom-in {
                    animation: chartZoomIn 0.4s ease-out;
                }
                
                .chart-pulse {
                    animation: chartPulse 2s infinite;
                }
                
                @keyframes chartFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes chartSlideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                
                @keyframes chartZoomIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                
                @keyframes chartPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                .chart-loading-spinner {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(41, 98, 255, 0.3);
                    border-top: 4px solid #2962FF;
                    border-radius: 50%;
                    animation: chartSpin 1s linear infinite;
                    z-index: 1000;
                }
                
                @keyframes chartSpin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                
                .chart-glow {
                    box-shadow: 0 0 20px rgba(41, 98, 255, 0.5);
                    transition: box-shadow 0.3s ease;
                }
                
                .chart-highlight {
                    background: linear-gradient(45deg, 
                        rgba(41, 98, 255, 0.1), 
                        rgba(102, 126, 234, 0.1));
                    transition: background 0.3s ease;
                }
            `;
            
            if (!document.head.querySelector('style[data-chart-animations]')) {
                style.setAttribute('data-chart-animations', 'true');
                document.head.appendChild(style);
            }
            
            console.log('✅ Animation styles added');
            
        } catch (error) {
            console.error('❌ Animation styles setup failed:', error);
        }
    }

    /**
     * Настройка переходов
     */
    setupTransitions() {
        if (!this.chartContainer) return;
        
        try {
            this.chartContainer.style.transition = `all ${this.transitions.duration}ms ${this.transitions.easing}`;
            
        } catch (error) {
            console.error('❌ Transitions setup failed:', error);
        }
    }

    // ==========================================
    // LOADING ANIMATIONS
    // ==========================================

    /**
     * Показать анимацию загрузки
     */
    showLoadingSpinner(message = 'Загрузка...') {
        if (!this.chartContainer) return;
        
        try {
            // Удаляем существующий спиннер
            this.hideLoadingSpinner();
            
            const spinner = document.createElement('div');
            spinner.className = 'chart-loading-spinner';
            spinner.id = 'chart-loading-spinner';
            
            if (message) {
                const text = document.createElement('div');
                text.textContent = message;
                text.style.cssText = `
                    position: absolute;
                    top: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 14px;
                    color: #2962FF;
                    white-space: nowrap;
                `;
                spinner.appendChild(text);
            }
            
            this.chartContainer.appendChild(spinner);
            
        } catch (error) {
            console.error('❌ Loading spinner show failed:', error);
        }
    }

    /**
     * Скрыть анимацию загрузки
     */
    hideLoadingSpinner() {
        try {
            const spinner = document.getElementById('chart-loading-spinner');
            if (spinner) {
                spinner.remove();
            }
            
        } catch (error) {
            console.error('❌ Loading spinner hide failed:', error);
        }
    }

    // ==========================================
    // CHART ENTRANCE ANIMATIONS
    // ==========================================

    /**
     * Анимация появления графика
     */
    animateChartEntrance(type = 'fade') {
        if (!this.chartContainer || !this.transitions.enabled) return;
        
        try {
            // Сначала скрываем
            this.chartContainer.style.opacity = '0';
            
            setTimeout(() => {
                switch (type) {
                    case 'fade':
                        this.chartContainer.classList.add('chart-fade-in');
                        break;
                    case 'slide':
                        this.chartContainer.classList.add('chart-slide-in');
                        break;
                    case 'zoom':
                        this.chartContainer.classList.add('chart-zoom-in');
                        break;
                }
                
                this.chartContainer.style.opacity = '1';
                
                // Удаляем класс после анимации
                setTimeout(() => {
                    this.chartContainer.classList.remove('chart-fade-in', 'chart-slide-in', 'chart-zoom-in');
                }, this.transitions.duration + 100);
                
            }, 50);
            
            console.log(`✅ Chart entrance animation: ${type}`);
            
        } catch (error) {
            console.error('❌ Chart entrance animation failed:', error);
        }
    }

    // ==========================================
    // HIGHLIGHT EFFECTS
    // ==========================================

    /**
     * Подсветка графика
     */
    highlightChart(duration = 2000) {
        if (!this.chartContainer) return;
        
        try {
            this.chartContainer.classList.add('chart-glow');
            
            setTimeout(() => {
                this.chartContainer.classList.remove('chart-glow');
            }, duration);
            
            console.log('✅ Chart highlighted');
            
        } catch (error) {
            console.error('❌ Chart highlight failed:', error);
        }
    }

    /**
     * Пульсирующий эффект
     */
    pulseChart(duration = 3000) {
        if (!this.chartContainer) return;
        
        try {
            this.chartContainer.classList.add('chart-pulse');
            
            setTimeout(() => {
                this.chartContainer.classList.remove('chart-pulse');
            }, duration);
            
            console.log('✅ Chart pulse effect applied');
            
        } catch (error) {
            console.error('❌ Chart pulse failed:', error);
        }
    }

    // ==========================================
    // SMOOTH TRANSITIONS
    // ==========================================

    /**
     * Плавный переход между темами
     */
    transitionTheme(newTheme, callback) {
        if (!this.transitions.enabled) {
            if (callback) callback();
            return;
        }
        
        try {
            // Добавляем переходный эффект
            this.chartContainer.style.transition = `all ${this.transitions.duration}ms ${this.transitions.easing}`;
            
            // Небольшое затемнение
            this.chartContainer.style.opacity = '0.7';
            
            setTimeout(() => {
                if (callback) callback();
                
                // Восстанавливаем прозрачность
                setTimeout(() => {
                    this.chartContainer.style.opacity = '1';
                }, 50);
                
            }, this.transitions.duration / 2);
            
            console.log(`✅ Theme transition to: ${newTheme}`);
            
        } catch (error) {
            console.error('❌ Theme transition failed:', error);
            if (callback) callback();
        }
    }

    /**
     * Плавный переход данных
     */
    transitionData(newDataCallback) {
        if (!this.transitions.enabled) {
            if (newDataCallback) newDataCallback();
            return;
        }
        
        try {
            // Анимация исчезновения
            this.chartContainer.style.transform = 'scale(0.95)';
            this.chartContainer.style.opacity = '0.5';
            
            setTimeout(() => {
                if (newDataCallback) newDataCallback();
                
                // Анимация появления
                setTimeout(() => {
                    this.chartContainer.style.transform = 'scale(1)';
                    this.chartContainer.style.opacity = '1';
                }, 50);
                
            }, this.transitions.duration / 2);
            
            console.log('✅ Data transition completed');
            
        } catch (error) {
            console.error('❌ Data transition failed:', error);
            if (newDataCallback) newDataCallback();
        }
    }

    // ==========================================
    // NOTIFICATION ANIMATIONS
    // ==========================================

    /**
     * Анимированное уведомление
     */
    showNotification(message, type = 'info', duration = 3000) {
        try {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                color: white;
                z-index: 10000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            `;
            
            // Цвета по типу
            const colors = {
                info: '#2962FF',
                success: '#00C851',
                warning: '#FFB74D',
                error: '#FF4444'
            };
            
            notification.style.background = colors[type] || colors.info;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Анимация появления
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 10);
            
            // Автоматическое скрытие
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
            
            console.log(`✅ Notification shown: ${message}`);
            
        } catch (error) {
            console.error('❌ Notification failed:', error);
        }
    }

    // ==========================================
    // PROGRESSIVE ANIMATIONS
    // ==========================================

    /**
     * Прогрессивная анимация загрузки данных
     */
    animateDataProgress(current, total) {
        try {
            const percentage = Math.round((current / total) * 100);
            
            // Создаем или обновляем прогресс-бар
            let progressBar = document.getElementById('chart-progress-bar');
            
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.id = 'chart-progress-bar';
                progressBar.style.cssText = `
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 4px;
                    background: #2962FF;
                    transition: width 0.3s ease;
                    z-index: 1000;
                    width: 0%;
                `;
                
                if (this.chartContainer) {
                    this.chartContainer.appendChild(progressBar);
                }
            }
            
            progressBar.style.width = `${percentage}%`;
            
            // Удаляем когда завершено
            if (percentage >= 100) {
                setTimeout(() => {
                    if (progressBar.parentNode) {
                        progressBar.parentNode.removeChild(progressBar);
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error('❌ Progress animation failed:', error);
        }
    }

    // ==========================================
    // CONFIGURATION
    // ==========================================

    /**
     * Настройка анимаций
     */
    setAnimationConfig(config) {
        this.transitions = { ...this.transitions, ...config };
        
        if (this.chartContainer) {
            this.chartContainer.style.transition = 
                `all ${this.transitions.duration}ms ${this.transitions.easing}`;
        }
        
        console.log('⚙️ Animation config updated:', this.transitions);
    }

    /**
     * Включение/выключение анимаций
     */
    setAnimationsEnabled(enabled) {
        this.transitions.enabled = enabled;
        console.log(`✅ Animations ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            transitions: this.transitions,
            animationsCount: this.animations.size
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        // Останавливаем все анимации
        this.animations.clear();
        
        // Удаляем стили анимаций
        const style = document.head.querySelector('style[data-chart-animations]');
        if (style) {
            style.remove();
        }
        
        // Очищаем уведомления
        document.querySelectorAll('[id^="chart-"]').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        this.isInitialized = false;
        console.log('🗑️ Animation Effects destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationEffects;
} else if (typeof window !== 'undefined') {
    window.AnimationEffects = AnimationEffects;
} 