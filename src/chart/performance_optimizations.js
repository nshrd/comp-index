/**
 * Performance Optimizations for Lightweight Charts
 * Оптимизация производительности для больших данных
 */

class PerformanceOptimizations {
    
    constructor(chart) {
        this.chart = chart;
        this.viewportConfig = {
            maxVisibleDataPoints: 1000,
            bufferSize: 100,
            lazyLoading: true,
            memoryLimit: 200 * 1024 * 1024 // 200MB
        };
        this.dataCache = new Map();
        this.memoryUsage = 0;
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Инициализация модуля
     */
    initialize() {
        try {
            this.setupViewportOptimization();
            this.setupMemoryManagement();
            this.isInitialized = true;
            console.log('✅ Performance Optimizations initialized');
            
        } catch (error) {
            console.error('❌ Performance Optimizations initialization failed:', error);
        }
    }

    // ==========================================
    // VIEWPORT OPTIMIZATION
    // ==========================================

    /**
     * Настройка оптимизации viewport
     */
    setupViewportOptimization() {
        try {
            this.chart.applyOptions({
                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true,
                    horzTouchDrag: true,
                    vertTouchDrag: false
                },
                handleScale: {
                    mouseWheel: true,
                    pinch: true,
                    axisPressedMouseMove: {
                        time: true,
                        price: true
                    }
                },
                kineticScroll: {
                    touch: true,
                    mouse: false
                }
            });
            
            console.log('✅ Viewport optimization configured');
            
        } catch (error) {
            console.error('❌ Viewport optimization failed:', error);
        }
    }

    /**
     * Оптимизация данных для текущего viewport
     */
    optimizeDataForViewport(data, seriesType = 'line') {
        if (!Array.isArray(data) || data.length === 0) {
            return data;
        }

        try {
            const timeScale = this.chart.timeScale();
            const visibleRange = timeScale.getVisibleRange();
            
            if (!visibleRange) {
                return this.decimateData(data, this.viewportConfig.maxVisibleDataPoints);
            }

            // Фильтруем данные по видимому диапазону с буфером
            const bufferTime = (visibleRange.to - visibleRange.from) * 0.1;
            const filteredData = data.filter(point => 
                point.time >= (visibleRange.from - bufferTime) && 
                point.time <= (visibleRange.to + bufferTime)
            );

            // Децимация если данных слишком много
            if (filteredData.length > this.viewportConfig.maxVisibleDataPoints) {
                return this.decimateData(filteredData, this.viewportConfig.maxVisibleDataPoints);
            }

            return filteredData;
            
        } catch (error) {
            console.error('❌ Viewport data optimization failed:', error);
            return data;
        }
    }

    /**
     * Децимация данных для уменьшения количества точек
     */
    decimateData(data, targetPoints) {
        if (data.length <= targetPoints) {
            return data;
        }

        const step = Math.floor(data.length / targetPoints);
        const decimated = [];
        
        for (let i = 0; i < data.length; i += step) {
            decimated.push(data[i]);
        }
        
        // Всегда включаем последнюю точку
        if (decimated[decimated.length - 1] !== data[data.length - 1]) {
            decimated.push(data[data.length - 1]);
        }
        
        console.log(`✅ Data decimated: ${data.length} → ${decimated.length} points`);
        return decimated;
    }

    // ==========================================
    // MEMORY MANAGEMENT
    // ==========================================

    /**
     * Настройка управления памятью
     */
    setupMemoryManagement() {
        try {
            // Мониторинг использования памяти
            this.startMemoryMonitoring();
            
            // Периодическая очистка кэша
            setInterval(() => {
                this.cleanupCache();
            }, 300000); // каждые 5 минут (было 60000 - 1 минута)
            
            console.log('✅ Memory management configured');
            
        } catch (error) {
            console.error('❌ Memory management setup failed:', error);
        }
    }

    /**
     * Запуск мониторинга памяти
     */
    startMemoryMonitoring() {
        if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
            setInterval(() => {
                const memory = window.performance.memory;
                this.memoryUsage = memory.usedJSHeapSize;
                
                // Если превышен лимит памяти, очищаем кеш
                if (this.memoryUsage > this.viewportConfig.memoryLimit) {
                    console.warn('⚠️ Memory limit exceeded, cleaning old cache entries');
                    this.cleanupCache(); // мягкая очистка вместо полной
                }
            }, 60000); // каждые 60 секунд (было 10 секунд)
        }
    }

    /**
     * Очистка кэша данных
     */
    cleanupCache() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 минут
        
        let cleanedCount = 0;
        
        for (const [key, value] of this.dataCache.entries()) {
            if (now - value.timestamp > maxAge) {
                this.dataCache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`✅ Cache cleaned: ${cleanedCount} items removed`);
        }
    }

    /**
     * Принудительная очистка кэша
     */
    forceCleanupCache() {
        const size = this.dataCache.size;
        this.dataCache.clear();
        console.log(`✅ Cache force cleaned: ${size} items removed`);
    }

    // ==========================================
    // DATA CACHING
    // ==========================================

    /**
     * Кэширование обработанных данных
     */
    cacheData(key, data) {
        try {
            this.dataCache.set(key, {
                data: data,
                timestamp: Date.now(),
                size: this.estimateDataSize(data)
            });
            
        } catch (error) {
            console.error('❌ Data caching failed:', error);
        }
    }

    /**
     * Получение данных из кэша
     */
    getCachedData(key) {
        const cached = this.dataCache.get(key);
        
        if (cached) {
            // Проверяем актуальность
            const maxAge = 5 * 60 * 1000; // 5 минут
            if (Date.now() - cached.timestamp < maxAge) {
                return cached.data;
            } else {
                this.dataCache.delete(key);
            }
        }
        
        return null;
    }

    /**
     * Оценка размера данных в памяти
     */
    estimateDataSize(data) {
        try {
            return JSON.stringify(data).length * 2; // приблизительная оценка
        } catch (error) {
            return 0;
        }
    }

    // ==========================================
    // LAZY LOADING
    // ==========================================

    /**
     * Ленивая загрузка данных по запросу
     */
    async loadDataLazily(dataProvider, timeRange, options = {}) {
        if (!this.viewportConfig.lazyLoading) {
            return await dataProvider(timeRange);
        }

        try {
            const cacheKey = `lazy_${timeRange.from}_${timeRange.to}`;
            
            // Проверяем кэш
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.log('✅ Lazy loading: data from cache');
                return cached;
            }

            // Загружаем данные с прогрессом
            console.log('🔄 Lazy loading: fetching data...');
            const data = await dataProvider(timeRange);
            
            // Оптимизируем для viewport
            const optimized = this.optimizeDataForViewport(data);
            
            // Кэшируем результат
            this.cacheData(cacheKey, optimized);
            
            console.log(`✅ Lazy loading completed: ${data.length} → ${optimized.length} points`);
            return optimized;
            
        } catch (error) {
            console.error('❌ Lazy loading failed:', error);
            throw error;
        }
    }

    // ==========================================
    // PERFORMANCE MONITORING
    // ==========================================

    /**
     * Измерение производительности операции
     */
    measurePerformance(name, operation) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            
            try {
                const result = operation();
                
                if (result instanceof Promise) {
                    result.then(value => {
                        const endTime = performance.now();
                        console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms`);
                        resolve(value);
                    }).catch(reject);
                } else {
                    const endTime = performance.now();
                    console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms`);
                    resolve(result);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Получение метрик производительности
     */
    getPerformanceMetrics() {
        const metrics = {
            memoryUsage: this.memoryUsage,
            cacheSize: this.dataCache.size,
            isInitialized: this.isInitialized
        };

        // Добавляем метрики браузера если доступны
        if (typeof window !== 'undefined' && window.performance) {
            if (window.performance.memory) {
                metrics.browserMemory = {
                    used: window.performance.memory.usedJSHeapSize,
                    total: window.performance.memory.totalJSHeapSize,
                    limit: window.performance.memory.jsHeapSizeLimit
                };
            }
            
            if (window.performance.timing) {
                metrics.pageLoadTime = window.performance.timing.loadEventEnd - 
                                     window.performance.timing.navigationStart;
            }
        }

        return metrics;
    }

    // ==========================================
    // BATCH OPERATIONS
    // ==========================================

    /**
     * Батчевые операции для больших данных
     */
    async processBatch(data, batchSize, processor) {
        const results = [];
        const totalBatches = Math.ceil(data.length / batchSize);
        
        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, data.length);
            const batch = data.slice(start, end);
            
            try {
                const result = await processor(batch, i, totalBatches);
                results.push(result);
                
                // Небольшая пауза для не блокировки UI
                if (i < totalBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
                
            } catch (error) {
                console.error(`❌ Batch ${i + 1}/${totalBatches} failed:`, error);
                throw error;
            }
        }
        
        console.log(`✅ Batch processing completed: ${totalBatches} batches`);
        return results.flat();
    }

    // ==========================================
    // CONFIGURATION
    // ==========================================

    /**
     * Обновление конфигурации производительности
     */
    updateConfig(config) {
        this.viewportConfig = { ...this.viewportConfig, ...config };
        console.log('⚙️ Performance config updated:', this.viewportConfig);
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            config: this.viewportConfig,
            metrics: this.getPerformanceMetrics()
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.forceCleanupCache();
        this.isInitialized = false;
        console.log('🗑️ Performance Optimizations destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizations;
} else if (typeof window !== 'undefined') {
    window.PerformanceOptimizations = PerformanceOptimizations;
} 