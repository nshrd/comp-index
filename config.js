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
            UDF_BASE_URL: 'http://localhost:8000',
            API_BASE_URL: 'http://localhost:8000/api',
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
            UDF_BASE_URL: 'https://64.226.108.150', // VPS без порта для HTTPS
            API_BASE_URL: 'https://64.226.108.150/api',
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
    DEFAULT_SYMBOL: 'BTC',
    DEFAULT_MA_PERIOD: 14,
    AVAILABLE_SYMBOLS: ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP'],
    AVAILABLE_MA_PERIODS: [7, 14, 30],
    
    // Настройки UI
    CHART_HEIGHT: 600,
    CHART_WIDTH: '100%',
    REFRESH_INTERVAL: 60000, // 1 минута
    
    // Цвета
    COLORS: {
        BTC_UP: '#00D4AA',
        BTC_DOWN: '#FF4976',
        CBMA14_LINE: '#2962FF',
        BACKGROUND: '#f8fafc',
        TEXT: '#1a202c',
        GRID: 'rgba(197, 203, 206, 0.3)'
    },
    
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