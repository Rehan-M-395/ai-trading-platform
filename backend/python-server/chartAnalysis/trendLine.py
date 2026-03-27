# trendLine.py

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow frontend requests

def find_swing_lows(data):
    swings = []

    for i in range(2, len(data) - 2):
        if (
            data[i]["low"] < data[i-1]["low"] and
            data[i]["low"] < data[i+1]["low"]
        ):
            swings.append({
                "time": data[i]["time"],
                "price": data[i]["low"]
            })

    return swings


@app.route('/trendline', methods=['POST'])
def calculate_trendline():
    data = request.json

    if not data or len(data) < 5:
        return jsonify({"error": "Not enough data"}), 400

    swings = find_swing_lows(data)

    if len(swings) < 2:
        return jsonify({"error": "Not enough swing points"}), 400

    # 🔥 pick last 2 swing lows (like your image)
    p1 = min(swings, key=lambda x: x["price"])
    p2 = swings[-1]

    return jsonify({
        "trendline": [p1, p2]
    })


# ✅ Health check route (optional but useful)
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Trendline API running"})


if __name__ == '__main__':
    print("🚀 Server starting on http://127.0.0.1:5000")
    app.run(debug=True)