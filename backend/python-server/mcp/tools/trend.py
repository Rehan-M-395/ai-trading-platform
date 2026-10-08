from typing import Any

from analysis.market_structure import detect_trend
from analysis.trend import detect_trend_phases
from models.candles import Candle


def analyze_trend(candles: list[dict[str, Any]]) -> dict:
    """Analyze provided OHLCV candles for trend and market-structure phases."""
    parsed = [Candle.model_validate(candle) for candle in candles]
    result = detect_trend(parsed)
    phases = detect_trend_phases(result.get("swings", []))
    return {**result, **phases}
