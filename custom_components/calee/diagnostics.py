"""Diagnostics support for the Calee integration.

Redacts sensitive fields (event titles, notes, tokens) before
returning data so diagnostics can be shared safely in bug reports.
"""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, REDACT_KEYS

_REDACTED = "**REDACTED**"


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if data is None:
        return {"error": "integration not loaded"}

    store = data["store"]

    raw: dict[str, Any] = {
        "calendars": [c.to_dict() for c in store.get_calendars().values()],
        "calendars_count": len(store.get_calendars()),
        "events_active": len(store.get_active_events()),
        "templates_count": len(store.get_templates()),
        "lists": [lst.to_dict() for lst in store.get_lists().values()],
        "tasks_active": len(store.get_active_tasks()),
        "roles_count": len(store.get_roles()),
        # Include a sample of recent audit entries (redacted).
        "recent_audit": [
            _redact_dict(a.to_dict()) for a in store.get_audit_log(limit=10)
        ],
    }

    return _redact_dict(raw)


def _redact_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Recursively redact sensitive keys."""
    result: dict[str, Any] = {}
    for key, value in data.items():
        if key in REDACT_KEYS:
            result[key] = _REDACTED
        elif isinstance(value, dict):
            result[key] = _redact_dict(value)
        elif isinstance(value, list):
            result[key] = _redact_list(value)
        else:
            result[key] = value
    return result


def _redact_list(data: list[Any]) -> list[Any]:
    """Recursively redact items in a list."""
    result: list[Any] = []
    for item in data:
        if isinstance(item, dict):
            result.append(_redact_dict(item))
        elif isinstance(item, list):
            result.append(_redact_list(item))
        else:
            result.append(item)
    return result
