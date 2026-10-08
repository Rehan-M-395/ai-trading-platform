"""Standalone stdio MCP server for the trading platform's analysis tools.

Run from ``backend/python-server`` with ``python mcp/server.py``.
"""

import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parents[1]
TOOLS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVER_ROOT))
sys.path.insert(0, str(TOOLS_ROOT))

from fastmcp import FastMCP
from tools.candles import get_candles
from tools.fibonacci import calculate_fibonacci_levels
from tools.support_resistance import find_support_resistance_zones
from tools.trend import analyze_trend

mcp = FastMCP("ai-trading")

mcp.tool()(get_candles)
mcp.tool()(analyze_trend)
mcp.tool()(find_support_resistance_zones)
mcp.tool()(calculate_fibonacci_levels)


if __name__ == "__main__":
    mcp.run(transport="stdio")
