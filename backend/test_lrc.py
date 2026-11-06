"""Tests for lrc.py – run with: pytest test_lrc.py"""
import pytest
from lrc import compute_lrc, verify_lrc, text_to_rows, add_vrc, flip_bit


# ----------------------------------------------------------------
# compute_lrc
# ----------------------------------------------------------------

def test_hello_lrc():
    assert compute_lrc("HELLO") == "01000010"


def test_single_char():
    # LRC of a single char equals the char itself
    assert compute_lrc("A") == format(ord("A"), "08b")


def test_two_identical_chars_lrc_zero():
    # X XOR X == 0
    assert compute_lrc("AA") == "00000000"


# ----------------------------------------------------------------
# verify_lrc
# ----------------------------------------------------------------

def test_valid_hello():
    assert verify_lrc("HELLO", "01000010")["valid"] is True


def test_single_error_detected():
    result = verify_lrc("HELLP", "01000010")
    assert result["valid"] is False
    assert len(result["bad_columns"]) > 0


def test_even_flips_missed():
    """
    LRC limitation: even number of flips in the same column cancel out.
    'A' (0x41) XOR 'B' (0x42) == '@' (0x40) XOR 'C' (0x43)
    so compute_lrc("AB") == compute_lrc("@C")
    """
    assert compute_lrc("AB") == compute_lrc("@C")


# ----------------------------------------------------------------
# text_to_rows
# ----------------------------------------------------------------

def test_row_count_matches_chars():
    rows = text_to_rows("Hi!")
    assert len(rows) == 3


def test_row_length_is_8_bits():
    for row in text_to_rows("Test"):
        assert len(row) == 8
        assert set(row) <= {"0", "1"}


# ----------------------------------------------------------------
# add_vrc
# ----------------------------------------------------------------

def test_vrc_extends_to_9_bits():
    rows = text_to_rows("ABC")
    vrc_rows = add_vrc(rows)
    for vr in vrc_rows:
        assert len(vr) == 9


def test_vrc_even_parity():
    rows = text_to_rows("A")  # A = 01000001, has 2 ones -> parity bit 0
    vrc_rows = add_vrc(rows)
    assert vrc_rows[0].count("1") % 2 == 0


# ----------------------------------------------------------------
# flip_bit
# ----------------------------------------------------------------

def test_flip_changes_character():
    corrupted = flip_bit("HELLO", 0, 7)   # flip LSB of 'H'
    assert corrupted != "HELLO"


def test_flip_row_out_of_range():
    with pytest.raises(IndexError):
        flip_bit("HI", 5, 0)


def test_flip_col_out_of_range():
    with pytest.raises(IndexError):
        flip_bit("HI", 0, 10)
