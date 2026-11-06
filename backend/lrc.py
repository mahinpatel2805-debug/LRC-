"""
lrc.py - Core Longitudinal Redundancy Check logic.

Each character is treated as one byte (8 bits = one row).
XOR-ing all rows column-by-column produces the LRC byte.
"""


# ----------------------------------------------------------------
# Row helpers
# ----------------------------------------------------------------

def text_to_rows(text: str) -> list[str]:
    """Return each UTF-8 byte as an 8-bit binary string."""
    return [format(b, "08b") for b in text.encode("utf-8")]


def add_vrc(rows: list[str]) -> list[str]:
    """
    Append a VRC (Vertical Redundancy Check / parity bit) to every row.
    Uses even parity: the parity bit makes the total number of 1s even.
    Returns rows extended to 9 bits.
    """
    result = []
    for row in rows:
        ones = row.count("1")
        parity = "0" if ones % 2 == 0 else "1"
        result.append(row + parity)
    return result


# ----------------------------------------------------------------
# LRC computation
# ----------------------------------------------------------------

def compute_lrc(text: str) -> str:
    """XOR all bytes together; return the 8-bit LRC string."""
    lrc = 0
    for b in text.encode("utf-8"):
        lrc ^= b
    return format(lrc, "08b")


# ----------------------------------------------------------------
# Verification
# ----------------------------------------------------------------

def verify_lrc(text: str, received_lrc: str) -> dict:
    """
    Compare computed LRC against a received LRC.

    Returns:
        valid        - True if LRC matches
        expected_lrc - what we computed
        received_lrc - what was passed in
        bad_columns  - list of bit positions (0=MSB) that differ
        diff_bits    - 8-char string; '1' marks a bad column
    """
    expected = compute_lrc(text)
    diff = int(expected, 2) ^ int(received_lrc, 2)
    diff_bits = format(diff, "08b")
    return {
        "valid": diff == 0,
        "expected_lrc": expected,
        "received_lrc": received_lrc,
        "diff_bits": diff_bits,
        "bad_columns": [i for i, bit in enumerate(diff_bits) if bit == "1"],
    }


# ----------------------------------------------------------------
# Bit-flip simulation
# ----------------------------------------------------------------

def flip_bit(text: str, row: int, col: int) -> str:
    """
    Flip bit at position *col* (0-indexed, MSB=0) in byte *row*.
    Returns a new string with that one bit toggled.
    """
    data = bytearray(text.encode("utf-8"))
    if row < 0 or row >= len(data):
        raise IndexError(f"Row {row} out of range (0-{len(data)-1})")
    if col < 0 or col >= 8:
        raise IndexError(f"Col {col} out of range (0-7)")
    mask = 1 << (7 - col)
    data[row] ^= mask
    return data.decode("utf-8", errors="replace")
