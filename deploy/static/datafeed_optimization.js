/**
 * UDF Datafeed Optimization
 * Оптимизация UDF datafeed с использованием встроенных возможностей TradingView
 */

class DatafeedOptimizer {
    
    constructor() {
        this.cache = new Map();
        this.subscriptions = new Map();
        this.isInitialized = false;
        this.config = {
            cacheTimeout: 5 * 60 * 1000, // 5 минут
            maxCacheSize: 100,
            batchSize: 1000,
            updateInterval: 1000 // 1 секунда для real-time
        };
        this.initialize();
    }

    /**
     * Инициализация оптимизатора
     */
    initialize() {
        try {
            this.setupCacheManagement();
            this.isInitialized = true;
            console.log('✅ Datafeed Optimizer initialized');
            
        } catch (error) {
            console.error('❌ Datafeed Optimizer initialization failed:', error);
        }
    }

    // ==========================================
    // КЭШИРОВАНИЕ ДАННЫХ
    // ==========================================

    /**
     * Настройка управления кэшем
     */
    setupCacheManagement() {
        // Очистка кэша каждые 10 минут
        setInterval(() => {
            this.cleanExpiredCache();
        }, 10 * 60 * 1000);
    }

    /**
     * Генерация ключа кэша
     */
    generateCacheKey(symbol, resolution, from, to) {
        return `${symbol}_${resolution}_${from}_${to}`;
    }

    /**
     * Получение данных из кэша
     */
    getFromCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
            console.log(`📦 Cache hit: ${cacheKey}`);
            return cached.data;
        }
        return null;
    }

    /**
     * Сохранение данных в кэш
     */
    saveToCache(cacheKey, data) {
        // Проверяем размер кэша
        if (this.cache.size >= this.config.maxCacheSize) {
            this.cleanOldestCache();
        }
        
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        console.log(`💾 Cached: ${cacheKey} (${this.cache.size}/${this.config.maxCacheSize})`);
    }

    /**
     * Очистка устаревшего кэша
     */
    cleanExpiredCache() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.config.cacheTimeout) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned expired cache: ${cleanedCount} entries`);
        }
    }

    /**
     * Очистка самого старого кэша
     */
    cleanOldestCache() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            console.log(`🗑️ Removed oldest cache entry: ${oldestKey}`);
        }
    }

    // ==========================================
    // ОПТИМИЗИРОВАННАЯ ЗАГРУЗКА ДАННЫХ
    // ==========================================

    /**
     * Оптимизированная загрузка исторических данных
     */
    async optimizedGetBars(symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) {
        try {
            const cacheKey = this.generateCacheKey(symbolInfo.name, resolution, from, to);
            
            // Проверяем кэш
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                onHistoryCallback(cachedData.bars, cachedData.meta);
                return;
            }
            
            console.log(`📊 Loading bars: ${symbolInfo.name} ${resolution} ${new Date(from * 1000).toLocaleDateString()} - ${new Date(to * 1000).toLocaleDateString()}`);
            
            // Определяем оптимальную стратегию загрузки
            const loadingStrategy = this.determineLoadingStrategy(symbolInfo, resolution, from, to, firstDataRequest);
            
            let barsData;
            switch (loadingStrategy.type) {
                case 'batch':
                    barsData = await this.loadDataInBatches(symbolInfo, resolution, from, to, loadingStrategy.batchSize);
                    break;
                    
                case 'progressive':
                    barsData = await this.loadDataProgressively(symbolInfo, resolution, from, to);
                    break;
                    
                case 'direct':
                default:
                    barsData = await this.loadDataDirect(symbolInfo, resolution, from, to);
                    break;
            }
            
            if (barsData && barsData.bars && barsData.bars.length > 0) {
                // Кэшируем результат
                this.saveToCache(cacheKey, barsData);
                
                // Применяем оптимизации
                const optimizedBars = this.optimizeBarsData(barsData.bars, resolution);
                
                onHistoryCallback(optimizedBars, barsData.meta);
                console.log(`✅ Loaded ${optimizedBars.length} bars for ${symbolInfo.name}`);
            } else {
                onHistoryCallback([], { noData: true });
                console.log(`⚠️ No data for ${symbolInfo.name}`);
            }
            
        } catch (error) {
            console.error('❌ Optimized getBars error:', error);
            onErrorCallback(error.message);
        }
    }

    /**
     * Определение стратегии загрузки
     */
    determineLoadingStrategy(symbolInfo, resolution, from, to, firstDataRequest) {
        const timeSpan = to - from;
        const days = timeSpan / (24 * 60 * 60);
        
        // Для больших диапазонов используем батчевую загрузку
        if (days > 365 || firstDataRequest) {
            return {
                type: 'batch',
                batchSize: Math.min(this.config.batchSize, Math.ceil(days / 10))
            };
        }
        
        // Для средних диапазонов - прогрессивная загрузка
        if (days > 30) {
            return { type: 'progressive' };
        }
        
        // Для маленьких диапазонов - прямая загрузка
        return { type: 'direct' };
    }

    /**
     * Загрузка данных батчами
     */
    async loadDataInBatches(symbolInfo, resolution, from, to, batchSize) {
        const allBars = [];
        const totalTimeSpan = to - from;
        const batchTimeSpan = Math.ceil(totalTimeSpan / batchSize);
        
        console.log(`📦 Loading in ${batchSize} batches...`);
        
        for (let i = 0; i < batchSize; i++) {
            const batchFrom = from + (i * batchTimeSpan);
            const batchTo = Math.min(from + ((i + 1) * batchTimeSpan), to);
            
            try {
                const batchData = await this.loadDataDirect(symbolInfo, resolution, batchFrom, batchTo);
                
                if (batchData && batchData.bars) {
                    allBars.push(...batchData.bars);
                }
                
                // Небольшая задержка между батчами для избежания rate limiting
                if (i < batchSize - 1) {
                    await this.delay(100);
                }
                
            } catch (error) {
                console.warn(`⚠️ Batch ${i + 1} failed:`, error);
            }
        }
        
        return {
            bars: allBars.sort((a, b) => a.time - b.time),
            meta: { noData: allBars.length === 0 }
        };
    }

    /**
     * Прогрессивная загрузка данных
     */
    async loadDataProgressively(symbolInfo, resolution, from, to) {
        // Сначала загружаем обзорные данные с низким разрешением
        const overviewData = await this.loadDataDirect(symbolInfo, this.getOverviewResolution(resolution), from, to);
        
        // Затем загружаем детальные данные для видимого диапазона
        const detailData = await this.loadDataDirect(symbolInfo, resolution, from, to);
        
        // Объединяем данные, приоритет детальным
        const combinedBars = this.combineProgressiveData(overviewData?.bars || [], detailData?.bars || []);
        
        return {
            bars: combinedBars,
            meta: { noData: combinedBars.length === 0 }
        };
    }

    /**
     * Прямая загрузка данных
     */
    async loadDataDirect(symbolInfo, resolution, from, to) {
        // Здесь должна быть ваша логика загрузки данных
        // Это заглушка, которая должна быть заменена на реальную загрузку
        
        const instrument = CONFIG.INSTRUMENTS[symbolInfo.name.toLowerCase()];
        if (!instrument) {
            throw new Error(`Unknown instrument: ${symbolInfo.name}`);
        }
        
        // Пример загрузки данных (замените на вашу реализацию)
        if (instrument.dataSource === 'api') {
            return await this.loadFromAPI(instrument, resolution, from, to);
        } else {
            return await this.loadFromFile(instrument, resolution, from, to);
        }
    }

    /**
     * Загрузка данных из API
     */
    async loadFromAPI(instrument, resolution, from, to) {
        try {
            const apiUrl = `${CONFIG.API_BASE_URL}/history?symbol=${instrument.apiSymbol}&resolution=${resolution}&from=${from}&to=${to}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.s === 'ok' && data.t && data.o && data.h && data.l && data.c) {
                const bars = [];
                for (let i = 0; i < data.t.length; i++) {
                    bars.push({
                        time: data.t[i],
                        open: parseFloat(data.o[i]),
                        high: parseFloat(data.h[i]),
                        low: parseFloat(data.l[i]),
                        close: parseFloat(data.c[i]),
                        // volume: data.v ? parseFloat(data.v[i]) : 0
                    });
                }
                
                return { bars, meta: { noData: false } };
            }
            
            return { bars: [], meta: { noData: true } };
            
        } catch (error) {
            console.error('❌ API loading error:', error);
            throw error;
        }
    }

    /**
     * Загрузка данных из файла
     */
    async loadFromFile(instrument, resolution, from, to) {
        // Реализация загрузки из файла
        // Это заглушка для демонстрации
        return { bars: [], meta: { noData: true } };
    }

    // ==========================================
    // ОПТИМИЗАЦИЯ ДАННЫХ
    // ==========================================

    /**
     * Оптимизация данных баров
     */
    optimizeBarsData(bars, resolution) {
        if (!bars || bars.length === 0) return bars;
        
        // Удаляем дублирующиеся временные метки
        const uniqueBars = this.removeDuplicateTimes(bars);
        
        // Сортируем по времени
        const sortedBars = uniqueBars.sort((a, b) => a.time - b.time);
        
        // Заполняем пропуски если нужно
        const filledBars = this.fillDataGaps(sortedBars, resolution);
        
        // Применяем сглаживание для высоких разрешений
        const smoothedBars = this.applySmoothingIfNeeded(filledBars, resolution);
        
        return smoothedBars;
    }

    /**
     * Удаление дублирующихся временных меток
     */
    removeDuplicateTimes(bars) {
        const seen = new Set();
        return bars.filter(bar => {
            if (seen.has(bar.time)) {
                return false;
            }
            seen.add(bar.time);
            return true;
        });
    }

    /**
     * Заполнение пропусков данных
     */
    fillDataGaps(bars, resolution) {
        if (bars.length < 2) return bars;
        
        const timeInterval = this.getTimeInterval(resolution);
        const filledBars = [bars[0]];
        
        for (let i = 1; i < bars.length; i++) {
            const prevBar = bars[i - 1];
            const currentBar = bars[i];
            const gap = currentBar.time - prevBar.time;
            
            // Если пропуск больше 2 интервалов, заполняем
            if (gap > timeInterval * 2) {
                const fillCount = Math.floor(gap / timeInterval) - 1;
                
                for (let j = 1; j <= fillCount && j <= 10; j++) { // Максимум 10 заполняющих баров
                    const fillTime = prevBar.time + (j * timeInterval);
                    const fillBar = {
                        time: fillTime,
                        open: prevBar.close,
                        high: prevBar.close,
                        low: prevBar.close,
                        close: prevBar.close,
                        // volume: 0
                    };
                    filledBars.push(fillBar);
                }
            }
            
            filledBars.push(currentBar);
        }
        
        return filledBars;
    }

    /**
     * Применение сглаживания при необходимости
     */
    applySmoothingIfNeeded(bars, resolution) {
        // Применяем легкое сглаживание для минутных данных
        if (resolution === '1' && bars.length > 100) {
            return this.applyLightSmoothing(bars);
        }
        
        return bars;
    }

    /**
     * Легкое сглаживание данных
     */
    applyLightSmoothing(bars) {
        if (bars.length < 3) return bars;
        
        const smoothedBars = [bars[0]];
        
        for (let i = 1; i < bars.length - 1; i++) {
            const prev = bars[i - 1];
            const current = bars[i];
            const next = bars[i + 1];
            
            // Применяем легкое сглаживание только к экстремальным значениям
            const avgHigh = (prev.high + current.high + next.high) / 3;
            const avgLow = (prev.low + current.low + next.low) / 3;
            
            const smoothedBar = {
                ...current,
                high: Math.abs(current.high - avgHigh) > current.high * 0.05 ? avgHigh : current.high,
                low: Math.abs(current.low - avgLow) > current.low * 0.05 ? avgLow : current.low
            };
            
            smoothedBars.push(smoothedBar);
        }
        
        smoothedBars.push(bars[bars.length - 1]);
        return smoothedBars;
    }

    // ==========================================
    // REAL-TIME ПОДПИСКИ
    // ==========================================

    /**
     * Оптимизированная подписка на real-time данные
     */
    optimizedSubscribeBars(symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) {
        try {
            console.log(`📡 Subscribing to real-time: ${symbolInfo.name} ${resolution}`);
            
            const subscription = {
                symbolInfo,
                resolution,
                onRealtimeCallback,
                subscribeUID,
                onResetCacheNeededCallback,
                lastUpdate: Date.now(),
                updateInterval: this.config.updateInterval
            };
            
            this.subscriptions.set(subscribeUID, subscription);
            
            // Запускаем обновления
            this.startRealtimeUpdates(subscription);
            
            console.log(`✅ Real-time subscription active: ${subscribeUID}`);
            
        } catch (error) {
            console.error('❌ Real-time subscription error:', error);
        }
    }

    /**
     * Отписка от real-time данных
     */
    optimizedUnsubscribeBars(subscribeUID) {
        try {
            const subscription = this.subscriptions.get(subscribeUID);
            if (subscription) {
                if (subscription.intervalId) {
                    clearInterval(subscription.intervalId);
                }
                this.subscriptions.delete(subscribeUID);
                console.log(`✅ Real-time unsubscribed: ${subscribeUID}`);
            }
            
        } catch (error) {
            console.error('❌ Real-time unsubscription error:', error);
        }
    }

    /**
     * Запуск real-time обновлений
     */
    startRealtimeUpdates(subscription) {
        subscription.intervalId = setInterval(async () => {
            try {
                await this.fetchRealtimeUpdate(subscription);
            } catch (error) {
                console.error('❌ Real-time update error:', error);
            }
        }, subscription.updateInterval);
    }

    /**
     * Получение real-time обновления
     */
    async fetchRealtimeUpdate(subscription) {
        // Здесь должна быть ваша логика получения real-time данных
        // Это заглушка для демонстрации
        
        const now = Math.floor(Date.now() / 1000);
        const mockBar = {
            time: now,
            open: 50000 + Math.random() * 1000,
            high: 50000 + Math.random() * 1500,
            low: 50000 + Math.random() * 500,
            close: 50000 + Math.random() * 1000,
                                // volume: Math.random() * 100
        };
        
        subscription.onRealtimeCallback(mockBar);
        subscription.lastUpdate = Date.now();
    }

    // ==========================================
    // УТИЛИТЫ
    // ==========================================

    /**
     * Получение временного интервала для разрешения
     */
    getTimeInterval(resolution) {
        const intervals = {
            '1': 60,
            '5': 300,
            '15': 900,
            '60': 3600,
            '240': 14400,
            'D': 86400,
            'W': 604800
        };
        
        return intervals[resolution] || 3600;
    }

    /**
     * Получение обзорного разрешения
     */
    getOverviewResolution(resolution) {
        const overviewMap = {
            '1': '5',
            '5': '15',
            '15': '60',
            '60': '240',
            '240': 'D'
        };
        
        return overviewMap[resolution] || 'D';
    }

    /**
     * Объединение прогрессивных данных
     */
    combineProgressiveData(overviewBars, detailBars) {
        if (detailBars.length === 0) return overviewBars;
        if (overviewBars.length === 0) return detailBars;
        
        // Приоритет детальным данным
        const detailTimes = new Set(detailBars.map(bar => bar.time));
        const filteredOverview = overviewBars.filter(bar => !detailTimes.has(bar.time));
        
        return [...filteredOverview, ...detailBars].sort((a, b) => a.time - b.time);
    }

    /**
     * Задержка
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            cacheSize: this.cache.size,
            maxCacheSize: this.config.maxCacheSize,
            activeSubscriptions: this.subscriptions.size,
            config: this.config
        };
    }

    /**
     * Очистка всех данных
     */
    clearAll() {
        this.cache.clear();
        
        // Отписываемся от всех подписок
        for (const subscribeUID of this.subscriptions.keys()) {
            this.optimizedUnsubscribeBars(subscribeUID);
        }
        
        console.log('✅ Datafeed Optimizer cleared');
    }

    /**
     * Уничтожение объекта
     */
    destroy() {
        this.clearAll();
        this.isInitialized = false;
        console.log('🗑️ Datafeed Optimizer destroyed');
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatafeedOptimizer;
} else if (typeof window !== 'undefined') {
    window.DatafeedOptimizer = DatafeedOptimizer;
} 