import json

from models.candles import Candle
from AIanalysis.functions import detect_trend


if __name__ == "__main__":

    # =========================================================
    # LOAD CANDLES
    # =========================================================

    with open("AIanalysis/candles.json", "r") as file:
        data = json.load(file)

    candles = [
        Candle(
            timestamp=candle["candle_time"],
            open=candle["open"],
            high=candle["high"],
            low=candle["low"],
            close=candle["close"],
            volume=candle["volume"]
        )
        for candle in data
    ]

    print(f"\nReceived {len(candles)} candles")

    # =========================================================
    # RUN TREND ANALYSIS
    # =========================================================

    result = detect_trend(candles)

    # =========================================================
    # TREND
    # =========================================================

    print("\n========================================")
    print("         TREND ANALYSIS")
    print("========================================")

    print("Trend:", result["trend"])
    print("State:", result["state"])
    print("Strength:", result["strength"])

    # =========================================================
    # STRUCTURE
    # =========================================================

    print("\n========================================")
    print("       MARKET STRUCTURE")
    print("========================================")

    print("Structure:")

    if result["structure"]:
        print(" → ".join(result["structure"]))
    else:
        print("No structure detected")

    # =========================================================
    # SWINGS
    # =========================================================

    print("\n========================================")
    print("          SWING POINTS")
    print("========================================")

    for swing in result["swings"]:

        print(
            f"{swing['type'].upper():4} | "
            f"Index: {swing['index']:3} | "
            f"Price: {swing['price']:.2f} | "
            f"Structure: {swing['structure']}"
        )

    # =========================================================
    # LATEST SWING
    # =========================================================

    print("\n========================================")
    print("          LATEST SWING")
    print("========================================")

    latest = result["latest_swing"]

    if latest:

        print("Type:", latest["type"])
        print("Price:", latest["price"])
        print("Index:", latest["index"])
        print("Structure:", latest["structure"])

    else:

        print("No latest swing")