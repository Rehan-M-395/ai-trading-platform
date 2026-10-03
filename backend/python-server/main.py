from fastapi import FastAPI
from routes.analysis import router as analysis_router
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

client = Groq(api_key=api_key)

print("Groq client initialized",client)

# app = FastAPI()

# app.include_router(analysis_router)