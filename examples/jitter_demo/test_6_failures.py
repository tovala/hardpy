"""Variety of failing tests to populate the test-completion overlay and exercise
the scrollable failed-cases list (NEX-1190). Each test demonstrates a different
failure shape — bare assert, rewritten compare, raised exception, multi-line
message, long unbreakable string, custom error type, etc.
"""

import time
import pytest

import hardpy
from hardpy import (
    ComparisonOperation as CompOp,
    NumericMeasurement,
    set_case_measurement,
)

pytestmark = pytest.mark.module_name("Failure Variety")

DWELL = 0.3


@pytest.mark.case_name("Bare assert False")
def test_bare_assert():
    time.sleep(DWELL)
    assert False


@pytest.mark.case_name("Assert comparison without message")
def test_assert_compare():
    time.sleep(DWELL)
    expected = 42
    actual = 41
    assert actual == expected


@pytest.mark.case_name("Plain assert with short message")
def test_plain_assert_short():
    time.sleep(DWELL)
    assert False, "Sensor reading invalid"


@pytest.mark.case_name("Plain assert with long single-line message")
def test_plain_assert_long():
    time.sleep(DWELL)
    assert False, (
        "Calibration drift exceeds tolerance: measured -0.42mV vs allowed "
        "±0.30mV. Probable cause is loose reference connection on TP4. "
        "Recheck cable seating before retesting."
    )


@pytest.mark.case_name("Multi-line message")
def test_multiline_message():
    time.sleep(DWELL)
    assert False, (
        "Three independent checks failed:\n"
        "  - VBAT below threshold (3.1V < 3.3V)\n"
        "  - Buzzer not responding to PWM\n"
        "  - LED pattern mismatch on cycle 2"
    )


@pytest.mark.case_name("Path-style string (no spaces)")
def test_no_space_string():
    time.sleep(DWELL)
    assert False, (
        "/var/log/hardpy/fixture_logs/2026-05-12/test_run_abcd1234efgh5678/"
        "stage_5/raw_capture_failure.bin"
    )


@pytest.mark.case_name("RuntimeError raised")
def test_raise_runtime_error():
    time.sleep(DWELL)
    raise RuntimeError("Stepper motor stalled at position 1400")


@pytest.mark.case_name("ValueError raised")
def test_raise_value_error():
    time.sleep(DWELL)
    raise ValueError("Serial number checksum mismatch — expected 0xAB12, got 0xCD34")


@pytest.mark.case_name("hardpy.ErrorCode raised")
def test_error_code():
    time.sleep(DWELL)
    assert False, hardpy.ErrorCode(101, "Printer not found — check USB cable")


@pytest.mark.case_name("Numeric measurement out of range")
def test_meas_fail():
    time.sleep(DWELL)
    meas = NumericMeasurement(
        value=2.84,
        name="Output voltage",
        unit="V",
        operation=CompOp.GELE,
        lower_limit=3.20,
        upper_limit=3.40,
        disp=True,
    )
    set_case_measurement(meas)
    assert meas.result, "Output voltage out of spec — regulator may be faulty"


@pytest.mark.case_name("Failure with embedded asserted expression")
def test_embedded_assert_text():
    time.sleep(DWELL)
    # The user's message contains the substring "assert " — verify the
    # decomposition stripper doesn't over-eagerly truncate inside it.
    assert False, "Test plan says: do not assert without a clear reason"


@pytest.mark.case_name("Long traceback through helper")
def test_long_traceback():
    """Indirect failure to produce a deeper stack in assertion_details."""
    time.sleep(DWELL)

    def step_a():
        return step_b()

    def step_b():
        return step_c()

    def step_c():
        raise RuntimeError("Inner helper aborted unexpectedly")

    step_a()
