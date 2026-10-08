from typing import List, Dict, Any


def detect_swings(candles, lookback=2):
    """
    Detect swing highs and swing lows.

    A swing high:
        current high > highs of candles on both sides

    A swing low:
        current low < lows of candles on both sides

    lookback=2 means:
        2 candles before + current + 2 candles after
    """

    swings = []

    for i in range(lookback, len(candles) - lookback):

        current = candles[i]

        # -------------------------
        # Check Swing High
        # -------------------------
        is_swing_high = True

        for j in range(1, lookback + 1):
            if current.high <= candles[i - j].high:
                is_swing_high = False
                break

            if current.high <= candles[i + j].high:
                is_swing_high = False
                break

        # -------------------------
        # Check Swing Low
        # -------------------------
        is_swing_low = True

        for j in range(1, lookback + 1):
            if current.low >= candles[i - j].low:
                is_swing_low = False
                break

            if current.low >= candles[i + j].low:
                is_swing_low = False
                break

        if is_swing_high:
            swings.append({
                "type": "high",
                "price": current.high,
                "index": i,
                "timestamp": current.timestamp
            })

        elif is_swing_low:
            swings.append({
                "type": "low",
                "price": current.low,
                "index": i,
                "timestamp": current.timestamp
            })

    return swings


def classify_swings(swings):
    """
    Compare every swing with the previous swing
    of the SAME type.

    High:
        current > previous = HH
        current < previous = LH

    Low:
        current > previous = HL
        current < previous = LL
    """

    classified = []

    previous_high = None
    previous_low = None

    for swing in swings:

        current_price = swing["price"]

        # --------------------------------
        # Swing High
        # --------------------------------
        if swing["type"] == "high":

            if previous_high is None:

                label = "H"

            elif current_price > previous_high["price"]:

                label = "HH"

            elif current_price < previous_high["price"]:

                label = "LH"

            else:

                label = "EH"  # Equal High

            classified.append({
                **swing,
                "structure": label,
                "previous_price": (
                    previous_high["price"]
                    if previous_high
                    else None
                )
            })

            previous_high = swing

        # --------------------------------
        # Swing Low
        # --------------------------------
        elif swing["type"] == "low":

            if previous_low is None:

                label = "L"

            elif current_price > previous_low["price"]:

                label = "HL"

            elif current_price < previous_low["price"]:

                label = "LL"

            else:

                label = "EL"  # Equal Low

            classified.append({
                **swing,
                "structure": label,
                "previous_price": (
                    previous_low["price"]
                    if previous_low
                    else None
                )
            })

            previous_low = swing

    return classified


def detect_trend(candles):
    """
    Detect trend from market structure.

    HH + HL -> bullish
    LH + LL -> bearish
    Mixed structure -> sideways / transition
    """

    swings = detect_swings(candles)

    if len(swings) < 4:
        return {
            "trend": "unknown",
            "state": "insufficient_data",
            "swings": [],
            "structure": []
        }

    classified = classify_swings(swings)

    # Get only confirmed structure labels
    structure = [
        swing["structure"]
        for swing in classified
        if swing["structure"] in ["HH", "HL", "LH", "LL"]
    ]

    # Need enough structural information
    if len(structure) < 2:
        return {
            "trend": "unknown",
            "state": "insufficient_structure",
            "swings": classified,
            "structure": structure
        }

    # -----------------------------------------
    # Count recent bullish/bearish structure
    # -----------------------------------------

    bullish_count = 0
    bearish_count = 0

    for label in structure:

        if label in ["HH", "HL"]:
            bullish_count += 1

        elif label in ["LH", "LL"]:
            bearish_count += 1

    # -----------------------------------------
    # Look at the latest structure
    # -----------------------------------------

    recent_structure = structure[-6:]

    recent_bullish = sum(
        1 for x in recent_structure
        if x in ["HH", "HL"]
    )

    recent_bearish = sum(
        1 for x in recent_structure
        if x in ["LH", "LL"]
    )

    # -----------------------------------------
    # Determine trend
    # -----------------------------------------

    if recent_bullish >= 4 and recent_bullish > recent_bearish:

        trend = "bullish"

    elif recent_bearish >= 4 and recent_bearish > recent_bullish:

        trend = "bearish"

    else:

        trend = "sideways"

    # -----------------------------------------
    # Detect possible transition
    # -----------------------------------------

    state = "continuation"

    if len(structure) >= 4:

        last_four = structure[-4:]

        # Bearish -> possible bullish
        if (
            last_four[-2:] == ["HL", "HH"]
        ):
            state = "bullish_transition"

        # Bullish -> possible bearish
        elif (
            last_four[-2:] == ["LH", "LL"]
        ):
            state = "bearish_transition"

    # -----------------------------------------
    # Simple structural strength
    # -----------------------------------------

    total = bullish_count + bearish_count

    if total > 0:

        if trend == "bullish":

            strength = bullish_count / total

        elif trend == "bearish":

            strength = bearish_count / total

        else:

            strength = 0.5

    else:

        strength = 0.0

    # -----------------------------------------
    # Final result
    # -----------------------------------------

    return {
        "trend": trend,
        "state": state,
        "strength": round(strength, 2),
        "structure": structure,
        "swings": classified,
        "latest_swing": classified[-1] if classified else None
    }