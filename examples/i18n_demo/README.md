# i18n demo (NEX-1206)

Demonstrates dual-language stacked rendering in the HardPy operator panel.

## Run

```bash
cd examples/i18n_demo
hardpy run
```

Then open the operator panel. With `language = "zh"` and
`secondary_display_language = "en"` in `hardpy.toml`, the panel shows test
names, assert messages, and info messages stacked: Chinese (primary, normal
weight) on top, English (secondary, smaller / lighter) below.

## Layout

```
hardpy.toml                  # frontend.language=zh, secondary=en, report=en
pytest.ini
conftest.py
test_1.py                    # demo tests using i18n: prefixed strings
translations/
  common.toml                # shared keys for any fixture
  i18n_demo.toml             # per-fixture overrides (shadows common)
```

The catalog loader merges `common.toml` first, then `i18n_demo.toml` on top.
Per-fixture overrides win. Both files are TOML with a language-first nested
namespace structure that mirrors react-i18next's expectation.

## Key convention

Test code marks translatable strings with an explicit `i18n:` prefix and
optional JSON args:

```python
pytest.fail('i18n:errors.printer_not_found{"name":"Brother-QL820"}')

set_message('i18n:info.cycle{"n":1,"total":3}')

@pytest.mark.case_name("i18n:tests.printer_check")
def test_printer_check():
    ...
```

Strings without the prefix render verbatim — no catalog lookup attempted.
Format placeholders use `{{var}}` syntax (react-i18next-compatible).

## Live language switching

Open the cog menu in the operator panel and click **Switch language** to
toggle the panel primary language between `language` and
`secondary_display_language` without restarting the test. The selection is
not persisted — reloading the page restores the TOML default. The runstore
keeps the canonical `report_language` rendering regardless.

## Verifying the report stays in `report_language`

After a test run, check the runstore (or `get_current_report()` output): all
`i18n:` keys have been rendered to English prose, ready for engineering
consumers, StandCloud upload, etc.

```bash
# Pulled report doc — assertion_msg has rendered English, not the raw key
curl http://dev:dev@localhost:5984/runstore/current
```

## Missing-key behavior

If a fixture is configured for a language the catalog hasn't translated to,
react-i18next falls back to `en`. If the key is missing in both, the raw
dotted key (e.g. `errors.this_key_is_not_in_catalog`) surfaces in the panel
as a visible debug signal. `test_missing_translation_shows_raw_key` in
`test_1.py` exercises this path.
