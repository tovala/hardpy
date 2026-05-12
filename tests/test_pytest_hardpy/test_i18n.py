# Copyright (c) 2026 Tovala
# GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
"""Unit tests for the translation catalog and i18n: prefix parser."""
from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from hardpy.pytest_hardpy.i18n import Catalog, parse_i18n_key


class TestParseI18nKey:
    def test_returns_none_for_plain_string(self):
        assert parse_i18n_key("plain text") is None

    def test_returns_none_for_non_string(self):
        assert parse_i18n_key(42) is None
        assert parse_i18n_key(None) is None
        assert parse_i18n_key({"k": "v"}) is None

    def test_prefix_no_args(self):
        key, args = parse_i18n_key("i18n:errors.printer_not_found")
        assert key == "errors.printer_not_found"
        assert args == {}

    def test_prefix_with_json_args(self):
        key, args = parse_i18n_key('i18n:errors.printer_not_found{"name":"Brother_QL"}')
        assert key == "errors.printer_not_found"
        assert args == {"name": "Brother_QL"}

    def test_prefix_with_multiple_args(self):
        key, args = parse_i18n_key('i18n:tests.cycle{"n":3,"unit":"min"}')
        assert key == "tests.cycle"
        assert args == {"n": 3, "unit": "min"}

    def test_malformed_json_returns_key_empty_args(self):
        # Logs warning, drops args, key still resolves
        result = parse_i18n_key("i18n:errors.foo{not json}")
        assert result == ("errors.foo", {})

    def test_non_object_json_inside_braces_drops_args(self):
        # Anything between {...} that isn't a JSON object is dropped
        result = parse_i18n_key('i18n:errors.foo{"plain string"}')
        assert result == ("errors.foo", {})

    def test_just_prefix_returns_empty_key(self):
        key, args = parse_i18n_key("i18n:")
        assert key == ""
        assert args == {}


def _write_catalog(tmp_path: Path, files: dict[str, str]) -> Path:
    """Write a fake tests dir with translations/ subdir. Returns the tests dir."""
    tests_dir = tmp_path / "tests_root"
    translations = tests_dir / "translations"
    translations.mkdir(parents=True)
    for name, content in files.items():
        (translations / name).write_text(textwrap.dedent(content), encoding="utf-8")
    return tests_dir


class TestCatalogLoad:
    def test_missing_dir_yields_empty_catalog(self, tmp_path: Path):
        c = Catalog()
        c.load(tmp_path)  # No translations/ subdir
        assert c.is_empty
        assert c.data == {}

    def test_single_file_load(self, tmp_path: Path):
        tests_dir = _write_catalog(
            tmp_path,
            {
                "common.toml": """
                    [en.errors]
                    printer_not_found = "Printer {{name}} not found"

                    [zh.errors]
                    printer_not_found = "找不到打印机 {{name}}"
                """,
            },
        )
        c = Catalog()
        c.load(tests_dir)
        assert not c.is_empty
        assert c.data["en"]["errors"]["printer_not_found"] == "Printer {{name}} not found"
        assert c.data["zh"]["errors"]["printer_not_found"] == "找不到打印机 {{name}}"

    def test_two_tier_merge_fixture_overrides_common(self, tmp_path: Path):
        tests_dir = _write_catalog(
            tmp_path,
            {
                "common.toml": """
                    [en.errors]
                    printer_not_found = "Common: printer missing"
                    serial_missing = "Scan serial number"
                """,
                "hellraiser.toml": """
                    [en.errors]
                    printer_not_found = "Hellraiser: plug in label printer"
                """,
            },
        )
        c = Catalog()
        c.load(tests_dir)
        # Override from fixture wins
        assert c.data["en"]["errors"]["printer_not_found"] == "Hellraiser: plug in label printer"
        # Non-overridden key from common still present
        assert c.data["en"]["errors"]["serial_missing"] == "Scan serial number"

    def test_common_loads_first_regardless_of_alphabetical_order(self, tmp_path: Path):
        tests_dir = _write_catalog(
            tmp_path,
            {
                "aaa_other.toml": """
                    [en.foo]
                    bar = "from aaa_other"
                """,
                "common.toml": """
                    [en.foo]
                    bar = "from common"
                """,
            },
        )
        c = Catalog()
        c.load(tests_dir)
        # common.toml loads first; aaa_other.toml overrides
        assert c.data["en"]["foo"]["bar"] == "from aaa_other"

    def test_malformed_toml_is_skipped(self, tmp_path: Path):
        tests_dir = _write_catalog(
            tmp_path,
            {
                "bad.toml": "this is not [valid toml [[[",
                "good.toml": """
                    [en.foo]
                    bar = "valid"
                """,
            },
        )
        c = Catalog()
        c.load(tests_dir)
        assert c.data["en"]["foo"]["bar"] == "valid"


class TestCatalogRender:
    @pytest.fixture
    def catalog(self, tmp_path: Path) -> Catalog:
        tests_dir = _write_catalog(
            tmp_path,
            {
                "common.toml": """
                    [en.errors]
                    printer_not_found = "Printer {{name}} not found"
                    no_args = "Static error"

                    [en.tests]
                    printer_check = "Printer Check"

                    [zh.errors]
                    printer_not_found = "找不到打印机 {{name}}"

                    [zh.tests]
                    printer_check = "打印机检查"
                """,
            },
        )
        c = Catalog()
        c.load(tests_dir)
        return c

    def test_renders_prefixed_key_no_args(self, catalog: Catalog):
        assert catalog.render("i18n:errors.no_args", "en") == "Static error"

    def test_renders_prefixed_key_with_args(self, catalog: Catalog):
        result = catalog.render(
            'i18n:errors.printer_not_found{"name":"Brother_QL"}', "en"
        )
        assert result == "Printer Brother_QL not found"

    def test_renders_zh_when_requested(self, catalog: Catalog):
        result = catalog.render(
            'i18n:errors.printer_not_found{"name":"Brother_QL"}', "zh"
        )
        assert result == "找不到打印机 Brother_QL"

    def test_unprefixed_string_passes_through(self, catalog: Catalog):
        assert catalog.render("just a plain string", "en") == "just a plain string"

    def test_non_string_passes_through(self, catalog: Catalog):
        assert catalog.render(42, "en") == 42
        assert catalog.render(None, "en") is None
        assert catalog.render(True, "en") is True

    def test_missing_key_falls_back_to_en(self, catalog: Catalog):
        # `i18n:tests.printer_check` exists in both en and zh — pick something
        # that's only in en
        result = catalog.render("i18n:errors.no_args", "zh")
        assert result == "Static error"

    def test_missing_in_both_returns_raw_key(self, catalog: Catalog):
        result = catalog.render("i18n:nonexistent.key", "en")
        assert result == "nonexistent.key"

    def test_walks_dicts(self, catalog: Catalog):
        result = catalog.render(
            {
                "label": "i18n:tests.printer_check",
                "count": 5,
                "literal": "plain",
            },
            "zh",
        )
        assert result == {"label": "打印机检查", "count": 5, "literal": "plain"}

    def test_walks_lists(self, catalog: Catalog):
        result = catalog.render(
            ["i18n:tests.printer_check", "plain", 42],
            "zh",
        )
        assert result == ["打印机检查", "plain", 42]

    def test_walks_nested(self, catalog: Catalog):
        result = catalog.render(
            {"items": [{"name": "i18n:tests.printer_check"}, "plain"]},
            "zh",
        )
        assert result == {"items": [{"name": "打印机检查"}, "plain"]}

    def test_unparseable_args_renders_key_with_empty_args(self, catalog: Catalog):
        # Malformed JSON — args dropped, but template still resolves
        result = catalog.render("i18n:errors.no_args{not json}", "en")
        assert result == "Static error"

    def test_empty_catalog_renders_raw_key(self, tmp_path: Path):
        c = Catalog()
        c.load(tmp_path)  # no translations/ dir
        # No template found anywhere — falls back to the raw dotted key
        assert c.render("i18n:errors.printer_not_found", "en") == "errors.printer_not_found"
        # Plain strings still pass through
        assert c.render("plain", "en") == "plain"

    def test_missing_arg_leaves_placeholder_literal(self, catalog: Catalog):
        # Template wants {{name}} but the caller provided no args — the literal
        # placeholder stays in the output as a visible debug signal. Matches
        # react-i18next's default behavior so the frontend renders the same way.
        result = catalog.render("i18n:errors.printer_not_found", "en")
        assert result == "Printer {{name}} not found"

    def test_missing_arg_with_other_args_leaves_placeholder(self, catalog: Catalog):
        # Some args provided, but not the one the template needs.
        result = catalog.render(
            'i18n:errors.printer_not_found{"unrelated":"x"}', "en"
        )
        assert result == "Printer {{name}} not found"

    def test_extra_args_silently_ignored(self, catalog: Catalog):
        # Template has no placeholders; extras don't appear anywhere.
        result = catalog.render('i18n:errors.no_args{"name":"X","junk":"Y"}', "en")
        assert result == "Static error"

    def test_partial_arg_set_substitutes_what_it_can(self, tmp_path: Path):
        # Two placeholders, only one arg — substituted one fills, missing one
        # stays as literal {{var}}.
        tests_dir = _write_catalog(
            tmp_path,
            {
                "common.toml": """
                    [en.info]
                    cycle = "Cycle {{n}} of {{total}}"
                """,
            },
        )
        c = Catalog()
        c.load(tests_dir)
        result = c.render('i18n:info.cycle{"n":3}', "en")
        assert result == "Cycle 3 of {{total}}"
