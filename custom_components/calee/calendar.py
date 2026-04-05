"""Calendar entity platform for the Calee integration.

Creates one CalendarEntity per PlannerCalendar (Work Shifts, Family Shared,
Personal, Team / Shared, plus any user-created calendars).
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, time

from homeassistant.components.calendar import (
    CalendarEntity,
    CalendarEntityFeature,
    CalendarEvent,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .api import PlannerAPI
from .const import DOMAIN
from .models import PlannerCalendar, PlannerEvent
from .store import PlannerStore

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up calendar entities from a config entry."""
    data = hass.data[DOMAIN][entry.entry_id]
    store: PlannerStore = data["store"]
    api: PlannerAPI = data["api"]

    entities = [
        CaleeCalendarEntity(store, api, cal)
        for cal in store.get_calendars().values()
    ]
    async_add_entities(entities, update_before_add=True)


class CaleeCalendarEntity(CalendarEntity):
    """A Home Assistant calendar entity backed by a PlannerCalendar."""

    _attr_has_entity_name = True
    _attr_supported_features = (
        CalendarEntityFeature.CREATE_EVENT
        | CalendarEntityFeature.DELETE_EVENT
        | CalendarEntityFeature.UPDATE_EVENT
    )

    def __init__(
        self,
        store: PlannerStore,
        api: PlannerAPI,
        calendar: PlannerCalendar,
    ) -> None:
        self._store = store
        self._api = api
        self._calendar = calendar
        self._attr_unique_id = f"{DOMAIN}_{calendar.id}"
        self._attr_name = calendar.name
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, "calee")},
            name="Calee",
            manufacturer="Calee",
            entry_type=DeviceEntryType.SERVICE,
        )
        self._event: CalendarEvent | None = None

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next upcoming event."""
        return self._event

    async def async_update(self) -> None:
        """Refresh the 'next event' state."""
        now = dt_util.now()
        events = self._store.get_active_events(calendar_id=self._calendar.id)
        self._event = _find_next_event(events, now)

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Return events in the requested time range, including expanded recurring instances."""
        # Use the API's recurring event expansion to get both one-off and
        # virtual recurring instances within the range.
        events = self._api.expand_recurring_events(
            start_date=start_date.date() if isinstance(start_date, datetime) else start_date,
            end_date=end_date.date() if isinstance(end_date, datetime) else end_date,
            calendar_id=self._calendar.id,
        )
        result: list[CalendarEvent] = []

        for ev in events:
            cal_event = _to_calendar_event(ev)
            if cal_event is None:
                continue
            # Normalise to datetime for cross-type comparison.
            ev_end = _to_comparable_dt(cal_event.end)
            ev_start = _to_comparable_dt(cal_event.start)
            # Filter to requested range.
            if ev_end < start_date:
                continue
            if ev_start > end_date:
                continue
            result.append(cal_event)

        return sorted(
            result,
            key=lambda e: _to_comparable_dt(e.start),
        )

    async def async_create_event(self, **kwargs: str) -> None:
        """Create a new event via the HA calendar UI."""
        dtstart = kwargs["dtstart"]
        dtend = kwargs["dtend"]
        summary = kwargs.get("summary", "")
        description = kwargs.get("description", "")

        start_iso = _dt_to_iso(dtstart)
        end_iso = _dt_to_iso(dtend)

        await self._api.async_add_shift(
            calendar_id=self._calendar.id,
            title=summary,
            start=start_iso,
            end=end_iso,
            note=description,
        )
        self.async_schedule_update_ha_state(True)

    async def async_delete_event(
        self,
        uid: str,
        recurrence_id: str | None = None,
        recurrence_range: str | None = None,
    ) -> None:
        """Delete (soft-delete) an event via the HA calendar UI."""
        await self._api.async_delete_shift(event_id=uid)
        self.async_schedule_update_ha_state(True)

    async def async_update_event(
        self,
        uid: str,
        event: dict,
        recurrence_id: str | None = None,
        recurrence_range: str | None = None,
    ) -> None:
        """Update an existing event via the HA calendar UI."""
        # Look up the current event to get its version for optimistic locking.
        planner_event = self._store.get_event(uid)
        if planner_event is None:
            _LOGGER.warning("Cannot update event %s: not found in store", uid)
            return

        title = event.get("summary")
        description = event.get("description")
        start_iso: str | None = None
        end_iso: str | None = None

        if "dtstart" in event:
            start_iso = _dt_to_iso(event["dtstart"])
        if "dtend" in event:
            end_iso = _dt_to_iso(event["dtend"])

        await self._api.async_update_shift(
            event_id=uid,
            version=planner_event.version,
            title=title,
            start=start_iso,
            end=end_iso,
            note=description,
        )
        self.async_schedule_update_ha_state(True)


# ── Helpers ──────────────────────────────────────────────────────────


def _dt_to_iso(value: date | datetime) -> str:
    """Convert a date or datetime to an ISO 8601 string.

    All-day events arrive as ``datetime.date``; timed events as
    ``datetime.datetime``.  For datetime values without a timezone,
    assume UTC.  All-day dates are stored as plain ISO date strings
    (e.g. ``"2026-04-07"``).
    """
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()
    # date (all-day event) — store as ISO date string, not a datetime.
    return value.isoformat()


def _to_calendar_event(ev: PlannerEvent) -> CalendarEvent | None:
    """Convert a PlannerEvent to a HA CalendarEvent.

    All-day events use ``datetime.date`` for start/end; timed events
    use ``datetime.datetime`` with timezone — matching HA calendar
    entity expectations.
    """
    if ev.all_day:
        # All-day events use date objects.
        try:
            start = date.fromisoformat(ev.start[:10])
            end = date.fromisoformat(ev.end[:10])
        except (ValueError, TypeError):
            return None
        return CalendarEvent(
            start=start,
            end=end,
            summary=ev.title,
            description=ev.note or None,
            uid=ev.id,
        )

    # Timed events use datetime objects.
    try:
        start_dt = dt_util.parse_datetime(ev.start)
        end_dt = dt_util.parse_datetime(ev.end)
    except (ValueError, TypeError):
        return None

    if start_dt is None or end_dt is None:
        return None

    # HA requires timed events to have timezone info.
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=UTC)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=UTC)

    return CalendarEvent(
        start=start_dt,
        end=end_dt,
        summary=ev.title,
        description=ev.note or None,
        uid=ev.id,
    )


def _to_comparable_dt(value: date | datetime) -> datetime:
    """Normalise a date or datetime to a timezone-aware datetime for comparison."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    return datetime.combine(value, time.min, tzinfo=UTC)


def _find_next_event(
    events: list[PlannerEvent], now: datetime
) -> CalendarEvent | None:
    """Return the soonest event that hasn't ended yet."""
    candidates: list[tuple[datetime, PlannerEvent]] = []
    for ev in events:
        cal_event = _to_calendar_event(ev)
        if cal_event is None:
            continue
        end_dt = _to_comparable_dt(cal_event.end)
        start_dt = _to_comparable_dt(cal_event.start)
        if end_dt >= now:
            candidates.append((start_dt, ev))

    if not candidates:
        return None

    candidates.sort(key=lambda c: c[0])
    return _to_calendar_event(candidates[0][1])
