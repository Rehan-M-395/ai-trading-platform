import asyncio
from pathlib import Path

from fastmcp import Client


SERVER_PATH = Path(__file__).resolve().parent / "server.py"


async def main():
    async with Client(SERVER_PATH) as client:

        print("Connected to MCP server")

        # Check available tools
        tools = await client.list_tools()

        print("\nAvailable tools:")
        for tool in tools:
            print("-", tool.name)

        # Call get_candles
        print("\nCalling get_candles...")

        result = await client.call_tool(
            "get_candles",
            {
                "symbol": "AAPL",
                "limit": 10
            }
        )

        print("\nResult:")
        print(result)


if __name__ == "__main__":
    asyncio.run(main())