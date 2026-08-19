from fastapi import APIRouter
from models.candles import AnalysisRequest

router = APIRouter()

@router.post("/analyse")
async def analyse(data: AnalysisRequest):
    print("Received:", len(data.candles))

    return {
        "zones": []
    }