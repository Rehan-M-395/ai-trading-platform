from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.groq.client import ask_groq

router = APIRouter(prefix="/jarvis", tags=["Jarvis"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=50)


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):
    try:
        reply = await ask_groq(
            [{"role": item.role, "content": item.content} for item in data.messages]
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="Jarvis could not reach Groq.") from error

    return ChatResponse(reply=reply)
