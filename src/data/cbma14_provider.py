"""
CBMA14 Provider - провайдер данных индекса CBMA14
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from .cbma14_calculator import CBMA14Calculator
except ImportError:
    from cbma14_calculator import CBMA14Calculator

logger = logging.getLogger(__name__)


class CBMA14Provider:
    """Провайдер данных CBMA14 индекса"""
    
    def __init__(self, data_file: Path):
        self.data_file = data_file
        # Используем Docker volume path для исходных данных
        self.raw_data_file = Path("/data/data.json")  
        self.calculator = CBMA14Calculator(self.raw_data_file)
        self._symbol_info = None
        
    def get_symbol_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Получить информацию о символе"""
        if symbol != "CBMA14":
            return None
            
        if self._symbol_info is None:
            self._symbol_info = {
                "name": "CBMA14",
                "ticker": "CBMA14", 
                "description": "Coinbase MA14 Index (14-period Moving Average)",
                "type": "index",
                "session": "24x7",
                "timezone": "Etc/UTC",
                "minmov": 1,
                "pricescale": 100,
                "supported_resolutions": ["D"],
                "has_intraday": False,
                "has_daily": True,
                "has_weekly_and_monthly": False,
                "currency_code": "USD"
            }
            
        return self._symbol_info
        
    def get_history(self, symbol: str, from_timestamp: int, to_timestamp: int, ma_period: int = 14) -> Dict[str, Any]:
        """
        Получить историю котировок CBMA14
        
        Args:
            symbol: Символ (должен быть CBMA14)
            from_timestamp: Начальная временная метка
            to_timestamp: Конечная временная метка
            ma_period: Период для скользящей средней (7, 14, 30)
            
        Returns:
            Данные в формате UDF
        """
        if symbol != "CBMA14":
            return {"s": "error", "errmsg": f"Unknown symbol: {symbol}"}
            
        try:
            logger.info(f"Getting CBMA14 history: from={from_timestamp}, to={to_timestamp}, ma_period={ma_period}")
            
            # Сначала пытаемся прочитать готовый файл данных
            if self.data_file.exists():
                logger.info(f"Reading CBMA14 data from {self.data_file}")
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Проверяем формат данных
                if isinstance(data, dict) and 's' in data and data['s'] == 'ok':
                    logger.info(f"Found pre-processed CBMA14 data with {len(data.get('t', []))} points")
                    
                    # Фильтруем данные по временному диапазону
                    if from_timestamp > 0 or to_timestamp > 0:
                        times = data.get('t', [])
                        values = data.get('c', [])
                        
                        filtered_times = []
                        filtered_values = []
                        
                        for i, timestamp in enumerate(times):
                            if i < len(values):
                                # Фильтруем по времени
                                if (from_timestamp == 0 or timestamp >= from_timestamp) and \
                                   (to_timestamp == 0 or timestamp <= to_timestamp):
                                    filtered_times.append(timestamp)
                                    filtered_values.append(values[i])
                        
                        if filtered_times:
                            result = {
                                "s": "ok",
                                "t": filtered_times,
                                "c": filtered_values,
                                "o": filtered_values,  # open = close
                                "h": filtered_values,  # high = close
                                "l": filtered_values,  # low = close
                                "v": [0] * len(filtered_values)  # volume = 0
                            }
                            logger.info(f"Returned {len(filtered_times)} filtered CBMA14 data points")
                            return result
                    else:
                        # Возвращаем все данные
                        logger.info(f"Returning all CBMA14 data ({len(data.get('t', []))} points)")
                        return data
                else:
                    logger.warning("Invalid CBMA14 data format in file")
            else:
                logger.warning(f"CBMA14 data file not found: {self.data_file}")
            
            # Если файл не найден или данных нет, пытаемся получить через калькулятор
            logger.info("Trying to get CBMA14 data via calculator...")
            history_data = self.calculator.get_cbma14_history(from_timestamp, to_timestamp, ma_period)
            
            if not history_data:
                logger.warning("No CBMA14 history data returned from calculator")
                return {"s": "no_data"}
            
            logger.info(f"Got {len(history_data)} CBMA14 data points from calculator")
            
            # Преобразуем в формат UDF с сглаживанием для устранения резких скачков
            times = []
            raw_values = []
            
            # Сначала собираем все исходные значения
            for i, item in enumerate(history_data):
                try:
                    if isinstance(item, dict) and 'timestamp' in item and 'cbma14' in item:
                        times.append(int(item['timestamp']))
                        raw_values.append(float(item['cbma14']))
                    else:
                        logger.warning(f"Invalid CBMA14 data item at index {i}: {item}")
                except (KeyError, TypeError, ValueError) as e:
                    logger.warning(f"Error processing CBMA14 item at index {i}: {e}")
                    continue
            
            if not times:
                logger.warning("No valid CBMA14 data after processing")
                return {"s": "no_data"}
            
            # Применяем простое сглаживание (3-точечное скользящее среднее)
            smoothed_values = []
            for i in range(len(raw_values)):
                if i == 0:
                    # Первая точка - без сглаживания
                    smoothed_values.append(raw_values[i])
                elif i == len(raw_values) - 1:
                    # Последняя точка - без сглаживания
                    smoothed_values.append(raw_values[i])
                else:
                    # Средние точки - среднее из 3 точек
                    smoothed = (raw_values[i-1] + raw_values[i] + raw_values[i+1]) / 3
                    smoothed_values.append(smoothed)
            
            logger.info(f"Applied smoothing to {len(smoothed_values)} CBMA14 values")
            
            result = {
                "s": "ok",
                "t": times,
                "c": smoothed_values,  # close values (для линейного графика используем только close)
                "o": smoothed_values,  # open = close
                "h": smoothed_values,  # high = close  
                "l": smoothed_values,  # low = close
                "v": [0] * len(smoothed_values)  # volume = 0
            }
            
            logger.info(f"Returned {len(times)} valid CBMA14 data points for period {from_timestamp}-{to_timestamp}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting CBMA14 history: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"s": "error", "errmsg": str(e)}
    
    def search_symbols(self, query: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Поиск символов"""
        query = query.upper()
        results = []
        
        if "CBMA14".startswith(query) or query in "CBMA14" or "MA14" in query or "COINBASE" in query:
            results.append({
                "symbol": "CBMA14",
                "full_name": "CBMA14",
                "description": "Coinbase MA14 Index (14-period Moving Average)",
                "exchange": "",
                "ticker": "CBMA14",
                "type": "index"
            })
        
        return results[:limit]
    
    def get_latest_value(self) -> Optional[float]:
        """Получить последнее значение CBMA14"""
        try:
            latest = self.calculator.get_latest_cbma14()
            return latest['cbma14'] if latest else None
        except Exception as e:
            logger.error(f"Error getting latest CBMA14 value: {e}")
            return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Получить статистику по CBMA14"""
        try:
            return self.calculator.get_statistics()
        except Exception as e:
            logger.error(f"Error getting CBMA14 statistics: {e}")
            return {}
    
    def refresh_data(self) -> bool:
        """Обновить данные CBMA14"""
        try:
            # Пересчитываем данные
            processed_data = self.calculator.process_data(use_finance=False)
            
            if processed_data:
                # Экспортируем в файл для совместимости
                success = self.calculator.export_to_json(self.data_file)
                if success:
                    logger.info(f"CBMA14 data refreshed: {len(processed_data)} points")
                return success
            else:
                logger.warning("No data to refresh")
                return False
                
        except Exception as e:
            logger.error(f"Error refreshing CBMA14 data: {e}")
            return False 