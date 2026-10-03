import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env
load_dotenv()

# Get API key
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is not set in .env")

# Create Groq client
client = Groq(api_key=api_key)


def ask_groq(message: str):
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are JARVIS, an AI assistant for a trading platform."
            },
            {
                "role": "user",
                "content": message
            }
        ]
    )

    return response.choices[0].message.content

ans = ask_groq("who is gabbie carter and whats her current age. what is her main work")
print(ans)
