"""Functional module — slow with a late failure.

Operator's likely scrolled back to inspect earlier modules by now; this checks
that the late-run auto-expand + auto-scroll behaves sanely (single animation,
no yank if user is at near-bottom watching live).
"""

import time
import pytest

from hardpy import set_message

pytestmark = pytest.mark.module_name("Functional")


@pytest.mark.case_name("Boot sequence")
def test_func_boot():
    time.sleep(2.0)
    set_message("Device reached operational state in 2.4s")


@pytest.mark.case_name("LED indicators")
def test_func_leds():
    time.sleep(2.0)
    set_message("All LEDs cycled green / amber / red as expected")


@pytest.mark.case_name("Button response (fails)")
def test_func_button_fail():
    time.sleep(2.0)
    assert False, "Button SW2 did not register press within 500ms"


@pytest.mark.case_name("Final teardown")
def test_func_teardown():
    time.sleep(2.0)
    set_message("All resources released, device powered down")
