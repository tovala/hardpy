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
weight) on top, English (secondary, smaller / faded) below.

## Layout

```
hardpy.toml                  # frontend.language=zh, secondary=en, report=en
pytest.ini
conftest.py
test_1.py                    # Basic Demo module — uses i18n: prefixed names
test_2.py                    # Advanced Demo module — second module to verify module-name translation
translations/
  common.json                # shared keys for any fixture (en, zh, th)
  i18n_demo.json             # per-fixture overrides (shadows common)
```

The catalog loader merges `common.json` first, then `i18n_demo.json` on top.
Per-fixture overrides win. Same nested shape as the frontend's chrome
catalog at `frontend/public/locales/<lang>/translation.json`.

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

## Two translation pipelines, two-tier merge

There are **two separate translation catalogs** in HardPy, and they answer
different questions:

| Catalog | Lives at | Holds | Loaded |
|---|---|---|---|
| **Chrome** | `frontend/public/locales/<lang>/translation.json` (bundled with hardpy) | Operator-panel UI labels — navbar, cog menu, "Loading...", "Last launch", etc. | Build-time |
| **Test content** (this demo) | `<tests_dir>/translations/*.json` (fixture-local) | Strings emitted by tests — assert messages, case/module names, dut/stand info, etc. | Runtime via `/api/translations` |

Both pipelines flow through the same `i18n.changeLanguage(lang)` switch; the
cog-menu language picker controls both at once. When you pick "ไทย", the
chrome layer looks for `locales/th/translation.json` AND test content looks
for `th` in `<tests_dir>/translations/*.json` — independently.

### Adding a whole new language

You can add a new language with only fixture-side catalog files — no hardpy
frontend rebuild needed — **but**:

- **Test content** in the new language: works immediately. Add a top-level
  language object to `common.json` / `<fixture>.json` and the picker
  auto-includes it.
- **Chrome (panel UI labels)**: requires a `locales/<lang>/translation.json`
  shipped with hardpy. If the language isn't there, react-i18next falls
  back the chrome layer to English while test content still renders in the
  new language.

That fallback is functional but visually mixed (Thai test content with
English chrome). For a fully-localized panel, contribute a chrome translation
to hardpy as well. Thai in this demo is exactly this mixed state — try it.

### Two-tier merge (within the test-content catalog)

Inside `<tests_dir>/translations/`, files merge in this order:

1. `common.json` (always first if present)
2. Other `*.json` files alphabetically

Each file overrides the previous. So `i18n_demo.json` in this demo shadows
`common.json`'s `errors.printer_not_found` with a fixture-specific message
("Demo fixture: label printer X unreachable") while inheriting everything
else from common.

## Live language switching

Open the cog menu in the operator panel and click **Switch language** →
pick from the submenu (English / 中文 / ไทย). The choice applies live without
restarting the test and is **not persisted** — reloading the page restores
the TOML default. The runstore keeps its `report_language` rendering
regardless of what the operator picks.

## Verifying the report stays in `report_language`

After a test run, check the runstore (or `get_current_report()` output): all
`i18n:` keys have been rendered to English prose, ready for engineering
consumers, StandCloud upload, etc.

```bash
# Pulled report doc — assertion_msg has rendered English, not the raw key
curl http://dev:dev@localhost:5984/runstore/current
```

## Missing-key behavior

If a key is missing in the operator's language, react-i18next falls back to
`en`. If the key is also missing in `en`, the raw dotted key (e.g.
`errors.this_key_is_not_in_catalog`) surfaces in the panel as a visible
debug signal. `test_missing_translation_shows_raw_key` in `test_1.py`
exercises this path.

## Argument mismatch behavior

If a test calls `pytest.fail('i18n:errors.printer_not_found')` (no `{{name}}`
arg) but the template expects one, the literal `{{name}}` stays in the
rendered output — a deliberate, visible debug signal. Extras are silently
ignored. Same behavior on both the Python runstore-side render and the
frontend live-render path.
