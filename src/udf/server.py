"""
CBMA Index UDF Server
Сервер для TradingView UDF API с данными CBMA индекса
"""

from src.data.coinglass_client import CoinglassClient
from src.data.cbma_provider import CBMAProvider
from config import config
import logging
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_compress import Compress
import sys

# Добавляем путь к src модулям
sys.path.insert(0, str(Path(__file__).parent.parent))


# Настройка логирования
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])

# Включаем автоматическое сжатие всех ответов для экономии трафика
Compress(app)

# Глобальные переменные
cbma_provider = None
coinglass_client = None


def init_providers():
    """Инициализация провайдеров данных"""
    global cbma_provider, coinglass_client

    try:
        # Путь к данным
        data_dir = Path(__file__).parent.parent.parent / "data"
        cbma_file = data_dir / "CBMA.json"

        # Инициализация CBMA провайдера
        cbma_provider = CBMAProvider(cbma_file)
        logger.info(f"CBMA Provider инициализирован: {cbma_file}")

        # Инициализация Coinglass клиента
        if config.coinglass_api_key:
            coinglass_client = CoinglassClient(config.coinglass_api_key)
            logger.info("Coinglass Client инициализирован")
        else:
            logger.warning("COINGLASS_API_KEY не найден, Coinglass API отключен")

    except Exception as e:
        logger.error(f"Ошибка инициализации провайдеров: {e}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")


# Инициализируем провайдеры при загрузке модуля
init_providers()

# =============================================
# СТАТИЧЕСКИЕ ФАЙЛЫ
# =============================================


@app.route("/")
def index():
    """Главная страница"""
    static_dir = Path(__file__).parent.parent / "chart"
    return send_from_directory(static_dir, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    """Обслуживание статических файлов"""
    static_dir = Path(__file__).parent.parent / "chart"

    # Проверяем существование файла
    file_path = static_dir / filename
    if file_path.exists() and file_path.is_file():
        return send_from_directory(static_dir, filename)

    # Если файл не найден, возвращаем index.html (для SPA)
    return send_from_directory(static_dir, "index.html")


@app.route("/data/<path:filename>")
def data_files(filename):
    """Обслуживание файлов данных"""
    data_dir = Path(__file__).parent.parent.parent / "data"
    return send_from_directory(data_dir, filename)


# =============================================
# UDF API ENDPOINTS
# =============================================


@app.route("/api/config")
def udf_config():
    """UDF конфигурация"""
    return jsonify(
        {
            "supported_resolutions": [
                "1",
                "5",
                "15",
                "30",
                "60",
                "240",
                "1D",
                "1W",
                "1M",
            ],
            "supports_group_request": False,
            "supports_marks": False,
            "supports_search": True,
            "supports_timescale_marks": False,
            "exchanges": [
                {
                    "value": "CBMA",
                    "name": "CBMA Index",
                    "desc": "Crypto Bear Market Altcoin Index",
                },
                {
                    "value": "CRYPTO",
                    "name": "Cryptocurrency",
                    "desc": "Major Cryptocurrencies",
                },
                {"value": "INDICES", "name": "Indices", "desc": "Stock Market Indices"},
                {"value": "FOREX", "name": "Forex", "desc": "Currency Pairs"},
            ],
            "symbols_types": [
                {"name": "Index", "value": "index"},
                {"name": "Cryptocurrency", "value": "crypto"},
                {"name": "Stock", "value": "stock"},
                {"name": "Forex", "value": "forex"},
            ],
        }
    )


@app.route("/api/symbols")
def udf_symbols():
    """UDF символы"""
    symbol = request.args.get("symbol", "").upper()

    if not symbol:
        return jsonify({"error": "Symbol not specified"}), 400

    # CBMA Index
    if symbol == "CBMA":
        return jsonify(
            {
                "name": "CBMA",
                "exchange-traded": "CBMA",
                "exchange-listed": "CBMA",
                "timezone": "UTC",
                "minmov": 1,
                "minmov2": 0,
                "pointvalue": 1,
                "session": "24x7",
                "has_intraday": True,
                "has_no_volume": True,
                "description": "Crypto Bear Market Altcoin Index 14-day MA",
                "type": "index",
                "supported_resolutions": [
                    "1",
                    "5",
                    "15",
                    "30",
                    "60",
                    "240",
                    "1D",
                    "1W",
                    "1M",
                ],
                "pricescale": 100,
                "ticker": "CBMA",
            }
        )

    # Криптовалюты - динамическая проверка через Coinglass API
    if coinglass_client:
        try:
            available_symbols = coinglass_client.get_available_symbols()
            symbol_names = {s["symbol"]: s["name"] for s in available_symbols}

            if symbol in symbol_names:
                return jsonify(
                    {
                        "name": symbol,
                        "exchange-traded": "CRYPTO",
                        "exchange-listed": "CRYPTO",
                        "timezone": "UTC",
                        "minmov": 1,
                        "minmov2": 0,
                        "pointvalue": 1,
                        "session": "24x7",
                        "has_intraday": True,
                        "has_no_volume": False,
                        "description": symbol_names[symbol],
                        "type": "crypto",
                        "supported_resolutions": [
                            "1",
                            "5",
                            "15",
                            "30",
                            "60",
                            "240",
                            "1D",
                            "1W",
                            "1M",
                        ],
                        "pricescale": 100,
                        "ticker": symbol,
                    }
                )
        except Exception as e:
            logger.error(f"Error getting crypto symbols from Coinglass: {e}")

    # Fallback для основных криптовалют если API недоступен
    crypto_fallback = {
        "BTCUSDT": "Bitcoin",
        "ETHUSDT": "Ethereum",
        "ADAUSDT": "Cardano",
        "SOLUSDT": "Solana",
        "DOTUSDT": "Polkadot",
    }

    if symbol in crypto_fallback:
        return jsonify(
            {
                "name": symbol,
                "exchange-traded": "CRYPTO",
                "exchange-listed": "CRYPTO",
                "timezone": "UTC",
                "minmov": 1,
                "minmov2": 0,
                "pointvalue": 1,
                "session": "24x7",
                "has_intraday": True,
                "has_no_volume": False,
                "description": crypto_fallback[symbol],
                "type": "crypto",
                "supported_resolutions": [
                    "1",
                    "5",
                    "15",
                    "30",
                    "60",
                    "240",
                    "1D",
                    "1W",
                    "1M",
                ],
                "pricescale": 100,
                "ticker": symbol,
            }
        )

    return jsonify({"error": "Symbol not found"}), 404


@app.route("/api/history")
def udf_history():
    """UDF исторические данные"""
    symbol = request.args.get("symbol", "").upper()
    resolution = request.args.get("resolution", "1D")
    from_ts = int(request.args.get("from", 0))
    to_ts = int(request.args.get("to", datetime.now().timestamp()))

    logger.info(f"History request: {symbol}, {resolution}, {from_ts}-{to_ts}")

    if symbol == "CBMA":
        if cbma_provider:
            try:
                # Правильный порядок аргументов: symbol, from_timestamp, to_timestamp,
                # ma_period
                ma_period = 14  # По умолчанию 14 дней
                data = cbma_provider.get_history(symbol, from_ts, to_ts, ma_period)
                logger.info(f"Returning {len(data.get('t', []))} CBMA data points")
                return jsonify(data)
            except Exception as e:
                logger.error(f"Error getting CBMA history: {e}")
                return jsonify({"s": "error", "errmsg": str(e)})
        else:
            return jsonify({"s": "error", "errmsg": "CBMA provider not initialized"})

    # Проверяем Coinglass API для криптовалют
    if coinglass_client:
        try:
            available_symbols = coinglass_client.get_available_symbols()
            symbol_names = {s["symbol"]: s["name"] for s in available_symbols}

            if symbol in symbol_names:
                # Определяем интервал для Coinglass в зависимости от запрошенного
                # resolution
                resolution_map = {
                    "240": "4h",
                    "4H": "4h",
                    "4h": "4h",
                    "D": "1d",
                    "1D": "1d",
                    "3D": "1d",
                    "1W": "1d",
                }
                interval = resolution_map.get(resolution.upper(), "4h")
                data = coinglass_client.get_crypto_ohlcv(
                    symbol, days=365, interval=interval
                )

                if data:
                    # Фильтруем по времени
                    filtered_data = [
                        candle for candle in data if from_ts <= candle["time"] <= to_ts
                    ]

                    # Преобразуем в формат UDF
                    result = {
                        "s": "ok",
                        "t": [candle["time"] for candle in filtered_data],
                        "o": [candle["open"] for candle in filtered_data],
                        "h": [candle["high"] for candle in filtered_data],
                        "l": [candle["low"] for candle in filtered_data],
                        "c": [candle["close"] for candle in filtered_data],
                        "v": [candle["volume"] for candle in filtered_data],
                    }
                    logger.info(
                        f"Returning {len(result['t'])} {symbol} data points from Coinglass"
                    )
                    return jsonify(result)
                else:
                    return jsonify({"s": "no_data"})
        except Exception as e:
            logger.error(f"Error getting {symbol} history from Coinglass: {e}")
            return jsonify({"s": "error", "errmsg": str(e)})
    else:
        logger.warning("Coinglass client not available")
        return jsonify({"s": "error", "errmsg": "Coinglass client not initialized"})

    return jsonify({"s": "error", "errmsg": f"Symbol {symbol} not supported"})


@app.route("/api/time")
def udf_time():
    """UDF время сервера"""
    return str(int(datetime.now().timestamp()))


@app.route("/api/search")
def udf_search():
    """UDF поиск символов"""
    query = request.args.get("query", "").upper()
    limit = int(request.args.get("limit", 10))

    results = []

    # CBMA Index
    if "CBMA" in query or "CBMA" in query or "INDEX" in query:
        results.append(
            {
                "symbol": "CBMA",
                "full_name": "CBMA:CBMA",
                "description": "Crypto Bear Market Altcoin Index 14-day MA",
                "exchange": "CBMA",
                "ticker": "CBMA",
                "type": "index",
            }
        )

    # Криптовалюты
    crypto_matches = {
        "BTC": {"symbol": "BTCUSD", "description": "Bitcoin"},
        "ETH": {"symbol": "ETHUSD", "description": "Ethereum"},
        "ADA": {"symbol": "ADAUSD", "description": "Cardano"},
        "SOL": {"symbol": "SOLUSD", "description": "Solana"},
        "DOT": {"symbol": "DOTUSD", "description": "Polkadot"},
    }

    for crypto, info in crypto_matches.items():
        if crypto in query or info["description"].upper() in query:
            results.append(
                {
                    "symbol": info["symbol"],
                    "full_name": f"CRYPTO:{info['symbol']}",
                    "description": info["description"],
                    "exchange": "CRYPTO",
                    "ticker": info["symbol"],
                    "type": "crypto",
                }
            )

    return jsonify(results[:limit])


@app.route("/api/status")
def api_status():
    """Статус API"""
    data_file = Path(__file__).parent.parent.parent / "data" / "CBMA.json"

    return jsonify(
        {
            "server": "CBMA Index UDF Server",
            "version": "2.1.0",
            "status": "running",
            "config": {
                "port": config.api.port,
                "data_file": str(data_file),
                "data_file_exists": data_file.exists(),
            },
            "data_providers": {
                "cbma": cbma_provider is not None,
                "coinglass": coinglass_client is not None,
            },
            "endpoints": [
                "/api/config",
                "/api/symbols",
                "/api/history",
                "/api/time",
                "/api/search",
                "/api/status",
                "/api/crypto/symbols",
                "/api/crypto/ohlcv",
            ],
        }
    )


# =============================================
# ДОПОЛНИТЕЛЬНЫЕ API ENDPOINTS
# =============================================


@app.route("/api/crypto/symbols")
def crypto_symbols():
    """Список криптовалют"""
    if coinglass_client:
        try:
            symbols = coinglass_client.get_available_symbols()
            return jsonify({"symbols": symbols})
        except Exception as e:
            logger.error(f"Error getting crypto symbols: {e}")
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Coinglass client not available"}), 503


@app.route("/api/crypto/ohlcv")
def crypto_ohlcv():
    """OHLCV данные криптовалют"""
    symbol = request.args.get("symbol", "BTC")
    days = int(request.args.get("days", 100))

    if coinglass_client:
        try:
            data = coinglass_client.get_crypto_ohlcv(symbol, days=days)
            return jsonify({"symbol": symbol, "data": data})
        except Exception as e:
            logger.error(f"Error getting crypto OHLCV: {e}")
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Coinglass client not available"}), 503


@app.route("/health")
def health_check():
    """Health check endpoint"""
    return jsonify(
        {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime": "running",
        }
    )


# =============================================
# ИНИЦИАЛИЗАЦИЯ И ЗАПУСК
# =============================================


if __name__ == "__main__":
    # Запуск сервера
    host = config.api.host
    port = config.api.port
    debug = config.api.debug

    logger.info(f"Starting CBMA UDF Server on {host}:{port}")
    logger.info(f"Debug mode: {debug}")

    app.run(host=host, port=port, debug=debug)
