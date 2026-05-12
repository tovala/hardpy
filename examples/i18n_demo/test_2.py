"""Second i18n demo module — verifies module-name translation.

The ``pytestmark`` declaration below carries an ``i18n:`` prefixed key. The
operator panel resolves it against the catalog and stacks both languages in
the suite header, exactly the same way it handles per-case ``case_name``
markers (see test_1.py).
"""
import pytest

from hardpy import set_message


pytestmark = pytest.mark.module_name("i18n:modules.module_advanced")


@pytest.mark.case_name("i18n:tests.cycle_check")
def test_cycle_counter():
    """A passing test in the advanced module — case + module names both translated."""
    set_message('i18n:info.cycle{"n":2,"total":3}', "step")
    assert True


@pytest.mark.case_name("i18n:tests.shutdown_check")
def test_shutdown_sequence():
    """Another passing test to fill out the advanced module."""
    set_message("i18n:info.ready", "step")
    assert True
