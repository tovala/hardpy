"""DialogBox i18n demo (NEX-1206 dialog gap).

Exercises every operator-facing surface on ``run_dialog_box`` that previously
shipped its raw ``i18n:`` key to the frontend instead of resolving it:

- ``title_bar`` and ``dialog_text`` on the dialog itself
- ``RadiobuttonWidget`` and ``CheckboxWidget`` field labels
- ``MultistepWidget`` step titles and step bodies
- ``{{var}}`` interpolation through the JSON-args suffix

Run via the operator panel (``hardpy run``) — the panel renders primary
(``zh`` per ``hardpy.toml``) stacked above secondary (``en``) for every
field. Before the fix only the body of ``set_message`` / ``pytest.fail``
strings rendered translated; the dialog title and widget labels surfaced
the raw ``i18n:`` key.
"""
from hardpy import (
    CheckboxWidget,
    DialogBox,
    MultistepWidget,
    RadiobuttonWidget,
    StepWidget,
    TextInputWidget,
    run_dialog_box,
)
import pytest


pytestmark = pytest.mark.module_name("i18n:modules.module_dialog")


@pytest.mark.case_name("i18n:tests.dialog_basic")
def test_dialog_basic_translates_title_and_body():
    """Plain confirm dialog — title and (multi-line) body resolve via i18n."""
    confirmed = run_dialog_box(
        DialogBox(
            title_bar="i18n:dialog.confirm_visual.title",
            dialog_text="i18n:dialog.confirm_visual.body",
        ),
    )
    assert confirmed is True


@pytest.mark.case_name("i18n:tests.dialog_text_input")
def test_dialog_text_input_with_interpolation():
    """Text-input dialog — title, body with ``{{prefix}}`` interpolation."""
    serial = run_dialog_box(
        DialogBox(
            title_bar="i18n:dialog.scan_sn.title",
            dialog_text='i18n:dialog.scan_sn.body{"prefix":"OVN-"}',
            widget=TextInputWidget(),
        ),
    )
    assert isinstance(serial, str)
    assert serial != ""


@pytest.mark.case_name("i18n:tests.dialog_radio")
def test_dialog_radio_button_labels_translate():
    """Radio fields carry ``i18n:`` keys — each option label resolves on the
    operator panel; the value sent back to the test is the raw key string."""
    chosen = run_dialog_box(
        DialogBox(
            title_bar="i18n:dialog.select_lane.title",
            dialog_text="i18n:dialog.select_lane.body",
            widget=RadiobuttonWidget(
                fields=[
                    "i18n:lane.left",
                    "i18n:lane.center",
                    "i18n:lane.right",
                ],
            ),
        ),
    )
    # Server receives the raw key so downstream test code can route on it
    # without depending on the operator's display language.
    assert chosen in {"i18n:lane.left", "i18n:lane.center", "i18n:lane.right"}


@pytest.mark.case_name("i18n:tests.dialog_checkbox")
def test_dialog_checkbox_labels_translate():
    """Checkbox fields carry ``i18n:`` keys — every label resolves; the
    selected raw-key strings come back as a list."""
    selected = run_dialog_box(
        DialogBox(
            title_bar="i18n:dialog.select_harnesses.title",
            dialog_text="i18n:dialog.select_harnesses.body",
            widget=CheckboxWidget(
                fields=[
                    "i18n:harness.power",
                    "i18n:harness.sensor",
                    "i18n:harness.comms",
                ],
            ),
        ),
    )
    assert isinstance(selected, list)
    assert all(item.startswith("i18n:harness.") for item in selected)


@pytest.mark.case_name("i18n:tests.dialog_multistep")
def test_dialog_multistep_step_titles_and_bodies_translate():
    """Multistep tabs — each tab title and step body resolves on the panel."""
    confirmed = run_dialog_box(
        DialogBox(
            title_bar="i18n:dialog.multistep_walkthrough.title",
            dialog_text="i18n:dialog.confirm_visual.body",
            widget=MultistepWidget(
                steps=[
                    StepWidget(
                        title="i18n:step.power_on.title",
                        text="i18n:step.power_on.body",
                    ),
                    StepWidget(
                        title="i18n:step.connect_scanner.title",
                        text="i18n:step.connect_scanner.body",
                    ),
                    StepWidget(
                        title="i18n:step.final_check.title",
                        text="i18n:step.final_check.body",
                    ),
                ],
            ),
        ),
    )
    assert confirmed is True
