import pandas as pd
import json
import pathlib
import time
import datetime as dt
import logging

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SRC = pathlib.Path("/data/data.json")
DST = pathlib.Path("/data/CBMA14.json")
MA = 14

def main():
    """Строит MA14 индекс из data.json и сохраняет в формате UDF"""
    try:
        # Читаем исходные данные
        logger.info(f"Читаем данные из {SRC}")
        df = pd.read_json(SRC, orient="index")
        df.index = pd.to_datetime(df.index)
        
        # Берем колонку Overall (или Finance как fallback)
        if "Overall" in df.columns:
            rank = df["Overall"].astype(float)
            logger.info("Используем колонку Overall")
        elif "Finance" in df.columns:
            rank = df["Finance"].astype(float)
            logger.info("Используем колонку Finance (Overall не найден)")
        else:
            logger.error("Не найдены колонки Overall или Finance")
            return
        
        # Вычисляем MA14
        ma14 = rank.rolling(MA, min_periods=1).mean().dropna()
        logger.info(f"Вычислена MA{MA} для {len(ma14)} точек")
        
        # Формируем данные в формате UDF
        t = [int(ts.timestamp()) for ts in ma14.index]  # секунды с эпохи
        v = ma14.round(2).tolist()
        
        # UDF формат для history endpoint
        payload = {
            "s": "ok",
            "t": t,
            "o": v,  # open
            "h": v,  # high
            "l": v,  # low
            "c": v,  # close
            "v": [0] * len(v)  # volume (для индекса = 0)
        }
        
        # Сохраняем
        DST.parent.mkdir(parents=True, exist_ok=True)
        DST.write_text(json.dumps(payload))
        logger.info(f"Обновлен {DST} в {dt.datetime.utcnow()}")
        
    except Exception as e:
        logger.error(f"Ошибка при построении индекса: {e}")
        raise

if __name__ == "__main__":
    main() 