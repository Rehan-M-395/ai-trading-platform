from fastapi import APIRouter
from models.candles import AnalysisRequest
from services.AIanalysis import find_support_resistance

router = APIRouter()

@router.post("/analyse")
async def analyse(data: AnalysisRequest):

    print("Received:", len(data.candles))

    zones = find_support_resistance(data.candles)
    print(zones)

    return zones