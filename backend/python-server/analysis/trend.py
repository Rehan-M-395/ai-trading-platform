# Trend phase detection built on classified market-structure swings.

def detect_trend_phases(swings):
    """
    Convert classified swings into larger market-trend phases.

    Swing structure:
        HH / HL -> bullish evidence
        LH / LL -> bearish evidence

    A single opposite swing does NOT immediately change the trend.
    A reversal requires confirmation from the following structure.
    """

    if not swings:
        return {
            "current_trend": "unknown",
            "phases": []
        }

    phases = []

    current_trend = "unknown"
    trend_start = None
    trend_swings = []

    # Used to detect possible reversals
    possible_reversal = False
    reversal_direction = None

    def add_phase(trend, start_swing, end_swing, phase_swings):
        if trend == "unknown" or not start_swing or not end_swing:
            return

        phases.append({
            "trend": trend,
            "start_index": start_swing["index"],
            "end_index": end_swing["index"],
            "start_time": start_swing["timestamp"],
            "end_time": end_swing["timestamp"],
            "structure": [
                swing["structure"]
                for swing in phase_swings
                if swing["structure"] in ["HH", "HL", "LH", "LL"]
            ]
        })

    for swing in swings:

        structure = swing["structure"]

        # Ignore the first H/L because it doesn't tell us direction
        if structure in ["H", "L"]:
            continue

        # =====================================================
        # NO CURRENT TREND
        # =====================================================

        if current_trend == "unknown":

            if structure in ["HH", "HL"]:
                current_trend = "bullish"
                trend_start = swing
                trend_swings = [swing]

            elif structure in ["LH", "LL"]:
                current_trend = "bearish"
                trend_start = swing
                trend_swings = [swing]

            continue

        # =====================================================
        # CURRENTLY BULLISH
        # =====================================================

        if current_trend == "bullish":

            if structure in ["HH", "HL"]:

                # Bullish structure continues
                trend_swings.append(swing)

                # Any previous reversal warning is cancelled
                possible_reversal = False
                reversal_direction = None

            elif structure == "LH":

                # First bearish warning
                possible_reversal = True
                reversal_direction = "bearish"

                trend_swings.append(swing)

            elif structure == "LL":

                # LL after bearish warning = bearish reversal confirmed
                if (
                    possible_reversal
                    and reversal_direction == "bearish"
                ):
                    add_phase(
                        "bullish",
                        trend_start,
                        trend_swings[-1],
                        trend_swings
                    )

                    current_trend = "bearish"
                    trend_start = swing

                    trend_swings = [swing]

                    possible_reversal = False
                    reversal_direction = None

                else:
                    trend_swings.append(swing)

        # =====================================================
        # CURRENTLY BEARISH
        # =====================================================

        elif current_trend == "bearish":

            if structure in ["LH", "LL"]:

                # Bearish structure continues
                trend_swings.append(swing)

                # Cancel bullish reversal warning
                possible_reversal = False
                reversal_direction = None

            elif structure == "HL":

                # First bullish warning
                possible_reversal = True
                reversal_direction = "bullish"

                trend_swings.append(swing)

            elif structure == "HH":

                # HH after bullish warning = bullish reversal confirmed
                if (
                    possible_reversal
                    and reversal_direction == "bullish"
                ):
                    add_phase(
                        "bearish",
                        trend_start,
                        trend_swings[-1],
                        trend_swings
                    )

                    current_trend = "bullish"
                    trend_start = swing

                    trend_swings = [swing]

                    possible_reversal = False
                    reversal_direction = None

                else:
                    trend_swings.append(swing)

    # =========================================================
    # ADD CURRENT / LAST PHASE
    # =========================================================

    if current_trend != "unknown" and trend_start:

        end_swing = trend_swings[-1] if trend_swings else swings[-1]

        add_phase(
            current_trend,
            trend_start,
            end_swing,
            trend_swings
        )

    # =========================================================
    # RESULT
    # =========================================================

    return {
        "current_trend": current_trend,
        "phases": phases
    }
