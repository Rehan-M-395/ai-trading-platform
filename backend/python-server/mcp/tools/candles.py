from db.candles import fetch_latest_candles


def get_candles(symbol: str, limit: int = 200) -> dict:
    """Fetch the latest stored one-minute candles for a stock symbol."""
    return fetch_latest_candles(symbol, limit)
