# Python server

## Start the HTTP API

From this directory, install dependencies and configure `GROQ_API_KEY`:

```powershell
python -m pip install -r requirements.txt
```

Then run:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 5001
```

The Jarvis endpoint is `POST /jarvis/chat`. The existing analysis endpoints remain
registered on the same FastAPI app.

## Start the MCP server

Configure `DATABASE_URL` (or `DIRECT_POSTGRES_URL`) for PostgreSQL access, then run
this in a separate process from this directory:

```powershell
python mcp/server.py
```

The stdio MCP server exposes `get_candles`, `analyze_trend`,
`find_support_resistance_zones`, and `calculate_fibonacci_levels`. `get_candles`
returns the latest stored one-minute rows in chronological order with timezone-aware
timestamps. The analysis tools accept candle data and reuse the algorithms under
`analysis/`.
