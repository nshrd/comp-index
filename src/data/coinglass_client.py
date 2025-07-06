"""
Coinglass API client for BTC data
"""
import requests
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from config import config

logger = logging.getLogger(__name__)


class CoinglassClient:
    """Клиент для получения данных BTC через Coinglass API"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.coinglass_api_key or ''
        self.base_url = config.coinglass_base_url
        self.request_delay = 0.5  # секунды между запросами

        self.headers = {
            "accept": "application/json"
        }

        # Добавляем ключ только если он есть
        if self.api_key:
            self.headers["CG-API-KEY"] = self.api_key

        # Rate limiting
        self.last_request_time = 0

        # Кэш для списка доступных символов
        self._symbols_cache = {
            "data": None,
            "last_update": 0,
            "cache_duration": 3600  # 1 час
        }

    def _wait_for_rate_limit(self):
        """Обеспечить соблюдение rate limit"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.request_delay:
            sleep_time = self.request_delay - time_since_last
            logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)

    def _make_request(
            self,
            endpoint: str,
            params: Optional[Dict] = None) -> Optional[Any]:
        """Выполнить запрос к API"""
        self._wait_for_rate_limit()

        url = f"{self.base_url}{endpoint}"

        try:
            response = requests.get(url, headers=self.headers,
                                    params=params, timeout=30)
            self.last_request_time = time.time()

            if response.status_code == 200:
                data = response.json()
                # Проверяем разные форматы ответа
                if 'data' in data:
                    return data['data']
                elif isinstance(data, list):
                    return data
                elif data.get('success') is False:
                    logger.error(f"API error: {data.get('msg', 'Unknown error')}")
                    return None
                else:
                    return data
            else:
                logger.error(f"HTTP {response.status_code}: {response.text}")
                return None

        except Exception as e:
            logger.error(f"Request error: {e}")
            return None

    def get_available_symbols(self) -> List[Dict[str, str]]:
        """
        Получить список доступных символов

        Returns:
            Список символов с их описаниями
        """
        # Проверяем кэш
        current_time = time.time()
        if (self._symbols_cache["data"] and (
                current_time - self._symbols_cache["last_update"]) < self._symbols_cache["cache_duration"]):
            return self._symbols_cache["data"]

        # Популярные криптовалюты, доступные на Binance
        popular_symbols = [
            {"symbol": "BTCUSDT", "name": "Bitcoin", "description": "Bitcoin / USDT"},
            {"symbol": "ETHUSDT", "name": "Ethereum", "description": "Ethereum / USDT"},
            {"symbol": "BNBUSDT", "name": "BNB", "description": "BNB / USDT"},
            {"symbol": "ADAUSDT", "name": "Cardano", "description": "Cardano / USDT"},
            {"symbol": "SOLUSDT", "name": "Solana", "description": "Solana / USDT"},
            {"symbol": "XRPUSDT", "name": "XRP", "description": "XRP / USDT"},
            {"symbol": "DOTUSDT", "name": "Polkadot", "description": "Polkadot / USDT"},
            {"symbol": "DOGEUSDT", "name": "Dogecoin", "description": "Dogecoin / USDT"},
            {"symbol": "AVAXUSDT", "name": "Avalanche", "description": "Avalanche / USDT"},
            {"symbol": "SHIBUSDT", "name": "Shiba Inu", "description": "Shiba Inu / USDT"},
            {"symbol": "LINKUSDT", "name": "Chainlink", "description": "Chainlink / USDT"},
            {"symbol": "MATICUSDT", "name": "Polygon", "description": "Polygon / USDT"},
            {"symbol": "LTCUSDT", "name": "Litecoin", "description": "Litecoin / USDT"},
            {"symbol": "BCHUSDT", "name": "Bitcoin Cash", "description": "Bitcoin Cash / USDT"},
            {"symbol": "UNIUSDT", "name": "Uniswap", "description": "Uniswap / USDT"},
            {"symbol": "ATOMUSDT", "name": "Cosmos", "description": "Cosmos / USDT"},
            {"symbol": "ETCUSDT", "name": "Ethereum Classic", "description": "Ethereum Classic / USDT"},
            {"symbol": "FILUSDT", "name": "Filecoin", "description": "Filecoin / USDT"},
            {"symbol": "XLMUSDT", "name": "Stellar", "description": "Stellar / USDT"},
            {"symbol": "TRXUSDT", "name": "TRON", "description": "TRON / USDT"},
            {"symbol": "VETUSDT", "name": "VeChain", "description": "VeChain / USDT"},
            {"symbol": "ICPUSDT", "name": "Internet Computer", "description": "Internet Computer / USDT"},
            {"symbol": "THETAUSDT", "name": "Theta", "description": "Theta / USDT"},
            {"symbol": "EOSUSDT", "name": "EOS", "description": "EOS / USDT"},
            {"symbol": "AAVEUSDT", "name": "Aave", "description": "Aave / USDT"},
            {"symbol": "MKRUSDT", "name": "Maker", "description": "Maker / USDT"},
            {"symbol": "COMPUSDT", "name": "Compound", "description": "Compound / USDT"},
            {"symbol": "SUSHIUSDT", "name": "SushiSwap", "description": "SushiSwap / USDT"},
            {"symbol": "YFIUSDT", "name": "Yearn.finance", "description": "Yearn.finance / USDT"},
            {"symbol": "SNXUSDT", "name": "Synthetix", "description": "Synthetix / USDT"}
        ]

        # Обновляем кэш
        self._symbols_cache["data"] = popular_symbols
        self._symbols_cache["last_update"] = current_time

        logger.info(f"Available symbols cached: {len(popular_symbols)}")
        return popular_symbols

    def search_symbols(self, query: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Поиск символов по запросу

        Args:
            query: Поисковый запрос
            limit: Максимальное количество результатов

        Returns:
            Список найденных символов
        """
        query = query.upper().strip()
        if not query:
            return []

        symbols = self.get_available_symbols()
        results = []

        for symbol_info in symbols:
            symbol = symbol_info["symbol"]
            name = symbol_info["name"].upper()
            description = symbol_info["description"].upper()

            # Поиск по символу, названию или описанию
            if (query in symbol or
                query in name or
                query in description or
                symbol.startswith(query) or
                    name.startswith(query)):
                results.append(symbol_info)

        return results[:limit]

    def get_crypto_ohlcv(self, symbol: str, days: int = 365, interval: str = "4h", from_ts: int = None, to_ts: int = None) -> Optional[List[Dict]]:
        """
        Получить OHLCV данные для любой криптовалюты

        Args:
            symbol: Символ криптовалюты (например, ETHUSDT)
            days: Количество дней истории
            interval: Интервал времени для данных
            from_ts: Начальная метка времени (в секундах)
            to_ts: Конечная метка времени (в секундах)

        Returns:
            Список OHLCV данных
        """
        # Убеждаемся что символ в правильном формате
        if not symbol.endswith('USDT'):
            symbol = symbol.replace('USD', 'USDT')

        # Начинаем с первой доступной даты CBMA: 2017-05-01 00:00:00 UTC
        start_date = datetime(2017, 5, 1, 0, 0, 0)
        start_time = int(start_date.timestamp() * 1000)  # В миллисекундах
        end_time = int(time.time() * 1000)  # Текущее время в миллисекундах

        params = {
            "exchange": "Binance",
            "symbol": symbol.upper(),
            "interval": interval,
            "limit": 4500
        }

        # Если переданы from_ts/to_ts – используем их
        if from_ts is not None:
            params["start_time"] = from_ts * 1000
        if to_ts is not None:
            params["end_time"] = to_ts * 1000

        # Используем spot API для получения точных исторических данных
        endpoint = "/api/spot/price/history"
        logger.info(
            f"Requesting {symbol} data from Coinglass Spot API "
            f"with params: {params}")
        data = self._make_request(endpoint, params)

        # Если данных нет, пробуем без exchange параметра (некоторые рынки так требуют)
        if not data:
            params.pop("exchange", None)
            data = self._make_request(endpoint, params)

        logger.info(
            f"API response for {symbol}: type={type(data)}, "
            f"length={len(data) if isinstance(data, (list, dict)) else 'N/A'}")
        if data and isinstance(data, list) and len(data) > 0:
            logger.info(f"First element: {data[0]}")
        elif data and isinstance(data, dict):
            logger.info(f"Response keys: {list(data.keys())}")
        else:
            logger.warning(f"No data received for {symbol}")
            return None

        if data:
            # Преобразуем в удобный формат
            result = []

            # Проверяем формат данных - возможно это список списков
            if isinstance(data, list) and len(data) > 0:
                # Если первый элемент - список, то это формат [[timestamp, open, high,
                # low, close, volume], ...]
                if isinstance(data[0], list):
                    for candle in data:
                        if len(candle) >= 5:  # Минимум timestamp, o, h, l, c
                            result.append({
                                'timestamp': int(candle[0]),  # В миллисекундах
                                'time': int(candle[0]) // 1000,  # В секундах
                                'open': float(candle[1]),
                                'high': float(candle[2]),
                                'low': float(candle[3]),
                                'close': float(candle[4]),
                                'volume': float(candle[5]) if len(candle) > 5 else 0
                            })
                # Если первый элемент - словарь с ключами time, open, high, low, close
                elif isinstance(data[0], dict):
                    for candle in data:
                        # API возвращает time вместо t, open вместо o и т.д.
                        timestamp = int(candle.get('time', 0))
                        result.append({
                            'timestamp': timestamp,  # В миллисекундах
                            'time': timestamp // 1000,  # В секундах
                            'open': float(candle.get('open', 0)),
                            'high': float(candle.get('high', 0)),
                            'low': float(candle.get('low', 0)),
                            'close': float(candle.get('close', 0)),
                            'volume': float(candle.get('volume_usd', candle.get('volume', 0)))
                        })

            return sorted(result, key=lambda x: x['time']) if result else None

        return None

    def get_btc_ohlcv(self, days: int = 365, interval: str = "4h") -> Optional[List[Dict]]:
        """
        Получить OHLCV данные для BTC (обратная совместимость)

        Args:
            days: Количество дней истории
            interval: Интервал времени для данных

        Returns:
            Список OHLCV данных
        """
        return self.get_crypto_ohlcv("BTCUSDT", days, interval)
