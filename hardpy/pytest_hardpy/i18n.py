# Copyright (c) 2026 Tovala
# GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
"""Translation catalog and renderer for ``i18n:`` prefixed strings.

Test code marks translatable strings with an explicit prefix and optional JSON
args, for example::

    pytest.fail('i18n:errors.printer_not_found{"name":"Brother_QL"}')

The frontend (react-i18next) reads the raw key from statestore and renders live
in the operator's chosen language. The runstore-bound write goes through
:func:`Catalog.render` here so the persisted/uploaded report is rendered prose
in ``report_language`` — engineering report consumers see human text without
needing to understand the i18n prefix scheme.

Catalog files live at ``<tests_dir>/translations/*.toml``. ``common.toml``
loads first; other files merge alphabetically, each overriding earlier entries.
Catalog TOML structure is language-first nested namespaces, mirroring
react-i18next's expectation::

    [zh.errors]
    printer_not_found = "找不到打印机 {{name}}"

    [en.errors]
    printer_not_found = "Printer {{name}} not found"
"""
from __future__ import annotations

import json
import re
from logging import getLogger
from pathlib import Path
from typing import Any

import tomli

logger = getLogger(__name__)

PREFIX = "i18n:"
_INTERP_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")
_FALLBACK_LANG = "en"


def parse_i18n_key(value: Any) -> tuple[str, dict[str, Any]] | None:
    """Parse a prefixed string into ``(key, args)``.

    Returns ``None`` for non-strings or strings without the ``i18n:`` prefix.
    Malformed JSON args are logged and dropped — the key still resolves.
    """
    if not isinstance(value, str) or not value.startswith(PREFIX):
        return None
    body = value[len(PREFIX):]
    brace_idx = body.find("{")
    if brace_idx == -1:
        return body, {}
    key = body[:brace_idx]
    try:
        args = json.loads(body[brace_idx:])
    except json.JSONDecodeError as exc:
        logger.warning("i18n args JSON parse failed in %r: %s", value, exc)
        return key, {}
    if not isinstance(args, dict):
        logger.warning("i18n args not a JSON object in %r; ignoring", value)
        return key, {}
    return key, args


def _lookup_nested(tree: dict, dotted_key: str) -> str | None:
    """Walk a dotted key through a nested dict. Returns the leaf string or None."""
    node: Any = tree
    for part in dotted_key.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node if isinstance(node, str) else None


def _interpolate(template: str, args: dict[str, Any]) -> str:
    """Substitute ``{{var}}`` placeholders in template with ``args[var]``."""
    def replace(match: re.Match) -> str:
        return str(args.get(match.group(1), match.group(0)))
    return _INTERP_RE.sub(replace, template)


def _deep_merge(target: dict, source: dict) -> None:
    """Recursively merge ``source`` into ``target`` in place; source overrides."""
    for key, value in source.items():
        if key in target and isinstance(target[key], dict) and isinstance(value, dict):
            _deep_merge(target[key], value)
        else:
            target[key] = value


class Catalog:
    """Translation catalog loaded from ``<tests_dir>/translations/*.toml``."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._loaded_from: Path | None = None

    def load(self, tests_path: Path) -> None:
        """Read and merge every ``*.toml`` under ``tests_path/translations/``.

        ``common.toml`` is loaded first; remaining files merge alphabetically,
        each overriding earlier entries. Missing directory is not an error —
        catalog is just empty.
        """
        translations_dir = tests_path / "translations"
        if not translations_dir.is_dir():
            logger.debug("No translations directory at %s", translations_dir)
            self._data = {}
            self._loaded_from = None
            return

        files = sorted(translations_dir.glob("*.toml"))
        files.sort(key=lambda p: (p.name != "common.toml", p.name))

        merged: dict[str, Any] = {}
        for path in files:
            try:
                with path.open("rb") as f:
                    data = tomli.load(f)
            except (OSError, tomli.TOMLDecodeError) as exc:
                logger.warning("Failed to load %s: %s", path, exc)
                continue
            _deep_merge(merged, data)

        self._data = merged
        self._loaded_from = translations_dir
        logger.info(
            "Loaded translation catalog from %s (%d languages)",
            translations_dir,
            len(self._data),
        )

    @property
    def data(self) -> dict[str, Any]:
        """The merged catalog as a nested dict, language-first."""
        return self._data

    @property
    def is_empty(self) -> bool:
        return not self._data

    def render(self, value: Any, lang: str) -> Any:
        """Render ``i18n:`` keys to prose. Walks dicts/lists recursively.

        Non-prefixed strings, non-strings, and unparseable JSON args pass through
        unchanged. Missing keys fall back to English; missing in both surface
        the raw key as a visible debug signal.
        """
        if isinstance(value, dict):
            return {k: self.render(v, lang) for k, v in value.items()}
        if isinstance(value, list):
            return [self.render(item, lang) for item in value]
        parsed = parse_i18n_key(value)
        if parsed is None:
            return value
        key, args = parsed
        template = _lookup_nested(self._data.get(lang, {}), key)
        if template is None and lang != _FALLBACK_LANG:
            template = _lookup_nested(self._data.get(_FALLBACK_LANG, {}), key)
        if template is None:
            logger.debug("i18n key %r not in %s or %s; emitting raw key", key, lang, _FALLBACK_LANG)
            return key
        return _interpolate(template, args)


_catalog = Catalog()
_loaded = False


def get_catalog() -> Catalog:
    """Return the module-level catalog, loading lazily on first access."""
    global _loaded  # noqa: PLW0603
    if not _loaded:
        from hardpy.common.config import ConfigManager

        tests_path = ConfigManager.get_tests_path()
        if tests_path is not None:
            _catalog.load(Path(tests_path))
        _loaded = True
    return _catalog


def reset_catalog_for_tests() -> None:
    """Reset the module-level catalog. Test-only helper."""
    global _loaded  # noqa: PLW0603
    _catalog._data = {}  # noqa: SLF001
    _catalog._loaded_from = None  # noqa: SLF001
    _loaded = False
