def find_support_resistance(candles):

    swing_highs = []
    swing_lows = []

    lookback = 3

    # ==========================================
    # 1. FIND SWING HIGHS AND SWING LOWS
    # ==========================================

    for i in range(lookback, len(candles) - lookback):

        current_high = candles[i].high
        current_low = candles[i].low

        # -------- SWING HIGH --------

        is_swing_high = True

        for j in range(i - lookback, i + lookback + 1):

            if j != i and candles[j].high >= current_high:
                is_swing_high = False
                break

        if is_swing_high:
            swing_highs.append({
                "price": current_high,
                "index": i,
                "type": "resistance"
            })

        # -------- SWING LOW --------

        is_swing_low = True

        for j in range(i - lookback, i + lookback + 1):

            if j != i and candles[j].low <= current_low:
                is_swing_low = False
                break

        if is_swing_low:
            swing_lows.append({
                "price": current_low,
                "index": i,
                "type": "support"
            })

    # ==========================================
    # 2. ADD EXTREME HIGH AND LOW
    # ==========================================

    highest_candle = max(
        enumerate(candles),
        key=lambda x: x[1].high
    )

    lowest_candle = min(
        enumerate(candles),
        key=lambda x: x[1].low
    )

    highest_index, highest = highest_candle
    lowest_index, lowest = lowest_candle

    # Add highest high if not already present
    if not any(
        level["index"] == highest_index
        for level in swing_highs
    ):
        swing_highs.append({
            "price": highest.high,
            "index": highest_index,
            "type": "resistance",
            "extreme": True
        })

    # Add lowest low if not already present
    if not any(
        level["index"] == lowest_index
        for level in swing_lows
    ):
        swing_lows.append({
            "price": lowest.low,
            "index": lowest_index,
            "type": "support",
            "extreme": True
        })

    # ==========================================
    # 3. CLUSTER NEARBY LEVELS INTO ZONES
    # ==========================================

    def create_zones(levels, tolerance):

        if not levels:
            return []

        # Sort by price
        levels = sorted(levels, key=lambda x: x["price"])

        zones = []
        current_zone = [levels[0]]

        for level in levels[1:]:

            current_average = (
                sum(x["price"] for x in current_zone)
                / len(current_zone)
            )

            # If close enough, add to same zone
            if abs(level["price"] - current_average) <= tolerance:
                current_zone.append(level)

            else:
                zones.append(current_zone)
                current_zone = [level]

        zones.append(current_zone)

        final_zones = []

        for zone in zones:

            # Check if this zone contains extreme point
            extreme_point = next(
                (
                    point
                    for point in zone
                    if point.get("extreme") is True
                ),
                None
            )

            # If extreme exists, keep exact extreme price
            if extreme_point:
                price = extreme_point["price"]
                index = extreme_point["index"]

            else:
                price = (
                    sum(x["price"] for x in zone)
                    / len(zone)
                )

                # Use latest touch index
                index = max(
                    x["index"]
                    for x in zone
                )

            final_zones.append({
                "price": round(price, 2),
                "index": index,
                "touches": len(zone),
                "extreme": extreme_point is not None
            })

        return final_zones

    # ==========================================
    # 4. CREATE SUPPORT AND RESISTANCE ZONES
    # ==========================================

    tolerance = 1.5

    resistance_zones = create_zones(
        swing_highs,
        tolerance
    )

    support_zones = create_zones(
        swing_lows,
        tolerance
    )

    # ==========================================
    # 5. CALCULATE RELATIVE STRENGTH
    # ==========================================

    def add_strength(zones):

        if not zones:
            return []

        touches_list = [
            zone["touches"]
            for zone in zones
        ]

        min_touches = min(touches_list)
        max_touches = max(touches_list)

        for zone in zones:

            # Strength between 0 and 1
            if max_touches == min_touches:
                strength = 1.0

            else:
                strength = (
                    zone["touches"] - min_touches
                ) / (
                    max_touches - min_touches
                )

            zone["strength"] = round(strength, 2)

            # Only two types
            if strength >= 0.5:
                zone["zoneType"] = "strong"
            else:
                zone["zoneType"] = "weak"

        return zones

    resistance_zones = add_strength(
        resistance_zones
    )

    support_zones = add_strength(
        support_zones
    )

    # ==========================================
    # 6. RETURN FINAL ZONES
    # ==========================================

    return {
        "resistance_zones": resistance_zones,
        "support_zones": support_zones
    }