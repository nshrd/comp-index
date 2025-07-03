"""
UDF Server for CBMA14 Index - Cross-platform version
"""
import os
import sys
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Добавляем корневую директорию в путь для импортов
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

try:
    from config import AppConfig
    from src.data.coinglass_client import CoinglassClient
    from src.data.cbma14_provider import CBMA14Provider
except ImportError as e:
    print(f"Import error: {e}")
    print("Trying alternative import paths...")
    sys.path.insert(0, str(ROOT_DIR / "src"))
    from data.coinglass_client import CoinglassClient
    from data.cbma14_provider import CBMA14Provider

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UDFServer:
    """Кроссплатформенный UDF сервер для CBMA14 Index"""
    
    def __init__(self, config: Optional[AppConfig] = None):
        if config is None:
            # Создаем базовую конфигурацию, если не передана
            config = self._create_default_config()
        
        self.config = config
        self.app = Flask(__name__)
        # Настройка CORS для работы с GitHub Pages и другими доменами
        CORS(self.app, 
             origins=["https://nshrd.github.io", "http://localhost:*", "https://localhost:*"],
             methods=["GET", "POST", "OPTIONS"],
             allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
             supports_credentials=False)
        
        # Инициализируем провайдеры данных
        try:
            self.coinglass_client = CoinglassClient(config.coinglass)
            # Проверяем, что файл данных существует
            data_file = config.udf.data_file
            if data_file and data_file.exists():
                self.cbma14_provider = CBMA14Provider(data_file)
            else:
                logger.warning(f"Data file not found: {data_file}")
                self.cbma14_provider = None
        except Exception as e:
            logger.error(f"Error initializing providers: {e}")
            self.coinglass_client = None
            self.cbma14_provider = None
        
        # Кэш для данных
        self.crypto_cache = {}
        
        # Настройка маршрутов
        self._setup_routes()
    
    def _create_default_config(self) -> AppConfig:
        """Создать базовую конфигурацию"""
        from config import AppConfig
        return AppConfig.load()
    
    def _setup_routes(self):
        """Настройка маршрутов"""
        # Главная страница
        self.app.route("/", methods=["GET"])(self.index_page)
        
        # API endpoints
        self.app.route("/api/config", methods=["GET"])(self.config_endpoint)
        self.app.route("/api/symbols", methods=["GET"])(self.symbols_endpoint)
        self.app.route("/api/history", methods=["GET"])(self.history_endpoint)
        self.app.route("/api/time", methods=["GET"])(self.time_endpoint)
        self.app.route("/api/search", methods=["GET"])(self.search_endpoint)
        self.app.route("/api/status", methods=["GET"])(self.status_endpoint)
        
        # Crypto endpoints
        self.app.route("/api/crypto/symbols", methods=["GET"])(self.crypto_symbols_endpoint)
        self.app.route("/api/crypto/ohlcv", methods=["GET"])(self.crypto_ohlcv_endpoint)
        
        # UDF endpoints (для совместимости)
        self.app.route("/config", methods=["GET"])(self.config_endpoint)
        self.app.route("/symbols", methods=["GET"])(self.symbols_endpoint)
        self.app.route("/history", methods=["GET"])(self.history_endpoint)
        self.app.route("/time", methods=["GET"])(self.time_endpoint)
        self.app.route("/search", methods=["GET"])(self.search_endpoint)
        self.app.route("/status", methods=["GET"])(self.status_endpoint)
        
        # HTML страницы
        self.app.route("/btc-cbma14", methods=["GET"])(self.btc_cbma14_page)
        self.app.route("/crypto-search", methods=["GET"])(self.crypto_search_page)
        self.app.route("/charts", methods=["GET"])(self.charts_page)
        
        # Статические файлы
        self.app.route("/<path:filename>", methods=["GET"])(self.static_files)
    
    def index_page(self):
        """Главная страница - интерактивный chart"""
        try:
            # Путь к HTML файлу
            chart_dir = Path(__file__).parent.parent / "chart"
            html_file = chart_dir / "index.html"
            
            if html_file.exists():
                return send_from_directory(str(chart_dir), "index.html")
            else:
                # Fallback - отдаем JSON с информацией
                return jsonify({
                    "server": "CBMA14 Index UDF Server",
                    "version": "2.1.0",
                    "status": "running",
                    "message": "HTML interface not found",
                    "api_endpoints": {
                        "config": "/api/config",
                        "symbols": "/api/symbols", 
                        "history": "/api/history",
                        "time": "/api/time",
                        "search": "/api/search",
                        "status": "/api/status",
                        "crypto_symbols": "/api/crypto/symbols",
                        "crypto_ohlcv": "/api/crypto/ohlcv"
                    },
                    "chart_pages": {
                        "main": "/btc-cbma14",
                        "search": "/crypto-search",
                        "full": "/charts"
                    }
                })
        except Exception as e:
            logger.error(f"Error serving index page: {e}")
            return f"Error loading page: {e}", 500
    
    def config_endpoint(self):
        """Конфигурация UDF сервера"""
        return jsonify({
            "supported_resolutions": ["1D", "1W", "1M"],
            "supports_search": True,
            "supports_group_request": False,
            "supports_marks": False,
            "supports_timescale_marks": False,
            "supports_time": True,
            "supports_symbols": True
        })
    
    def symbols_endpoint(self):
        """Информация о символе"""
        symbol = request.args.get("symbol", "")
        
        if not symbol:
            return jsonify({"s": "error", "errmsg": "Symbol parameter is required"})
        
        # CBMA14 символ
        if symbol == "CBMA14":
            return jsonify({
                "name": "CBMA14",
                "ticker": "CBMA14",
                "description": "Coinbase Moving Average Index (Dynamic MA)",
                "type": "index",
                "session": "24x7",
                "timezone": "Etc/UTC",
                "minmov": 1,
                "pricescale": 100000000,
                "supported_resolutions": ["1D", "1W", "1M"],
                "has_intraday": False,
                "has_daily": True,
                "has_weekly_and_monthly": True
            })
        
        # Криптовалюты
        if symbol.endswith('USDT') or symbol in ['BTC', 'ETH', 'BNB']:
            if not symbol.endswith('USDT'):
                symbol = symbol + 'USDT'
            
            return jsonify({
                "name": symbol,
                "ticker": symbol,
                "description": f"{symbol} / USD",
                "type": "crypto",
                "session": "24x7",
                "timezone": "Etc/UTC",
                "minmov": 1,
                "pricescale": 100,
                "supported_resolutions": ["1D", "1W", "1M"],
                "has_intraday": False,
                "has_daily": True,
                "has_weekly_and_monthly": True
            })
        
        return jsonify({"s": "error", "errmsg": f"Unknown symbol: {symbol}"})
    
    def history_endpoint(self):
        """История котировок"""
        symbol = request.args.get("symbol", "")
        from_ts = int(request.args.get("from", 0))
        to_ts = int(request.args.get("to", 0))
        ma_period = int(request.args.get("ma_period", 14))
        
        if not symbol:
            return jsonify({"s": "error", "errmsg": "Symbol parameter is required"})
        
        logger.info(f"History request: symbol={symbol}, from={from_ts}, to={to_ts}, ma_period={ma_period}")
        
        # CBMA14 данные
        if symbol == "CBMA14":
            if not self.cbma14_provider:
                return jsonify({"s": "error", "errmsg": "CBMA14 data not available"})
            
            try:
                result = self.cbma14_provider.get_history(symbol, from_ts, to_ts, ma_period)
                return jsonify(result)
            except Exception as e:
                logger.error(f"Error getting CBMA14 history: {e}")
                return jsonify({"s": "error", "errmsg": str(e)})
        
        # Криптовалюты
        if symbol.endswith('USDT') or symbol in ['BTC', 'ETH', 'BNB']:
            if not symbol.endswith('USDT'):
                symbol = symbol + 'USDT'
            
            if not self.coinglass_client:
                return jsonify({"s": "error", "errmsg": "Crypto data not available"})
            
            try:
                # Рассчитываем дни
                days = max(30, (to_ts - from_ts) // 86400 + 1) if from_ts and to_ts else 365
                
                # Получаем данные
                crypto_data = self.coinglass_client.get_crypto_ohlcv(symbol, days=days)
                
                if crypto_data:
                    # Фильтруем по времени
                    if from_ts and to_ts:
                        crypto_data = [
                            candle for candle in crypto_data
                            if from_ts <= candle['time'] <= to_ts
                        ]
                    
                    # Преобразуем в формат UDF
                    result = {
                        "s": "ok",
                        "t": [candle['time'] for candle in crypto_data],
                        "o": [candle['open'] for candle in crypto_data],
                        "h": [candle['high'] for candle in crypto_data],
                        "l": [candle['low'] for candle in crypto_data],
                        "c": [candle['close'] for candle in crypto_data],
                        "v": [candle['volume'] for candle in crypto_data]
                    }
                    return jsonify(result)
                else:
                    return jsonify({"s": "no_data"})
                    
            except Exception as e:
                logger.error(f"Error getting crypto history for {symbol}: {e}")
                return jsonify({"s": "error", "errmsg": str(e)})
        
        return jsonify({"s": "error", "errmsg": f"Unknown symbol: {symbol}"})
    
    def time_endpoint(self):
        """Текущее время сервера"""
        return str(int(time.time()))
    
    def search_endpoint(self):
        """Поиск символов"""
        query = request.args.get("query", "").upper()
        limit = int(request.args.get("limit", 10))
        
        results = []
        
        # CBMA14
        if "CBMA14".startswith(query) or "CBMA" in query or "MA" in query:
            results.append({
                "symbol": "CBMA14",
                "full_name": "Coinbase Moving Average Index",
                "description": "Coinbase Moving Average Index (Dynamic MA)",
                "type": "index"
            })
        
        # Популярные криптовалюты
        crypto_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "SOLUSDT"]
        for crypto in crypto_symbols:
            if query in crypto:
                results.append({
                    "symbol": crypto,
                    "full_name": f"{crypto} / USD",
                    "description": f"{crypto} / USD",
                    "type": "crypto"
                })
        
        return jsonify(results[:limit])
    
    def crypto_symbols_endpoint(self):
        """Получить доступные криптовалюты"""
        if not self.coinglass_client:
            return jsonify({"error": "Crypto data not available"})
        
        try:
            symbols = self.coinglass_client.get_available_symbols()
            return jsonify(symbols)
        except Exception as e:
            logger.error(f"Error getting crypto symbols: {e}")
            return jsonify({"error": str(e)})
    
    def crypto_ohlcv_endpoint(self):
        """Получить OHLCV данные для криптовалюты"""
        symbol = request.args.get("symbol", "")
        days = int(request.args.get("days", 30))
        
        if not symbol:
            return jsonify({"error": "Symbol parameter is required"})
        
        if not self.coinglass_client:
            return jsonify({"error": "Crypto data not available"})
        
        try:
            crypto_data = self.coinglass_client.get_crypto_ohlcv(symbol, days=days)
            if crypto_data:
                return jsonify({
                    "symbol": symbol,
                    "data": crypto_data,
                    "count": len(crypto_data)
                })
            else:
                return jsonify({"error": f"No data found for {symbol}"})
        except Exception as e:
            logger.error(f"Error getting crypto OHLCV for {symbol}: {e}")
            return jsonify({"error": str(e)})
    
    def status_endpoint(self):
        """Статус сервера"""
        return jsonify({
            "status": "running",
            "version": "2.1.0",
            "server": "CBMA14 Index UDF Server",
            "data_providers": {
                "cbma14": self.cbma14_provider is not None,
                "coinglass": self.coinglass_client is not None
            },
            "config": {
                "port": self.config.udf.port,
                "data_file": str(self.config.udf.data_file) if self.config.udf.data_file else None,
                "data_file_exists": self.config.udf.data_file.exists() if self.config.udf.data_file else False
            },
            "endpoints": [
                "/api/config", "/api/symbols", "/api/history", "/api/time",
                "/api/search", "/api/status", "/api/crypto/symbols", "/api/crypto/ohlcv"
            ]
        })
    
    def btc_cbma14_page(self):
        """Страница с графиком BTC + CBMA14"""
        try:
            chart_dir = Path(__file__).parent.parent / "chart"
            return send_from_directory(str(chart_dir), "index.html")
        except Exception as e:
            logger.error(f"Error serving BTC-CBMA14 page: {e}")
            return f"Error loading page: {e}", 500
    
    def crypto_search_page(self):
        """Страница поиска криптовалют"""
        try:
            chart_dir = Path(__file__).parent.parent / "chart"
            return send_from_directory(str(chart_dir), "index.html")
        except Exception as e:
            logger.error(f"Error serving crypto search page: {e}")
            return f"Error loading page: {e}", 500
    
    def charts_page(self):
        """Полная страница с графиками"""
        try:
            chart_dir = Path(__file__).parent.parent / "chart"
            return send_from_directory(str(chart_dir), "index.html")
        except Exception as e:
            logger.error(f"Error serving charts page: {e}")
            return f"Error loading page: {e}", 500
    
    def static_files(self, filename):
        """Обслуживание статических файлов"""
        try:
            # Попробуем найти файл в chart директории
            chart_dir = Path(__file__).parent.parent / "chart"
            if (chart_dir / filename).exists():
                return send_from_directory(str(chart_dir), filename)
            
            # Если не найден, вернем 404
            return f"File not found: {filename}", 404
        except Exception as e:
            logger.error(f"Error serving static file {filename}: {e}")
            return f"Error loading file: {e}", 500
    
    def run(self):
        """Запустить сервер"""
        logger.info(f"Starting CBMA14 Index UDF Server v2.1.0")
        logger.info(f"Server: {self.config.udf.host}:{self.config.udf.port}")
        logger.info(f"Data file: {self.config.udf.data_file}")
        logger.info(f"CBMA14 provider: {'Available' if self.cbma14_provider else 'Not available'}")
        logger.info(f"Coinglass client: {'Available' if self.coinglass_client else 'Not available'}")
        
        self.app.run(
            host=self.config.udf.host,
            port=self.config.udf.port,
            debug=self.config.udf.debug
        )


def create_app(config: Optional[AppConfig] = None) -> Flask:
    """Фабрика приложений Flask для Gunicorn"""
    server = UDFServer(config)
    return server.app


# Создаем приложение для Gunicorn
try:
    from config import AppConfig
    app = create_app(AppConfig.load())
except Exception as e:
    logger.error(f"Error creating app: {e}")
    app = create_app()

if __name__ == "__main__":
    try:
        from config import AppConfig
        config = AppConfig.load()
        server = UDFServer(config)
        server.run()
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        # Базовый запуск без конфигурации
        server = UDFServer()
        server.run() 