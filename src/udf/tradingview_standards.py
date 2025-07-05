"""
Стандартизированные форматы данных для TradingView UDF
Обеспечивает полную совместимость с официальной спецификацией TradingView
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import time


class SymbolType(Enum):
    """Типы символов согласно TradingView"""
    STOCK = "stock"
    INDEX = "index"
    CRYPTO = "crypto"
    FOREX = "forex"
    FUTURES = "futures"
    BONDS = "bonds"


class PriceScaleMode(Enum):
    """Режимы масштабирования цен"""
    NORMAL = 0
    LOGARITHMIC = 1
    PERCENTAGE = 2
    INDEXED_TO_100 = 3


@dataclass
class TradingViewSymbolInfo:
    """Стандартная информация о символе для TradingView"""
    
    # Основные поля
    name: str
    ticker: str
    description: str
    type: str
    session: str = "24x7"
    timezone: str = "Etc/UTC"
    
    # Настройки отображения
    minmov: int = 1
    pricescale: int = 100
    minmove2: int = 0
    
    # Поддерживаемые разрешения
    supported_resolutions: List[str] = None
    has_intraday: bool = True
    has_daily: bool = True
    has_weekly_and_monthly: bool = True
    has_empty_bars: bool = True
    has_no_volume: bool = False
    
    # Точность
    volume_precision: int = 8
    currency_code: str = "USD"
    
    # Дополнительные поля
    exchange: str = ""
    listed_exchange: str = ""
    full_name: str = ""
    
    def __post_init__(self):
        if self.supported_resolutions is None:
            self.supported_resolutions = ["240", "1D", "1W", "1M"]
        if not self.full_name:
            self.full_name = self.name

    def to_dict(self) -> Dict[str, Any]:
        """Конвертация в словарь для UDF ответа"""
        return {
            "name": self.name,
            "ticker": self.ticker,
            "description": self.description,
            "type": self.type,
            "session": self.session,
            "timezone": self.timezone,
            "supported_resolutions": self.supported_resolutions,
            "has_intraday": self.has_intraday,
            "has_daily": self.has_daily,
            "has_weekly_and_monthly": self.has_weekly_and_monthly,
            "has_empty_bars": self.has_empty_bars,
            "has_no_volume": self.has_no_volume,
            "minmov": self.minmov,
            "pricescale": self.pricescale,
            "minmove2": self.minmove2,
            "volume_precision": self.volume_precision,
            "currency_code": self.currency_code,
            "exchange": self.exchange,
            "listed_exchange": self.listed_exchange,
            "full_name": self.full_name
        }


@dataclass
class TradingViewConfig:
    """Стандартная конфигурация UDF сервера"""
    
    supports_search: bool = True
    supports_group_request: bool = False
    supports_marks: bool = False
    supports_timescale_marks: bool = False
    supports_time: bool = True
    supports_streaming: bool = True
    
    supported_resolutions: List[str] = None
    exchanges: List[Dict[str, str]] = None
    symbols_types: List[Dict[str, str]] = None
    
    def __post_init__(self):
        if self.supported_resolutions is None:
            self.supported_resolutions = ["240", "1D", "1W", "1M"]
            
        if self.exchanges is None:
            self.exchanges = [
                {"value": "", "name": "All Exchanges", "desc": ""},
                {"value": "Binance", "name": "Binance", "desc": "Binance Exchange"},
                {"value": "Coinbase", "name": "Coinbase", "desc": "Coinbase Exchange"}
            ]
            
        if self.symbols_types is None:
            self.symbols_types = [
                {"name": "All types", "value": ""},
                {"name": "Stock", "value": "stock"},
                {"name": "Index", "value": "index"},
                {"name": "Crypto", "value": "crypto"},
                {"name": "Forex", "value": "forex"}
            ]

    def to_dict(self) -> Dict[str, Any]:
        """Конвертация в словарь для UDF ответа"""
        return {
            "supports_search": self.supports_search,
            "supports_group_request": self.supports_group_request,
            "supports_marks": self.supports_marks,
            "supports_timescale_marks": self.supports_timescale_marks,
            "supports_time": self.supports_time,
            "supports_streaming": self.supports_streaming,
            "supported_resolutions": self.supported_resolutions,
            "exchanges": self.exchanges,
            "symbols_types": self.symbols_types
        }


class TradingViewFormatter:
    """Утилиты для форматирования данных согласно TradingView стандартам"""
    
    @staticmethod
    def create_cbma14_symbol() -> TradingViewSymbolInfo:
        """Создать стандартную информацию о символе CBMA14"""
        return TradingViewSymbolInfo(
            name="CBMA14",
            ticker="CBMA14",
            description="Coinbase Moving Average Index (Dynamic MA)",
            type=SymbolType.INDEX.value,
            session="24x7",
            timezone="Etc/UTC",
            minmov=1,
            pricescale=100000000,  # 8 знаков после запятой для точности
            supported_resolutions=["1D", "1W", "1M"],
            has_intraday=False,
            has_daily=True,
            has_weekly_and_monthly=True,
            has_no_volume=True,  # Индекс не имеет объема
            volume_precision=0,
            exchange="",
            listed_exchange="",
            full_name="Coinbase Moving Average Index"
        )
    
    @staticmethod
    def create_crypto_symbol(symbol: str, base_asset: str = None) -> TradingViewSymbolInfo:
        """Создать стандартную информацию о криптовалютном символе"""
        if not base_asset:
            base_asset = symbol.replace("USDT", "").replace("USD", "")
        
        return TradingViewSymbolInfo(
            name=symbol,
            ticker=symbol,
            description=f"{base_asset} / USD",
            type=SymbolType.CRYPTO.value,
            session="24x7",
            timezone="Etc/UTC",
            minmov=1,
            pricescale=100,  # 2 знака после запятой для цен
            supported_resolutions=["240", "1D", "1W", "1M"],
            has_intraday=True,
            has_daily=True,
            has_weekly_and_monthly=True,
            has_no_volume=False,
            volume_precision=8,
            exchange="Binance",
            listed_exchange="Binance",
            full_name=f"{base_asset} / USD",
            currency_code="USD"
        )
    
    @staticmethod
    def create_stock_symbol(symbol: str, company_name: str = None) -> TradingViewSymbolInfo:
        """Создать стандартную информацию о фондовом символе"""
        if not company_name:
            company_name = symbol
        
        return TradingViewSymbolInfo(
            name=symbol,
            ticker=symbol,
            description=company_name,
            type=SymbolType.STOCK.value,
            session="0900-1600",  # Стандартная торговая сессия
            timezone="America/New_York",
            minmov=1,
            pricescale=100,
            supported_resolutions=["240", "1D", "1W", "1M"],
            has_intraday=True,
            has_daily=True,
            has_weekly_and_monthly=True,
            has_no_volume=False,
            volume_precision=0,
            exchange="NYSE",
            listed_exchange="NYSE",
            full_name=company_name,
            currency_code="USD"
        )
    
    @staticmethod
    def format_history_response(
        data: List[Dict[str, Any]], 
        status: str = "ok",
        next_time: Optional[int] = None
    ) -> Dict[str, Any]:
        """Форматировать ответ history согласно UDF спецификации"""
        if status != "ok" or not data:
            return {
                "s": status,
                "errmsg": "No data available" if status == "no_data" else None
            }
        
        # Сортируем данные по времени
        sorted_data = sorted(data, key=lambda x: x.get('time', 0))
        
        response = {
            "s": "ok",
            "t": [item['time'] for item in sorted_data],
            "c": [item.get('close', item.get('value', 0)) for item in sorted_data]
        }
        
        # Добавляем OHLC данные если доступны
        if any('open' in item for item in sorted_data):
            response.update({
                "o": [item.get('open', item.get('close', item.get('value', 0))) for item in sorted_data],
                "h": [item.get('high', item.get('close', item.get('value', 0))) for item in sorted_data],
                "l": [item.get('low', item.get('close', item.get('value', 0))) for item in sorted_data]
            })
        
        # Добавляем объем если доступен
        if any('volume' in item for item in sorted_data):
            response["v"] = [item.get('volume', 0) for item in sorted_data]
        
        # Добавляем next_time если есть еще данные
        if next_time:
            response["nextTime"] = next_time
        
        return response
    
    @staticmethod
    def format_search_response(
        query: str,
        symbols: List[TradingViewSymbolInfo],
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """Форматировать ответ search согласно UDF спецификации"""
        results = []
        query_upper = query.upper()
        
        for symbol in symbols:
            # Проверяем соответствие запросу
            if (query_upper in symbol.name.upper() or 
                query_upper in symbol.description.upper() or
                query_upper in symbol.ticker.upper()):
                
                results.append({
                    "symbol": symbol.ticker,
                    "full_name": symbol.full_name,
                    "description": symbol.description,
                    "exchange": symbol.exchange,
                    "ticker": symbol.ticker,
                    "type": symbol.type
                })
                
                if len(results) >= limit:
                    break
        
        return results
    
    @staticmethod
    def format_symbol_info_response(
        symbols: List[TradingViewSymbolInfo]
    ) -> Dict[str, List[Any]]:
        """Форматировать ответ symbol_info согласно UDF спецификации"""
        if not symbols:
            return {}
        
        return {
            "symbol": [s.ticker for s in symbols],
            "description": [s.description for s in symbols],
            "exchange-listed": [s.listed_exchange for s in symbols],
            "exchange-traded": [s.exchange for s in symbols],
            "minmovement": [s.minmov for s in symbols],
            "minmovement2": [s.minmove2 for s in symbols],
            "pricescale": [s.pricescale for s in symbols],
            "has-dwm": [s.has_weekly_and_monthly for s in symbols],
            "has-intraday": [s.has_intraday for s in symbols],
            "has-no-volume": [s.has_no_volume for s in symbols],
            "type": [s.type for s in symbols],
            "timezone": [s.timezone for s in symbols],
            "session-regular": [s.session for s in symbols],
            "supported_resolutions": [s.supported_resolutions for s in symbols]
        }
    
    @staticmethod
    def get_server_time() -> str:
        """Получить время сервера в формате UDF"""
        return str(int(time.time()))
    
    @staticmethod
    def validate_resolution(resolution: str) -> bool:
        """Проверить валидность разрешения"""
        valid_resolutions = ["1", "5", "15", "30", "60", "240", "1D", "1W", "1M"]
        return resolution in valid_resolutions
    
    @staticmethod
    def normalize_resolution(resolution: str) -> str:
        """Нормализовать разрешение к стандартному формату"""
        resolution_map = {
            "1": "1",
            "5": "5", 
            "15": "15",
            "30": "30",
            "60": "60",
            "240": "240",
            "4H": "240",
            "D": "1D",
            "1D": "1D",
            "W": "1W",
            "1W": "1W",
            "M": "1M",
            "1M": "1M"
        }
        return resolution_map.get(resolution, resolution)


# Предопределенные символы для использования
PREDEFINED_SYMBOLS = {
    "CBMA14": TradingViewFormatter.create_cbma14_symbol(),
    "BTCUSDT": TradingViewFormatter.create_crypto_symbol("BTCUSDT", "Bitcoin"),
    "ETHUSDT": TradingViewFormatter.create_crypto_symbol("ETHUSDT", "Ethereum"),
    "BNBUSDT": TradingViewFormatter.create_crypto_symbol("BNBUSDT", "Binance Coin"),
}

# Стандартная конфигурация
STANDARD_CONFIG = TradingViewConfig() 