
import asyncio
from pathlib import Path
from fastmcp import Client

SERVER_PATH = Path(__file__).resolve().parent / "server.py"


async def main():
    async with Client(SERVER_PATH) as client:
        print("Connected to MCP server")

        # Step 1: Fetch candles
        print("\nFetching candles...")

        candle_result = await client.call_tool(
            "get_candles",
            {
                "symbol": "AAPL",
                "limit": 200
            }
        )

        if candle_result.is_error:
            print("Failed to fetch candles:")
            print(candle_result)
            return

        data = candle_result.data
        candles = data["candles"]

        print(f"Fetched {len(candles)} candles")

        if not candles:
            print("No candles available for analysis.")
            return

        # Step 2: Analyze the fetched candles
        print("\nAnalyzing trend...")

        trend_result = await client.call_tool(
            "analyze_trend",
            {
                "candles": candles
            }
        )

        if trend_result.is_error:
            print("Trend analysis failed:")
            print(trend_result)
            return

        # Step 3: Display the result
        print("\nTrend analysis result:")
        print(trend_result)


if __name__ == "__main__":
    asyncio.run(main())
