from typing import Literal

FIBONACCI_RATIOS = (0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0)


def calculate_fibonacci_levels(
    swing_low: float,
    swing_high: float,
    direction: Literal["uptrend", "downtrend"] = "uptrend",
) -> dict:
    """Calculate standard Fibonacci retracement prices for a supplied swing."""
    if swing_high <= swing_low:
        raise ValueError("swing_high must be greater than swing_low")

    swing_range = swing_high - swing_low
    if direction == "uptrend":
        levels = {
            str(ratio): round(swing_high - swing_range * ratio, 8)
            for ratio in FIBONACCI_RATIOS
        }
    else:
        levels = {
            str(ratio): round(swing_low + swing_range * ratio, 8)
            for ratio in FIBONACCI_RATIOS
        }

    return {
        "direction": direction,
        "swing_low": swing_low,
        "swing_high": swing_high,
        "levels": levels,
    }
