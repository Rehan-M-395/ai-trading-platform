import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# STEP 1: Detect Swing Lows (Improved)
def find_swing_lows(data, window=2):
    swings = []

    for i in range(window, len(data) - window):
        is_swing = True

        for j in range(1, window + 1):
            if data[i]["low"] >= data[i - j]["low"] or data[i]["low"] >= data[i + j]["low"]:
                is_swing = False
                break

        if is_swing:
            swings.append(
                {
                    "index": i,
                    "time": data[i]["time"],
                    "price": data[i]["low"],
                }
            )

    return swings


# STEP 2: Generate All Possible Trendlines
def generate_trendlines(swings):
    lines = []

    for i in range(len(swings)):
        for j in range(i + 1, len(swings)):
            p1 = swings[i]
            p2 = swings[j]

            # Only consider higher lows (uptrend)
            if p2["price"] <= p1["price"]:
                continue

            slope = (p2["price"] - p1["price"]) / (p2["index"] - p1["index"])

            lines.append({"p1": p1, "p2": p2, "slope": slope})

    return lines


# STEP 3: Score Each Trendline
def score_trendline(line, data):
    p1 = line["p1"]
    slope = line["slope"]

    touches = 0
    violations = 0

    for i in range(p1["index"], len(data)):
        expected_price = p1["price"] + slope * (i - p1["index"])
        actual_low = data[i]["low"]

        # Touch detection
        if abs(actual_low - expected_price) < expected_price * 0.002:
            touches += 1

        # Violation (price breaks below trendline)
        if actual_low < expected_price * 0.995:
            violations += 1

    # Score formula
    score = (touches * 2) - (violations * 3)

    return score


# STEP 4: Find Best Trendline
def find_best_trendline(data):
    swings = find_swing_lows(data)

    if len(swings) < 2:
        return None

    lines = generate_trendlines(swings)

    best_line = None
    best_score = float("-inf")

    for line in lines:
        score = score_trendline(line, data)

        if score > best_score:
            best_score = score
            best_line = line

    if not best_line:
        return None

    return {"start": best_line["p1"], "end": best_line["p2"], "score": best_score}


# API Route
@app.route("/trendline", methods=["POST"])
def calculate_trendline():
    data = request.json

    if not data or len(data) < 20:
        return jsonify({"error": "Not enough data"}), 400

    result = find_best_trendline(data)

    if not result:
        return jsonify({"error": "No valid trendline found"}), 400

    return jsonify(
        {
            "trendline": {"start": result["start"], "end": result["end"]},
            "score": result["score"],
        }
    )


# Health check
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Trendline AI API running"})


if __name__ == "__main__":
    print("Server running on http://127.0.0.1:5000")
    app.run(debug=True)
