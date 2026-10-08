from fastapi import APIRouter
from models.candles import AnalysisRequest
from analysis.support_resistance import find_support_resistance
from analysis.market_structure import detect_trend

router = APIRouter()

@router.post("/analyse")
async def analyse(data: AnalysisRequest):

    print("Received:", len(data.candles))

    zones = find_support_resistance(data.candles)
    print(zones)

    return zones


@router.post("/trendline")
@router.post("/detect_tren", include_in_schema=False)
async def detect_trend_route(data: AnalysisRequest):
    print("received:", len(data.candles))
    trendline = detect_trend(data.candles)
    print(trendline)
    return trendline
