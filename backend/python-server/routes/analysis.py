from fastapi import APIRouter
from models.candles import AnalysisRequest
from services.AIanalysis import find_support_resistance
from AIanalysis.functions import detect_trend

router = APIRouter()

@router.post("/analyse")
async def analyse(data: AnalysisRequest):

    print("Received:", len(data.candles))

    zones = find_support_resistance(data.candles)
    print(zones)

    return zones


@router.post("/detect_tren")
async def Aianalyse(data: AnalysisRequest):
    print("received:", len(data.candles))
    trendline = detect_trend(data.candles)
    print(trendline)
    return trendline
