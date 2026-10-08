import os

from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

SYSTEM_PROMPT = (
    "You are Jarvis, a helpful assistant in a U.S. stock trading platform. "
    "Explain market concepts clearly. Do not claim to see the selected chart or live "
    "market data unless it is included in the conversation. Do not present responses "
    "as guaranteed financial advice."
)


async def ask_groq(messages: list[dict[str, str]]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured on the Python server.")

    client = AsyncGroq(api_key=api_key)
    response = await client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, *messages],
        max_tokens=1200,
    )
    reply = response.choices[0].message.content
    if not reply:
        raise RuntimeError("Groq returned an empty response.")
    return reply
