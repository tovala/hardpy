# Copyright (c) 2026 Everypin
# GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import annotations

from abc import ABC, abstractmethod
from json import dumps
from typing import TYPE_CHECKING, Any

from glom import PathAccessError, assign, glom

from hardpy.pytest_hardpy.db.const import (
    DatabaseField as DF,  # noqa: N817  # noqa: N817
)

if TYPE_CHECKING:
    from pydantic import BaseModel

class StorageInterface(ABC):
    """Interface for storage implementations."""

    @abstractmethod
    def get_field(self, key: str) -> Any:  # noqa: ANN401
        """Get field from the storage.

        Args:
            key (str): Field key, supports nested access with dots

        Returns:
            Any: Field value
        """

    @abstractmethod
    def update_doc_value(self, key: str, value: Any) -> None:  # noqa: ANN401
        """Update document value in memory (does not persist).

        Args:
            key (str): Field key, supports nested access with dots
            value (Any): Value to set
        """

    @abstractmethod
    def update_db(self) -> None:
        """Persist in-memory document to storage backend."""

    @abstractmethod
    def update_doc(self) -> None:
        """Reload document from storage backend to memory."""

    @abstractmethod
    def get_document(self) -> BaseModel:
        """Get full document with schema validation.

        Returns:
            BaseModel: Validated document model
        """

    @abstractmethod
    def clear(self) -> None:
        """Clear storage and reset to initial state."""

    @abstractmethod
    def compact(self) -> None:
        """Optimize storage (implementation-specific, may be no-op)."""


def create_default_doc_structure(doc_id: str, doc_id_for_rev: str) -> dict:
    """Create default document structure with standard fields.

    Args:
        doc_id (str): Document ID to use
        doc_id_for_rev (str): Document ID for _rev field (for JSON compatibility)

    Returns:
        dict: Default document structure
    """
    return {
        "_id": doc_id,
        "_rev": doc_id_for_rev,
        DF.MODULES: {},
        DF.DUT: {},
        DF.TEST_STAND: {},
        DF.PROCESS: {},
    }


def update_doc_value(doc: dict, key: str, value: Any) -> None:  # noqa: ANN401
    """Update document value in memory (does not persist).

    Args:
        doc (dict): Storage document
        key (str): Field key, supports nested access with dots
        value (Any): Value to set
    """
    try:
        dumps(value)
    except Exception:  # noqa: BLE001
        value = dumps(value, default=str)

    if "." in key:
        assign(doc, key, value, missing=dict)
    else:
        doc[key] = value


def get_field(doc: dict, key: str) -> Any:  # noqa: ANN401
    """Get field from the storage.

    Args:
        doc (dict): Storage document
        key (str): Field key, supports nested access with dots

    Returns:
        Any: Field value, or None if path does not exist
    """
    try:
        return glom(doc, key)
    except PathAccessError:
        return None
