
from typing import Any

from db.candles import fetch_latest_candles
from analysis.market_structure import detect_trend
from analysis.trend import detect_trend_phases
from models.candles import Candle


def analyze_trend(symbol: str, limit: int = 200) -> dict[str, Any]:
    """Fetch candles and analyze trend without sending raw candles through Groq."""

    if not 1 <= limit <= 200:
        raise ValueError("limit must be between 1 and 200")

    # Fetch all requested candles directly from the database.
    data = fetch_latest_candles(symbol, limit)
    candles_data = data.get("candles", []) if isinstance(data, dict) else data

    if not candles_data:
        raise ValueError(f"No candles found for symbol: {symbol}")

    parsed_candles = [
        Candle.model_validate(candle)
        for candle in candles_data
    ]

    # Run your existing analysis functions on all fetched candles.
    result = detect_trend(parsed_candles)
    swings = result.get("swings", [])
    phases = detect_trend_phases(swings)

    # Return a compact result to Groq.
    structure = result.get("structure", [])

    if isinstance(structure, list):
        structure = structure[-20:]
    elif isinstance(structure, str):
        structure = structure[-1000:]

    return {
        "symbol": symbol.upper(),
        "candles_analyzed": len(parsed_candles),
        "trend": result.get("trend"),
        "state": result.get("state"),
        "strength": result.get("strength"),
        "confidence": result.get("confidence"),
        "structure": structure,
        "latest_swing": result.get("latest_swing"),
        "recent_swings": swings[-10:],
        "phases": phases,
    }
