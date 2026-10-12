import os

import json

from dotenv import load_dotenv
from groq import AsyncGroq
import asyncio
from pathlib import Path

from fastmcp import Client

MCP_SERVER_PATH = Path(__file__).resolve().parents[2] / "mcp" / "server.py"

load_dotenv()


SYSTEM_PROMPT = (
    "When analyzing a stock trend, call analyze_trend directly "
    "with the stock symbol and limit=200. The tool fetches its own "
    "candles and performs the analysis. Never call get_candles "
    "just to pass its raw candle array into analyze_trend. "
    "Explain the returned analysis without inventing market data."
)


async def ask_groq(messages: list[dict[str, str]]) -> str:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured on the Python server."
        )

    client = AsyncGroq(api_key=api_key)

    # Keep your existing tool-inventory feature working.
    async with Client(MCP_SERVER_PATH) as mcp_client:
        mcp_tools = await mcp_client.list_tools()
        groq_tools = convert_mcp_tools_to_groq(mcp_tools)

        latest_message = next(
            (
                message["content"]
                for message in reversed(messages)
                if message["role"] == "user"
            ),
            "",
        )

        question = latest_message.lower()

        if (
            "tool" in question
            and any(
                word in question
                for word in ["available", "have", "exposed", "list"]
            )
        ):
            lines = [
                "These are the MCP tools currently exposed to Jarvis:"
            ]

            for tool in mcp_tools:
                lines.append(
                    f"- {tool.name}: "
                    f"{tool.description or 'No description provided.'}"
                )

            return "\n".join(lines)

        # Conversation sent to Groq
        conversation = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *messages[-6:],
        ]

        # Allow multiple tool calls, but prevent infinite loops.
        for _ in range(8):
            response = await client.chat.completions.create(
                model=os.getenv(
                    "GROQ_MODEL",
                    "openai/gpt-oss-120b",
                ),
                messages=conversation,
                tools=groq_tools,
                tool_choice="auto",
                max_tokens=1200,
            )

            assistant_message = response.choices[0].message

            # Groq has finished and returned its final answer.
            if not assistant_message.tool_calls:
                if assistant_message.content:
                    return assistant_message.content

                raise RuntimeError("Groq returned an empty response.")

            # Preserve Groq's tool-call request in the conversation.
            conversation.append(
                assistant_message.model_dump(exclude_none=True)
            )

            # Execute each requested MCP tool.
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name

                try:
                    arguments = json.loads(
                        tool_call.function.arguments or "{}"
                    )

                    # Only allow tools actually exposed by the MCP server.
                    allowed_tools = {
                        tool.name for tool in mcp_tools
                    }

                    if tool_name not in allowed_tools:
                        raise ValueError(
                            f"Tool '{tool_name}' is not available."
                        )

                    result = await mcp_client.call_tool(
                        tool_name,
                        arguments,
                    )

                    if result.is_error:
                        tool_output = {
                            "error": str(result)
                        }
                    else:
                        tool_output = result.data

                    result_text = json.dumps(
                        tool_output,
                        default=str,
                    )

                except Exception as error:
                    result_text = json.dumps({
                        "error": str(error)
                    })

                # Send the tool result back to Groq.
                conversation.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_text,
                })

        raise RuntimeError(
            "Groq exceeded the maximum number of tool-call rounds."
        )



async def get_mcp_tools():
    async with Client(MCP_SERVER_PATH) as client:
        tools = await client.list_tools()

        for tool in tools:
            print(f"Tool: {tool.name}")
            print(f"Description: {tool.description}")
            print(f"Input schema: {tool.inputSchema}")
            print("-" * 40)

        return tools


def convert_mcp_tools_to_groq(mcp_tools):
    groq_tools = []

    for tool in mcp_tools:
        groq_tools.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description or "",
                "parameters": tool.inputSchema,
            },
        })

    return groq_tools



if __name__ == "__main__":
    async def main():
        async with Client(MCP_SERVER_PATH) as mcp_client:
            mcp_tools = await mcp_client.list_tools()
            groq_tools = convert_mcp_tools_to_groq(mcp_tools)

            print("Available MCP tools:")
            for tool in mcp_tools:
                print(f"- {tool.name}: {tool.description}")

            print("\nTesting trend analysis with 200 candles...")

            result = await mcp_client.call_tool(
                "analyze_trend",
                {
                    "symbol": "AAPL",
                    "limit": 200,
                },
            )

            print("\nAnalysis result:")
            print(result.data)

            print("\nGroq-compatible tools:")
            print(json.dumps(groq_tools, indent=2, default=str))

    asyncio.run(main())
