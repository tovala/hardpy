"""Regression demo for NEX-1202: long strings in results / messages overflow the panel.

Each test emits content that historically blew past the right edge of the operator
panel without wrapping. Run via `hardpy run` from this directory and inspect the
operator panel UI; long content should wrap cleanly inside the panel, not force
horizontal scroll.
"""

import pytest

from hardpy import (
    ComparisonOperation as CompOp,
    NumericMeasurement,
    set_case_artifact,
    set_case_measurement,
    set_dut_info,
    set_message,
    set_stand_info,
)

pytestmark = pytest.mark.module_name("Long Strings")


@pytest.mark.case_name("Long measurement name and value")
def test_long_measurement():
    long_name = "Very long descriptive measurement name that goes on for a while and probably exceeds typical column width on a 1080p operator display"
    meas = NumericMeasurement(value=12345.6789, name=long_name, unit="mV")
    set_case_measurement(meas)


@pytest.mark.case_name("Measurement with long unbreakable string value")
def test_unbreakable_string_value():
    # SHA256-style hex: no spaces or hyphens, won't break unless we explicitly wrap it
    sha_value = "a" + "1234567890abcdef" * 8
    set_message(f"Computed hash: {sha_value}")


@pytest.mark.case_name("Long single-line message")
def test_long_message():
    set_message(
        "This is a long single-line operator message that contains many words "
        "and should wrap naturally at word boundaries, but only if the rendering "
        "component lets it. Otherwise it just stretches the panel to the right."
    )


@pytest.mark.case_name("Long message with no spaces")
def test_long_message_no_spaces():
    # The classic test: a single 200-char token (e.g. a path or URL with no breaks)
    set_message("/very/long/filesystem/path/with/no/spaces/in/the/middle/which/typescript/components/tend/to/render/without/word-break/css/and/then/overflow/their/parent/container.txt")


@pytest.mark.case_name("Multi-line message")
def test_multiline_message():
    set_message(
        "Line one of a multi-line message.\n"
        "Line two — should render as a separate visual line, not joined.\n"
        "Line three with some context about the failure mode."
    )


@pytest.mark.case_name("Long assertion message")
def test_long_assertion():
    expected = 42
    actual = 41
    assert actual == expected, (
        f"Expected value to be {expected} but got {actual}. "
        "This assertion message is long on purpose so we can see how it renders "
        "in the operator panel's fail window. Operators should be able to read "
        "the whole message without scrolling horizontally, and ideally without "
        "the traceback context drowning the actionable part."
    )


@pytest.mark.case_name("Long DUT and stand info")
def test_long_info():
    set_dut_info(
        {
            "serial_number": "VERYLONGSERIALNUMBER-1234567890-ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "firmware_version": "1.2.3-rc4+build.20260512.commit.abc123def456",
            "description": (
                "A long descriptive blurb about this DUT that includes its full "
                "model designation, build date, calibration history reference, "
                "and any other context the operator might want."
            ),
        }
    )
    set_stand_info(
        {
            "fixture_id": "HELLRAISER-PROD-MANUFACTURING-LINE-3-STATION-7",
            "location": "Building 4 / North Floor / Cell C-12 (the one near the loading dock)",
        }
    )


@pytest.mark.case_name("Long artifact")
def test_long_artifact():
    set_case_artifact(
        {
            "raw_capture": "x" * 400,
            "notes": "An artifact with a single 400-character unbroken string of x's. Renders the worst-case wrapping scenario.",
        }
    )
