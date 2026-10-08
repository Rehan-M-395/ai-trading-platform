from typing import Any

from analysis.support_resistance import find_support_resistance
from models.candles import Candle


def find_support_resistance_zones(candles: list[dict[str, Any]]) -> dict:
    """Calculate support and resistance zones from OHLCV candles."""
    if not candles:
        raise ValueError("At least one candle is required")
    parsed = [Candle.model_validate(candle) for candle in candles]
    return find_support_resistance(parsed)
