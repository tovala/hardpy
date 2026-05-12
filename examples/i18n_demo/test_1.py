"""i18n demo tests.

Each test exercises a different operator-panel surface to show how the
``i18n:`` prefix convention flows through to:
  - Live operator panel (statestore — raw key, react-i18next translates live)
  - Persisted report (runstore — rendered prose in ``report_language``)

Run via the operator panel (``hardpy run``) and watch:
  - Test names render stacked (primary + secondary languages)
  - Assert messages render stacked
  - The cog-menu language toggle swaps primary live (resets on page reload)
  - The PASS/FAIL completion overlay shows stacked title
"""
from time import sleep

import pytest

from hardpy import set_dut_info, set_message, set_stand_info


pytestmark = pytest.mark.module_name("i18n:modules.module_basic")


@pytest.mark.case_name("i18n:tests.boot")
def test_boot_check():
    """A test that always passes — case name renders stacked in both languages."""
    set_stand_info({"location": "i18n:info.ready"})
    set_dut_info({"model": "Demo-X1"})  # Plain string — renders verbatim
    set_message('i18n:info.cycle{"n":1,"total":3}', "step")
    sleep(0.5)
    assert True


@pytest.mark.case_name("i18n:tests.printer_check")
def test_printer_check_fails():
    """Forced failure to show stacked rendering of the assertion message.

    Uses ``pytest.fail`` with an ``i18n:`` prefixed key + JSON args. The
    operator panel shows the failure message in both languages stacked; the
    persisted report stores rendered English.
    """
    set_message("i18n:info.ready", "status")
    pytest.fail('i18n:errors.printer_not_found{"name":"Brother-QL820"}')


@pytest.mark.case_name("i18n:tests.serial_check")
def test_serial_check_fails():
    """Failure with a no-args translation key."""
    pytest.fail("i18n:errors.serial_missing")


@pytest.mark.case_name("Plain literal case name")
def test_plain_string_passes_through():
    """Non-prefixed strings render verbatim in primary; secondary slot hidden.

    Operators see exactly what the test author wrote, no catalog lookup.
    """
    set_message("This is a plain English message — no translation applied.")
    assert True


@pytest.mark.case_name('i18n:tests.missing_key_demo')
def test_missing_translation_shows_raw_key():
    """If a key isn't in the catalog, the raw dotted key surfaces in the panel.

    Useful as a visible "untranslated" debug signal during fixture development.
    """
    pytest.fail("i18n:errors.this_key_is_not_in_catalog")
