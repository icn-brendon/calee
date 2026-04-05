"""Notification helpers for the Calee integration.

Milestone 4 will implement the full notification system. This stub
defines the interface and constants so other modules can reference it.
"""

from __future__ import annotations

import logging
from typing import Final

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

# Actionable notification categories (Companion app).
NOTIFICATION_CATEGORY: Final = "calee_shift_reminder"

# Action identifiers sent back from Companion.
ACTION_OPEN_PLANNER: Final = "OPEN_PLANNER"
ACTION_SNOOZE_15: Final = "SNOOZE_15"
ACTION_SNOOZE_60: Final = "SNOOZE_60"
ACTION_MARK_DONE: Final = "MARK_DONE"
ACTION_MOVE_TOMORROW: Final = "MOVE_TOMORROW"


async def async_send_shift_reminder(
    hass: HomeAssistant,
    event_id: str,
    title: str,
    message: str,
    target: str | None = None,
) -> None:
    """Send a shift reminder notification via Companion.

    Placeholder — full implementation in Milestone 4.
    """
    _LOGGER.debug(
        "Shift reminder (stub): event=%s title=%s target=%s",
        event_id,
        title,
        target,
    )
