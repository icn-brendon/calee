"""Storage schema migrations for the Calee integration.

Each migration function takes the full storage dict and returns the
updated dict.  Migrations are applied in order when the stored version
is older than STORAGE_VERSION.
"""

from __future__ import annotations

import logging
from typing import Any

from .const import STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)


def migrate(data: dict[str, Any]) -> dict[str, Any]:
    """Apply all pending migrations and return the updated data."""
    version = data.get("version", 1)

    if version > STORAGE_VERSION:
        _LOGGER.warning(
            "Storage version %s is newer than code version %s — skipping migrations",
            version,
            STORAGE_VERSION,
        )
        return data

    # Future migrations go here, e.g.:
    # if version < 2:
    #     data = _migrate_v1_to_v2(data)
    #     version = 2

    data["version"] = STORAGE_VERSION
    return data


# ── Migration stubs ──────────────────────────────────────────────────
# Uncomment and implement when STORAGE_VERSION increments.
#
# def _migrate_v1_to_v2(data: dict[str, Any]) -> dict[str, Any]:
#     """Example: add 'color' field to events."""
#     for event in data.get("events", []):
#         event.setdefault("color", "")
#     _LOGGER.info("Migrated storage from v1 → v2")
#     return data
