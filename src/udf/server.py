"""
UDF Server for CBMA14 Index
"""
from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
import time
import logging
from typing import Dict, Any
from pathlib import Path

from config import AppConfig
from src.data.coinglass_client import CoinglassClient
from src.data.cbma14_provider import CBMA14Provider

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UDFServer:
    """UDF сервер для предоставления данных CBMA14 и криптовалют"""
    
    def __init__(self, config: AppConfig):
        self.config = config
        self.app = Flask(__name__)
        CORS(self.app)
        
        # Инициализируем провайдеры данных
        self.coinglass_client = CoinglassClient(config.coinglass)
        self.cbma14_provider = CBMA14Provider(config.udf.data_file)
        
        # Кэш для данных криптовалют
        self.crypto_cache = {}
        
        # Путь к статическим файлам
        self.static_folder = Path(__file__).parent.parent.parent / "docs"
        self.chart_folder = Path(__file__).parent.parent / "chart"
        
        self._setup_routes()
        
    def _setup_routes(self):
        """Настройка маршрутов"""
        # API endpoints
        self.app.route("/api/config", methods=["GET"])(self.config_endpoint)
        self.app.route("/api/symbols", methods=["GET"])(self.symbols_endpoint)
        self.app.route("/api/history", methods=["GET"])(self.history_endpoint)
        self.app.route("/api/time", methods=["GET"])(self.time_endpoint)
        self.app.route("/api/search", methods=["GET"])(self.search_endpoint)
        self.app.route("/api/crypto/ohlcv", methods=["GET"])(self.crypto_ohlcv_endpoint)
        self.app.route("/api/crypto/search", methods=["GET"])(self.crypto_search_endpoint)
        self.app.route("/api/crypto/symbols", methods=["GET"])(self.crypto_symbols_endpoint)
        self.app.route("/api/btc/ohlcv", methods=["GET"])(self.btc_ohlcv_endpoint)
        
        # UDF endpoints (для обратной совместимости)
        self.app.route("/config", methods=["GET"])(self.config_endpoint)
        self.app.route("/symbols", methods=["GET"])(self.symbols_endpoint)
        self.app.route("/history", methods=["GET"])(self.history_endpoint)
        self.app.route("/time", methods=["GET"])(self.time_endpoint)
        self.app.route("/search", methods=["GET"])(self.search_endpoint)
        self.app.route("/crypto/ohlcv", methods=["GET"])(self.crypto_ohlcv_endpoint)
        self.app.route("/crypto/search", methods=["GET"])(self.crypto_search_endpoint)
        self.app.route("/crypto/symbols", methods=["GET"])(self.crypto_symbols_endpoint)
        self.app.route("/btc/ohlcv", methods=["GET"])(self.btc_ohlcv_endpoint)
        
        # Статические файлы и веб-интерфейсы
        self.app.route("/", methods=["GET"])(self.index_page)
        self.app.route("/btc-cbma14", methods=["GET"])(self.btc_cbma14_page)
        self.app.route("/crypto-search", methods=["GET"])(self.crypto_search_page)
        self.app.route("/charts", methods=["GET"])(self.charts_page)
        
        # Статические файлы (JS, CSS, etc)
        self.app.route("/<path:filename>", methods=["GET"])(self.static_files)
        
        # API status endpoint
        self.app.route("/status", methods=["GET"])(self.status_endpoint)

    def index_page(self):
        """Главная страница - TradingView Charts"""
        try:
            return send_from_directory(self.static_folder, "index.html")
        except Exception as e:
            logger.error(f"Error serving index.html: {e}")
            return f"Error loading TradingView page: {e}", 500
    
    def btc_cbma14_page(self):
        """Страница с графиком BTC + CBMA14"""
        try:
            return send_from_directory(self.chart_folder, "btc_cbma14_chart.html")
        except Exception as e:
            logger.error(f"Error serving btc_cbma14_chart.html: {e}")
            return f"Error loading page: {e}", 500
    
    def crypto_search_page(self):
        """Страница поиска криптовалют"""
        try:
            return send_from_directory(self.static_folder, "crypto_search.html")
        except Exception as e:
            logger.error(f"Error serving crypto_search.html: {e}")
            return f"Error loading page: {e}", 500
    
    def charts_page(self):
        """Полный интерфейс с графиками"""
        try:
            return send_from_directory(self.static_folder, "index.html")
        except Exception as e:
            logger.error(f"Error serving index.html: {e}")
            return f"Error loading page: {e}", 500
    
    def static_files(self, filename):
        """Обслуживание статических файлов (JS, CSS, etc)"""
        try:
            return send_from_directory(self.static_folder, filename)
        except Exception as e:
            logger.error(f"Error serving static file {filename}: {e}")
            return f"File not found: {filename}", 404

    def config_endpoint(self):
        """Конфигурация UDF сервера"""
        return jsonify({
            "supported_resolutions": ["60", "240", "D", "W", "M"],
            "supports_search": True,
            "supports_group_request": False,
            "supports_marks": False,
            "supports_timescale_marks": False,
            "supports_time": True
        })
        
    def symbols_endpoint(self):
        """Информация о символе"""
        symbol = request.args.get("symbol", "")
        
        # Проверяем, это CBMA14 или криптовалюта
        if symbol == self.config.udf.cbma14_symbol:
            symbol_info = self.cbma14_provider.get_symbol_info(symbol)
            if not symbol_info:
                return jsonify({
                    "s": "error",
                    "errmsg": f"Unknown symbol: {symbol}"
                })
            return jsonify(symbol_info)
        
        # Проверяем, это криптовалюта
        elif symbol.endswith('USDT') or symbol in ['BTC', 'ETH', 'BNB']:
            # Нормализуем символ
            if not symbol.endswith('USDT'):
                symbol = symbol + 'USDT'
            
            # Ищем символ в доступных
            available_symbols = self.coinglass_client.get_available_symbols()
            symbol_info = None
            
            for sym in available_symbols:
                if sym['symbol'] == symbol:
                    symbol_info = sym
                    break
            
            if not symbol_info:
                return jsonify({
                    "s": "error",
                    "errmsg": f"Unknown crypto symbol: {symbol}"
                })
            
            return jsonify({
                "name": symbol,
                "ticker": symbol,
                "description": symbol_info['description'],
                "type": "crypto",
                "session": "24x7",
                "timezone": "Etc/UTC",
                "minmov": 1,
                "pricescale": 100,
                "supported_resolutions": ["60", "240", "D", "W", "M"],
                "has_intraday": True,
                "has_daily": True,
                "has_weekly_and_monthly": True,
                "currency_code": "USD"
            })
        
        return jsonify({
            "s": "error",
            "errmsg": f"Unknown symbol: {symbol}"
        })
        
    def history_endpoint(self):
        """История котировок"""
        symbol = request.args.get("symbol", "")
        resolution = request.args.get("resolution", "")
        from_ts = int(request.args.get("from", 0))
        to_ts = int(request.args.get("to", 0))
        
        logger.info(f"History request: symbol={symbol}, resolution={resolution}, from={from_ts}, to={to_ts}")
        
        # Если это CBMA14
        if symbol == self.config.udf.cbma14_symbol:
            try:
                # Проверяем параметр ma_period
                ma_period = int(request.args.get("ma_period", 14))
                if ma_period not in [7, 14, 30]:
                    ma_period = 14
                
                logger.info(f"Getting CBMA14 history with MA period: {ma_period}")
                result = self.cbma14_provider.get_history(symbol, from_ts, to_ts, ma_period)
                logger.info(f"CBMA14 result status: {result.get('s', 'unknown')}")
                return jsonify(result)
            except Exception as e:
                logger.error(f"Error in CBMA14 history endpoint: {e}")
                return jsonify({"s": "error", "errmsg": str(e)})
        
        # Если это криптовалюта
        elif symbol.endswith('USDT') or symbol in ['BTC', 'ETH', 'BNB']:
            # Нормализуем символ
            if not symbol.endswith('USDT'):
                symbol = symbol + 'USDT'
            
            try:
                # Рассчитываем количество дней
                days = max(365, (to_ts - from_ts) // 86400 + 1) if from_ts and to_ts else 365
                
                # Получаем данные
                crypto_data = self.coinglass_client.get_crypto_ohlcv(symbol, days=days)
                
                if crypto_data:
                    # Фильтруем по временному диапазону
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
                else:
                    result = {"s": "no_data"}
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"Error fetching crypto history for {symbol}: {e}")
                return jsonify({"s": "error", "errmsg": str(e)})
        
        return jsonify({"s": "error", "errmsg": f"Unknown symbol: {symbol}"})
        
    def time_endpoint(self):
        """Текущее время сервера в секундах"""
        return str(int(time.time()))
        
    def search_endpoint(self):
        """Поиск символов (CBMA14 + криптовалюты)"""
        query = request.args.get("query", "")
        limit = int(request.args.get("limit", 30))
        
        results = []
        
        # Поиск CBMA14
        cbma14_results = self.cbma14_provider.search_symbols(query, limit)
        results.extend(cbma14_results)
        
        # Поиск криптовалют
        crypto_results = self.coinglass_client.search_symbols(query, limit - len(results))
        for crypto in crypto_results:
            results.append({
                "symbol": crypto["symbol"],
                "full_name": crypto["symbol"],
                "description": crypto["description"],
                "exchange": "Binance",
                "ticker": crypto["symbol"],
                "type": "crypto"
            })
        
        return jsonify(results[:limit])
        
    def crypto_search_endpoint(self):
        """Поиск только криптовалют"""
        query = request.args.get("query", "")
        limit = int(request.args.get("limit", 10))
        
        results = self.coinglass_client.search_symbols(query, limit)
        return jsonify(results)
        
    def crypto_symbols_endpoint(self):
        """Получить все доступные криптовалюты"""
        symbols = self.coinglass_client.get_available_symbols()
        return jsonify(symbols)
        
    def crypto_ohlcv_endpoint(self):
        """Получить OHLCV данные для любой криптовалюты"""
        symbol = request.args.get("symbol", "")
        days = int(request.args.get("days", 365))
        
        if not symbol:
            return jsonify({
                "s": "error",
                "errmsg": "Symbol parameter is required"
            })
        
        # Проверяем кэш
        cache_key = f"{symbol}_{days}"
        current_time = time.time()
        
        if cache_key in self.crypto_cache:
            cache_entry = self.crypto_cache[cache_key]
            if (current_time - cache_entry["last_update"]) < self.config.coinglass.cache_duration:
                logger.info(f"Returning cached data for {symbol}")
                return jsonify(cache_entry["data"])
        
        try:
            # Получаем данные
            crypto_data = self.coinglass_client.get_crypto_ohlcv(symbol, days=days)
            
            if crypto_data:
                response = {
                    "s": "ok",
                    "data": crypto_data,
                    "symbol": symbol,
                    "updated": int(current_time)
                }
                
                # Обновляем кэш
                self.crypto_cache[cache_key] = {
                    "data": response,
                    "last_update": current_time
                }
                
                return jsonify(response)
            else:
                return jsonify({
                    "s": "error",
                    "errmsg": f"Failed to fetch data for {symbol}"
                })
                
        except Exception as e:
            logger.error(f"Error fetching crypto data for {symbol}: {e}")
            return jsonify({
                "s": "error",
                "errmsg": str(e)
            })
        
    def btc_ohlcv_endpoint(self):
        """Получить OHLCV данные BTC (обратная совместимость)"""
        days = int(request.args.get("days", 365))
        
        # Перенаправляем на общий endpoint для криптовалют
        request.args = request.args.copy()
        request.args['symbol'] = 'BTCUSDT'
        return self.crypto_ohlcv_endpoint()
            
    def status_endpoint(self):
        """API статус для проверки"""
        return jsonify({
            "status": "ok",
            "server": "UDF Server for CBMA14 & Crypto",
            "version": "2.1",
            "symbols": [self.config.udf.cbma14_symbol] + [s["symbol"] for s in self.coinglass_client.get_available_symbols()[:5]],
            "endpoints": [
                "/", "/btc-cbma14", "/crypto-search", "/charts",
                "/api/config", "/api/symbols", "/api/history", "/api/time", "/api/search",
                "/api/crypto/ohlcv", "/api/crypto/search", "/api/crypto/symbols",
                "/api/btc/ohlcv"
            ],
            "pages": [
                {"url": "/", "title": "Главная (BTC + CBMA14)"},
                {"url": "/btc-cbma14", "title": "BTC + CBMA14 График"},
                {"url": "/crypto-search", "title": "Поиск Криптовалют"},
                {"url": "/charts", "title": "Полный Интерфейс"}
            ],
            "data_file": str(self.config.udf.data_file),
            "data_exists": self.config.udf.data_file.exists(),
            "coinglass_api_key": "Set" if self.config.coinglass.api_key else "Not set"
        })
        
    def run(self):
        """Запустить сервер"""
        logger.info(f"Starting UDF server for CBMA14 + {len(self.coinglass_client.get_available_symbols())} crypto symbols")
        logger.info(f"Data file: {self.config.udf.data_file}")
        logger.info(f"Static files: {self.static_folder}")
        logger.info(f"Coinglass API key: {'Set' if self.config.coinglass.api_key else 'Not set'}")
        logger.info("Available pages:")
        logger.info("  http://localhost:8888/ - Главная (BTC + CBMA14)")
        logger.info("  http://localhost:8888/btc-cbma14 - BTC + CBMA14 График")
        logger.info("  http://localhost:8888/crypto-search - Поиск Криптовалют")
        logger.info("  http://localhost:8888/charts - Полный Интерфейс")
        
        self.app.run(
            host=self.config.udf.host,
            port=self.config.udf.port,
            debug=self.config.udf.debug
        )


def create_app(config: AppConfig = None) -> Flask:
    """Фабрика приложений Flask"""
    if config is None:
        config = AppConfig.load()
    
    server = UDFServer(config)
    return server.app


# Создаем экземпляр приложения для Gunicorn
try:
    from config import AppConfig
    app = create_app(AppConfig.load())
except Exception as e:
    # Fallback на случай проблем с конфигом
    app = create_app()

if __name__ == "__main__":
    from config import config
    server = UDFServer(config)
    server.run() 