/**
 * Mobile & Responsive Features for Lightweight Charts
 * Мобильная оптимизация и адаптивный дизайн
 */

class MobileResponsiveChart {
    
    constructor(chart, chartContainer) {
        this.chart = chart;
        this.chartContainer = chartContainer;
        
        // Инициализируем конфигурацию ПЕРЕД вызовом детекции устройств
        this.screenBreakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1280
        };
        this.touchConfig = {
            enabled: true,
            pinchZoom: true,
            doubleTapZoom: true,
            longPressDelay: 500
        };
        this.fullscreenConfig = {
            enabled: true,
            exitOnEscape: true,
            showControls: true
        };
        
        // Теперь безопасно вызываем детекцию устройств
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        
        this.isFullscreen = false;
        this.resizeObserver = null;
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация мобильных возможностей
     */
    initialize() {
        try {
            this.setupResponsiveLayout();
            this.setupTouchGestures();
            this.setupResizeObserver();
            this.applyMobileOptimizations();
            this.isInitialized = true;
            
            console.log('✅ Mobile & Responsive features initialized', {
                isMobile: this.isMobile,
                isTablet: this.isTablet,
                screenWidth: window.innerWidth
            });
            
        } catch (error) {
            console.error('❌ Mobile & Responsive initialization failed:', error);
        }
    }

    // ==========================================
    // DEVICE DETECTION
    // ==========================================

    /**
     * Определение мобильного устройства
     */
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Проверка по User Agent
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        // Проверка по размеру экрана
        const mobileScreen = window.innerWidth <= this.screenBreakpoints.mobile;
        
        // Проверка поддержки touch
        const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        
        return mobileUA || (mobileScreen && hasTouch);
    }

    /**
     * Определение планшета
     */
    detectTablet() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Проверка по User Agent
        const tabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent);
        
        // Проверка по размеру экрана
        const tabletScreen = window.innerWidth > this.screenBreakpoints.mobile && 
                            window.innerWidth <= this.screenBreakpoints.tablet;
        
        return tabletUA || tabletScreen;
    }

    /**
     * Получение текущего типа устройства
     */
    getDeviceType() {
        if (this.isMobile) return 'mobile';
        if (this.isTablet) return 'tablet';
        return 'desktop';
    }

    // ==========================================
    // RESPONSIVE LAYOUT
    // ==========================================

    /**
     * Настройка адаптивного макета
     */
    setupResponsiveLayout() {
        try {
            const deviceType = this.getDeviceType();
            
            // Применяем стили для контейнера
            this.applyContainerStyles(deviceType);
            
            // Настраиваем размеры графика
            this.adjustChartSize();
            
            // Настраиваем интерфейс
            this.adjustInterfaceForDevice(deviceType);
            
            console.log(`✅ Responsive layout applied for: ${deviceType}`);
            
        } catch (error) {
            console.error('❌ Responsive layout setup failed:', error);
        }
    }

    /**
     * Применение стилей для контейнера
     */
    applyContainerStyles(deviceType) {
        if (!this.chartContainer) return;
        
        const styles = {
            mobile: {
                width: '100%',
                height: '300px',
                minHeight: '250px',
                maxHeight: '400px',
                margin: '0',
                padding: '0',
                overflow: 'hidden'
            },
            tablet: {
                width: '100%',
                height: '400px',
                minHeight: '350px',
                maxHeight: '500px',
                margin: '0',
                padding: '0',
                overflow: 'hidden'
            },
            desktop: {
                width: '100%',
                height: '500px',
                minHeight: '400px',
                maxHeight: 'none',
                margin: '0',
                padding: '0',
                overflow: 'hidden'
            }
        };
        
        const deviceStyles = styles[deviceType] || styles.desktop;
        
        Object.assign(this.chartContainer.style, deviceStyles);
    }

    /**
     * Настройка размеров графика
     */
    adjustChartSize() {
        if (!this.chartContainer) return;
        
        const rect = this.chartContainer.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
            this.chart.applyOptions({
                width: rect.width,
                height: rect.height
            });
        }
    }

    /**
     * Настройка интерфейса для устройства
     */
    adjustInterfaceForDevice(deviceType) {
        const adjustments = {
            mobile: {
                rightPriceScale: {
                    minimumWidth: 40,
                    borderVisible: false
                },
                leftPriceScale: {
                    visible: false
                },
                timeScale: {
                    borderVisible: false,
                    ticksVisible: false
                },
                crosshair: {
                    mode: 1, // Magnet mode
                    vertLine: {
                        width: 1,
                        color: '#C3BCDB44',
                        style: 0
                    },
                    horzLine: {
                        width: 1,
                        color: '#C3BCDB44',
                        style: 0
                    }
                }
            },
            tablet: {
                rightPriceScale: {
                    minimumWidth: 50,
                    borderVisible: true
                },
                leftPriceScale: {
                    visible: false
                },
                timeScale: {
                    borderVisible: true,
                    ticksVisible: true
                },
                crosshair: {
                    mode: 0 // Normal mode
                }
            },
            desktop: {
                rightPriceScale: {
                    minimumWidth: 60,
                    borderVisible: true
                },
                leftPriceScale: {
                    visible: false
                },
                timeScale: {
                    borderVisible: true,
                    ticksVisible: true
                },
                crosshair: {
                    mode: 0 // Normal mode
                }
            }
        };
        
        const deviceAdjustments = adjustments[deviceType] || adjustments.desktop;
        this.chart.applyOptions(deviceAdjustments);
    }

    // ==========================================
    // TOUCH GESTURES
    // ==========================================

    /**
     * Настройка touch-жестов
     */
    setupTouchGestures() {
        if (!this.touchConfig.enabled || !this.chartContainer) return;
        
        try {
            // Настройка базовых touch-событий
            this.setupBasicTouchEvents();
            
            // Настройка pinch-zoom
            if (this.touchConfig.pinchZoom) {
                this.setupPinchZoom();
            }
            
            // Настройка double-tap zoom
            if (this.touchConfig.doubleTapZoom) {
                this.setupDoubleTapZoom();
            }
            
            // Настройка long-press
            this.setupLongPress();
            
            console.log('✅ Touch gestures configured');
            
        } catch (error) {
            console.error('❌ Touch gestures setup failed:', error);
        }
    }

    /**
     * Настройка базовых touch-событий
     */
    setupBasicTouchEvents() {
        // Предотвращаем стандартное поведение для touch-событий
        this.chartContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        this.chartContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        this.chartContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    /**
     * Настройка pinch-zoom
     */
    setupPinchZoom() {
        let initialDistance = 0;
        let initialScale = 1;
        
        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                initialDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                initialScale = this.getCurrentZoomLevel();
            }
        };
        
        const handleTouchMove = (e) => {
            if (e.touches.length === 2) {
                const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                const scaleRatio = currentDistance / initialDistance;
                
                if (scaleRatio > 1.1 || scaleRatio < 0.9) {
                    this.applyZoom(scaleRatio);
                }
            }
        };
        
        this.chartContainer.addEventListener('touchstart', handleTouchStart);
        this.chartContainer.addEventListener('touchmove', handleTouchMove);
    }

    /**
     * Настройка double-tap zoom
     */
    setupDoubleTapZoom() {
        let lastTapTime = 0;
        const doubleTapDelay = 300;
        
        const handleTouchEnd = (e) => {
            const currentTime = Date.now();
            const tapLength = currentTime - lastTapTime;
            
            if (tapLength < doubleTapDelay && tapLength > 0) {
                // Double tap detected
                this.handleDoubleTapZoom(e);
                lastTapTime = 0;
            } else {
                lastTapTime = currentTime;
            }
        };
        
        this.chartContainer.addEventListener('touchend', handleTouchEnd);
    }

    /**
     * Настройка long-press
     */
    setupLongPress() {
        let pressTimer = null;
        
        const handleTouchStart = (e) => {
            pressTimer = setTimeout(() => {
                this.handleLongPress(e);
            }, this.touchConfig.longPressDelay);
        };
        
        const handleTouchEnd = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        
        const handleTouchMove = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        
        this.chartContainer.addEventListener('touchstart', handleTouchStart);
        this.chartContainer.addEventListener('touchend', handleTouchEnd);
        this.chartContainer.addEventListener('touchmove', handleTouchMove);
    }

    /**
     * Получение расстояния между двумя touch-точками
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Получение текущего уровня масштабирования
     */
    getCurrentZoomLevel() {
        // Simplified zoom level calculation
        const timeScale = this.chart.timeScale();
        const visibleRange = timeScale.getVisibleRange();
        
        if (visibleRange) {
            return (visibleRange.to - visibleRange.from) / 1000; // Convert to seconds
        }
        
        return 1;
    }

    /**
     * Применение масштабирования
     */
    applyZoom(scaleRatio) {
        try {
            const timeScale = this.chart.timeScale();
            const visibleRange = timeScale.getVisibleRange();
            
            if (visibleRange) {
                const center = (visibleRange.from + visibleRange.to) / 2;
                const currentRange = visibleRange.to - visibleRange.from;
                const newRange = currentRange / scaleRatio;
                
                timeScale.setVisibleRange({
                    from: center - newRange / 2,
                    to: center + newRange / 2
                });
            }
            
        } catch (error) {
            console.error('❌ Zoom application failed:', error);
        }
    }

    /**
     * Обработка double-tap zoom
     */
    handleDoubleTapZoom(e) {
        try {
            const timeScale = this.chart.timeScale();
            const visibleRange = timeScale.getVisibleRange();
            
            if (visibleRange) {
                const currentRange = visibleRange.to - visibleRange.from;
                const newRange = currentRange / 2; // Zoom in 2x
                const center = (visibleRange.from + visibleRange.to) / 2;
                
                timeScale.setVisibleRange({
                    from: center - newRange / 2,
                    to: center + newRange / 2
                });
            }
            
            console.log('📱 Double-tap zoom applied');
            
        } catch (error) {
            console.error('❌ Double-tap zoom failed:', error);
        }
    }

    /**
     * Обработка long-press
     */
    handleLongPress(e) {
        try {
            console.log('📱 Long press detected');
            
            // Можно добавить кастомную логику для long-press
            // Например, показать контекстное меню
            this.showContextMenu(e);
            
        } catch (error) {
            console.error('❌ Long press handler failed:', error);
        }
    }

    /**
     * Показать контекстное меню
     */
    showContextMenu(e) {
        // Placeholder for context menu implementation
        console.log('📱 Context menu triggered');
    }

    // ==========================================
    // RESIZE OBSERVER
    // ==========================================

    /**
     * Настройка наблюдения за изменением размеров
     */
    setupResizeObserver() {
        if (!window.ResizeObserver) {
            // Fallback для старых браузеров
            window.addEventListener('resize', this.handleResize.bind(this));
            return;
        }
        
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target === this.chartContainer) {
                    this.handleResize();
                }
            }
        });
        
        if (this.chartContainer) {
            this.resizeObserver.observe(this.chartContainer);
        }
    }

    /**
     * Обработка изменения размеров
     */
    handleResize() {
        try {
            // Задержка для избежания множественных вызовов
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            this.resizeTimeout = setTimeout(() => {
                this.adjustChartSize();
                this.updateDeviceDetection();
                this.adjustInterfaceForDevice(this.getDeviceType());
                
                console.log('📱 Chart resized:', {
                    width: this.chartContainer.offsetWidth,
                    height: this.chartContainer.offsetHeight,
                    deviceType: this.getDeviceType()
                });
                
            }, 100);
            
        } catch (error) {
            console.error('❌ Resize handling failed:', error);
        }
    }

    /**
     * Обновление определения устройства
     */
    updateDeviceDetection() {
        const wasMobile = this.isMobile;
        const wasTablet = this.isTablet;
        
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        
        if (wasMobile !== this.isMobile || wasTablet !== this.isTablet) {
            console.log('📱 Device type changed:', {
                from: wasMobile ? 'mobile' : wasTablet ? 'tablet' : 'desktop',
                to: this.getDeviceType()
            });
            
            this.setupResponsiveLayout();
        }
    }

    // ==========================================
    // MOBILE OPTIMIZATIONS
    // ==========================================

    /**
     * Применение мобильных оптимизаций
     */
    applyMobileOptimizations() {
        if (!this.isMobile) return;
        
        try {
            // Оптимизация для мобильных устройств
            this.chart.applyOptions({
                handleScroll: {
                    mouseWheel: false,
                    pressedMouseMove: true,
                    horzTouchDrag: true,
                    vertTouchDrag: false
                },
                handleScale: {
                    axisPressedMouseMove: {
                        time: false,
                        price: false
                    },
                    axisDoubleClickReset: false,
                    mouseWheel: false,
                    pinch: true
                }
            });
            
            console.log('📱 Mobile optimizations applied');
            
        } catch (error) {
            console.error('❌ Mobile optimizations failed:', error);
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Включение/выключение touch-возможностей
     */
    setTouchEnabled(enabled) {
        this.touchConfig.enabled = enabled;
        
        if (enabled) {
            this.setupTouchGestures();
        } else {
            this.removeTouchGestures();
        }
        
        console.log(`📱 Touch gestures ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Удаление touch-жестов
     */
    removeTouchGestures() {
        // Placeholder for removing touch gesture listeners
        console.log('📱 Touch gestures removed');
    }

    /**
     * Получение информации об устройстве
     */
    getDeviceInfo() {
        return {
            type: this.getDeviceType(),
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            hasTouch: 'ontouchstart' in window,
            userAgent: navigator.userAgent
        };
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            deviceInfo: this.getDeviceInfo(),
            touchConfig: this.touchConfig,
            screenBreakpoints: this.screenBreakpoints,
            fullscreenInfo: this.getFullscreenInfo()
        };
    }

    // ==========================================
    // FULLSCREEN API
    // ==========================================

    /**
     * Переключение полноэкранного режима
     */
    toggleFullscreen() {
        if (!this.fullscreenConfig.enabled) {
            console.log('📱 Fullscreen disabled');
            return false;
        }

        try {
            if (this.isFullscreen) {
                this.exitFullscreen();
            } else {
                this.requestFullscreen();
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Fullscreen toggle failed:', error);
            return false;
        }
    }

    /**
     * Запрос полноэкранного режима
     */
    requestFullscreen() {
        if (!this.chartContainer) {
            console.error('❌ Chart container not found');
            return false;
        }

        try {
            const element = this.chartContainer;
            
            // Проверяем поддержку Fullscreen API
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            } else {
                console.warn('⚠️ Fullscreen API not supported');
                return false;
            }

            this.setupFullscreenEventListeners();
            console.log('📱 Fullscreen requested');
            
            return true;
            
        } catch (error) {
            console.error('❌ Fullscreen request failed:', error);
            return false;
        }
    }

    /**
     * Выход из полноэкранного режима
     */
    exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }

            console.log('📱 Fullscreen exit requested');
            return true;
            
        } catch (error) {
            console.error('❌ Fullscreen exit failed:', error);
            return false;
        }
    }

    /**
     * Настройка событий полноэкранного режима
     */
    setupFullscreenEventListeners() {
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        
        events.forEach(event => {
            document.addEventListener(event, this.handleFullscreenChange.bind(this));
        });

        // Выход по Escape
        if (this.fullscreenConfig.exitOnEscape) {
            document.addEventListener('keydown', this.handleFullscreenEscape.bind(this));
        }
    }

    /**
     * Обработка изменения полноэкранного режима
     */
    handleFullscreenChange() {
        try {
            const isFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );

            this.isFullscreen = isFullscreen;
            
            if (isFullscreen) {
                this.onFullscreenEnter();
            } else {
                this.onFullscreenExit();
            }
            
            console.log(`📱 Fullscreen changed: ${isFullscreen ? 'entered' : 'exited'}`);
            
        } catch (error) {
            console.error('❌ Fullscreen change handler error:', error);
        }
    }

    /**
     * Обработка входа в полноэкранный режим
     */
    onFullscreenEnter() {
        try {
            // Применяем полноэкранные стили
            this.chartContainer.style.cssText += `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 9999 !important;
                background: #000 !important;
            `;

            // Показываем элементы управления полноэкранным режимом
            if (this.fullscreenConfig.showControls) {
                this.showFullscreenControls();
            }

            // Обновляем размеры графика
            setTimeout(() => {
                this.chart.applyOptions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 100);

            console.log('📱 Fullscreen mode entered');
            
        } catch (error) {
            console.error('❌ Fullscreen enter handler error:', error);
        }
    }

    /**
     * Обработка выхода из полноэкранного режима
     */
    onFullscreenExit() {
        try {
            // Восстанавливаем оригинальные стили
            this.chartContainer.style.cssText = '';
            this.applyContainerStyles(this.getDeviceType());

            // Скрываем элементы управления полноэкранным режимом
            this.hideFullscreenControls();

            // Обновляем размеры графика
            setTimeout(() => {
                this.adjustChartSize();
            }, 100);

            console.log('📱 Fullscreen mode exited');
            
        } catch (error) {
            console.error('❌ Fullscreen exit handler error:', error);
        }
    }

    /**
     * Обработка клавиши Escape в полноэкранном режиме
     */
    handleFullscreenEscape(e) {
        if (e.key === 'Escape' && this.isFullscreen) {
            this.exitFullscreen();
        }
    }

    /**
     * Показать элементы управления полноэкранным режимом
     */
    showFullscreenControls() {
        // Создаем панель управления если её нет
        let controlsPanel = document.getElementById('fullscreen-controls');
        
        if (!controlsPanel) {
            controlsPanel = document.createElement('div');
            controlsPanel.id = 'fullscreen-controls';
            controlsPanel.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 8px;
                padding: 10px;
                display: flex;
                gap: 10px;
                backdrop-filter: blur(10px);
            `;

            // Кнопка выхода из полноэкранного режима
            const exitButton = document.createElement('button');
            exitButton.innerHTML = '🗙';
            exitButton.title = 'Выйти из полноэкранного режима';
            exitButton.style.cssText = `
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: background 0.3s;
            `;
            exitButton.addEventListener('click', () => this.exitFullscreen());
            exitButton.addEventListener('mouseenter', (e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            exitButton.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'transparent';
            });

            controlsPanel.appendChild(exitButton);
            document.body.appendChild(controlsPanel);
        }

        controlsPanel.style.display = 'flex';
    }

    /**
     * Скрыть элементы управления полноэкранным режимом
     */
    hideFullscreenControls() {
        const controlsPanel = document.getElementById('fullscreen-controls');
        if (controlsPanel) {
            controlsPanel.style.display = 'none';
        }
    }

    /**
     * Проверка поддержки полноэкранного режима
     */
    isFullscreenSupported() {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    }

    /**
     * Получение статуса полноэкранного режима
     */
    getFullscreenInfo() {
        return {
            isFullscreen: this.isFullscreen,
            isSupported: this.isFullscreenSupported(),
            config: this.fullscreenConfig
        };
    }

    /**
     * Настройка конфигурации полноэкранного режима
     */
    setFullscreenConfig(config) {
        this.fullscreenConfig = { ...this.fullscreenConfig, ...config };
        console.log('⚙️ Fullscreen config updated:', this.fullscreenConfig);
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        // Выходим из полноэкранного режима если активен
        if (this.isFullscreen) {
            this.exitFullscreen();
        }

        // Удаляем элементы управления
        const controlsPanel = document.getElementById('fullscreen-controls');
        if (controlsPanel) {
            controlsPanel.remove();
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        this.removeTouchGestures();
        this.isInitialized = false;
        
        console.log('🗑️ Mobile & Responsive features destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileResponsiveChart;
} else if (typeof window !== 'undefined') {
    window.MobileResponsiveChart = MobileResponsiveChart;
} 