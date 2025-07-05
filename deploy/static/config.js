/**
 * CBMA14 Frontend Configuration
 * Automatically detects environment and sets appropriate API endpoints
 */

// Детекция окружения и настройка API URL
function getApiConfig() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Развитие локально
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
                UDF_BASE_URL: 'https://charts.expert/api',
    API_BASE_URL: 'https://charts.expert/api',
            UDF_ENDPOINT: '/api', // Прямые API вызовы
            IS_DEVELOPMENT: true,
            CORS_ENABLED: true
        };
    }
    
    // VPS развертывание
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        const baseUrl = `${protocol}//${hostname}`;
        return {
            UDF_BASE_URL: baseUrl,
            API_BASE_URL: `${baseUrl}/api`,
            UDF_ENDPOINT: '/api',
            IS_DEVELOPMENT: false,
            CORS_ENABLED: true
        };
    }
    
    // GitHub Pages или другие хостинги
    if (hostname.includes('github.io') || hostname.includes('github.com')) {
        return {
            UDF_BASE_URL: 'https://charts.expert', // Используем наш домен с SSL
            API_BASE_URL: 'https://charts.expert/api',
            UDF_ENDPOINT: '/api',
            IS_DEVELOPMENT: false,
            CORS_ENABLED: true
        };
    }
    
    // Основной домен charts.expert
    if (hostname.includes('charts.expert')) {
        return {
            UDF_BASE_URL: `${protocol}//${hostname}`,
            API_BASE_URL: `${protocol}//${hostname}/api`,
            UDF_ENDPOINT: '/api',
            IS_DEVELOPMENT: false,
            CORS_ENABLED: true
        };
    }
    
    // Продакшн с доменом
    return {
        UDF_BASE_URL: `${protocol}//${hostname}`,
        API_BASE_URL: `${protocol}//${hostname}/api`,
        UDF_ENDPOINT: '/api',
        IS_DEVELOPMENT: false,
        CORS_ENABLED: true
    };
}

// Глобальная конфигурация
const CONFIG = {
    // API настройки
    ...getApiConfig(),
    
    // Настройки приложения
    DEFAULT_MA_PERIOD: 14,
    
    // Сообщения
    MESSAGES: {
        LOADING: 'Загрузка данных...',
        SUCCESS: 'Данные загружены успешно',
        ERROR: 'Ошибка загрузки данных',
        NO_DATA: 'Нет данных для отображения',
        UNSUPPORTED_SYMBOL: 'Символ пока не поддерживается',
        SEARCH_DISABLED: 'Поиск пока не поддерживается'
    }
};

// Конфигурация для множественных инструментов
const INSTRUMENTS = {
    coinbase: {
        name: 'Coinbase Index',
        dataSource: 'json', // специальный формат JSON
        path: '/data/data.json',
        color: '#2962FF',
        priceScaleId: 'left',
        seriesType: 'line',
        supportedTimeframes: ['D', '3D', 'W'] // JSON данные не поддерживают 4H
    },
    spx: {
        name: 'S&P 500',
        dataSource: 'csv',
        path: '/data/spx/',
        color: '#FF6B35',
        priceScaleId: 'right',
        seriesType: 'line',
        supportedTimeframes: ['D', '3D', 'W'] // CSV данные обычно дневные
    },
    vix: {
        name: 'VIX',
        dataSource: 'csv',
        path: '/data/vix/',
        color: '#6A4C93',
        priceScaleId: 'right',
        seriesType: 'line',
        supportedTimeframes: ['D', '3D', 'W'] // CSV данные обычно дневные
    },
    dxy: {
        name: 'DXY',
        dataSource: 'csv',
        path: '/data/dxy/',
        color: '#1B998B',
        priceScaleId: 'right',
        seriesType: 'line',
        supportedTimeframes: ['D', '3D', 'W'] // CSV данные обычно дневные
    },
    btc: {
        name: 'BTC',
        dataSource: 'api',
        apiSymbol: 'BTCUSDT',
        color: '#F7931A',
        priceScaleId: 'right',
        seriesType: 'candlestick',
        supportedTimeframes: ['240', 'D', '3D', 'W'] // API поддерживает все таймфреймы
    },
    total3esbtc: {
        name: 'Total3 - BTC',
        dataSource: 'csv',
        path: '/data/total3esbtc/',
        color: '#F72585',
        priceScaleId: 'right',
        seriesType: 'line',
        supportedTimeframes: ['D', '3D', 'W'] // CSV данные обычно дневные
    },
    withoutbtceth: {
        name: 'Without BTC/ETH',
        dataSource: 'csv',
        path: '/data/withoutbtceth/',
        color: '#4361EE',
        priceScaleId: 'right',
        seriesType: 'line',
        supportedTimeframes: ['D', '3D', 'W'] // CSV данные обычно дневные
    }
};

    // Добавляем инструменты в глобальную конфигурацию
    CONFIG.INSTRUMENTS = INSTRUMENTS;
    
    // Экспорт для использования в других файлах
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CONFIG;
    } else {
    window.CONFIG = CONFIG;
}

// Логирование конфигурации
console.log('🔧 Frontend Configuration:', {
    Environment: CONFIG.IS_DEVELOPMENT ? 'Development' : 'Production',
    API_BASE_URL: CONFIG.API_BASE_URL,
    UDF_BASE_URL: CONFIG.UDF_BASE_URL,
    Hostname: window.location.hostname
}); 