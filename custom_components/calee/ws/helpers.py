"""Shared helper functions for Calee WebSocket handlers."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

from homeassistant.core import HomeAssistant

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)


def _get_store(hass: HomeAssistant) -> Any:
    """Return the first available PlannerStore."""
    domain_data = hass.data.get(DOMAIN, {})
    for entry_data in domain_data.values():
        if isinstance(entry_data, dict) and "store" in entry_data:
            return entry_data["store"]
    return None


def _get_api(hass: HomeAssistant) -> Any:
    """Return the first available PlannerAPI."""
    domain_data = hass.data.get(DOMAIN, {})
    for entry_data in domain_data.values():
        if isinstance(entry_data, dict) and "api" in entry_data:
            return entry_data["api"]
    return None


def _get_config_entry(hass: HomeAssistant) -> Any:
    """Return the first Calee config entry."""
    entries = hass.config_entries.async_entries(DOMAIN)
    return entries[0] if entries else None


def _filter_events_by_range(
    events: list[Any],
    range_start: str | None,
    range_end: str | None,
) -> list[Any]:
    """Filter events to those overlapping [range_start, range_end]."""
    filtered = []
    rs = _parse_date_loose(range_start) if range_start else None
    re = _parse_date_loose(range_end) if range_end else None

    for event in events:
        try:
            ev_start = datetime.fromisoformat(event.start).date() if event.start else None
            ev_end = datetime.fromisoformat(event.end).date() if event.end else ev_start
        except (ValueError, TypeError):
            filtered.append(event)  # include unparseable events
            continue

        if ev_start is None:
            filtered.append(event)
            continue

        # Event overlaps range if event_end >= range_start AND event_start <= range_end.
        if rs and ev_end and ev_end < rs:
            continue
        if re and ev_start > re:
            continue

        filtered.append(event)
    return filtered


def _parse_date_loose(value: str) -> date | None:
    """Parse an ISO date string, returning None on failure."""
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None
