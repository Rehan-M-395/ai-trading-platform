import os

from dotenv import load_dotenv

load_dotenv()


def fetch_latest_candles(symbol: str, limit: int = 200) -> dict:
    """Fetch chronological one-minute candle rows for a stock from PostgreSQL."""
    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol:
        raise ValueError("symbol cannot be empty")
    if not 1 <= limit <= 1000:
        raise ValueError("limit must be between 1 and 1000")

    database_url = os.getenv("DATABASE_URL") or os.getenv("DIRECT_POSTGRES_URL")
    if not database_url:
        raise RuntimeError("Set DATABASE_URL for the Python MCP server to read candles.")

    try:
        import psycopg2
    except ImportError as error:
        raise RuntimeError("Install psycopg2-binary to enable the candles tool.") from error

    connection = psycopg2.connect(database_url)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM stocks WHERE symbol = %s", (normalized_symbol,))
            stock = cursor.fetchone()
            if stock is None:
                return {"symbol": normalized_symbol, "candles": [], "count": 0}

            cursor.execute(
                """
                SELECT candle_time, open, high, low, close, volume, vwap, trade_count
                FROM candles_data
                WHERE stock_id = %s
                ORDER BY candle_time DESC
                LIMIT %s
                """,
                (stock[0], limit),
            )
            rows = cursor.fetchall()
    finally:
        connection.close()

    candles = [
        {
            "timestamp": row[0].isoformat(),
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]),
            "vwap": float(row[6]) if row[6] is not None else None,
            "trade_count": row[7],
        }
        for row in reversed(rows)
    ]
    return {"symbol": normalized_symbol, "candles": candles, "count": len(candles)}
