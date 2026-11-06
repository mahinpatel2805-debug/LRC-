from flask import Flask, request, jsonify
from flask_cors import CORS
from lrc import text_to_rows, compute_lrc, verify_lrc, add_vrc, flip_bit
import random

app = Flask(__name__)
CORS(app)


@app.post("/api/lrc/generate")
def generate():
    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400
    rows = text_to_rows(text)
    lrc = compute_lrc(text)
    vrc_rows = add_vrc(rows)
    return jsonify({
        "rows": rows,
        "vrc_rows": vrc_rows,
        "lrc": lrc,
        "chars": list(text),
    })


@app.post("/api/lrc/verify")
def verify():
    data = request.json or {}
    text = data.get("text", "")
    lrc = data.get("lrc", "")
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(lrc) != 8 or set(lrc) - {"0", "1"}:
        return jsonify({"error": "LRC must be exactly 8 bits (0s and 1s only)"}), 400
    result = verify_lrc(text, lrc)
    result["rows"] = text_to_rows(text)
    result["chars"] = list(text)
    return jsonify(result)


@app.post("/api/lrc/corrupt")
def corrupt():
    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400
    row = data.get("row", random.randint(0, len(text) - 1))
    col = data.get("col", random.randint(0, 7))
    try:
        corrupted = flip_bit(text, int(row), int(col))
    except (IndexError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({
        "original": text,
        "corrupted": corrupted,
        "flipped_row": row,
        "flipped_col": col,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
