"""Sensor entity platform for the Calee integration.

Exposes shift, task, and shopping sensors for automations and dashboards.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DEFAULT_BUDGET, DEFAULT_WEEK_START, DOMAIN
from .db.base import AbstractPlannerStore

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(minutes=1)

# Shared device info for all Calee sensors.
_DEVICE_INFO = DeviceInfo(
    identifiers={(DOMAIN, "calee")},
    name="Calee",
    manufacturer="Calee",
    entry_type=DeviceEntryType.SERVICE,
)

WORK_SHIFTS_CALENDAR_ID = "work_shifts"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensor entities from a config entry."""
    data = hass.data[DOMAIN][entry.entry_id]
    store: AbstractPlannerStore = data["store"]

    sensors: list[SensorEntity] = [
        CaleeCurrentShiftSensor(store),
        CaleeNextShiftSensor(store),
        CaleeShiftsTodaySensor(store),
        CaleeShiftsThisWeekSensor(store, entry),
        CaleeTasksDueTodaySensor(store),
        CaleeTasksOverdueSensor(store),
        CaleeInboxCountSensor(store),
        CaleeShoppingCountSensor(store, entry),
    ]
    async_add_entities(sensors, update_before_add=True)


# ── Helpers ─────────────────────────────────────────────────────────


def _parse_dt(iso_str: str) -> datetime | None:
    """Parse an ISO 8601 string into a timezone-aware datetime."""
    if not iso_str:
        return None
    try:
        dt = dt_util.parse_datetime(iso_str)
        if dt is not None and dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except (ValueError, TypeError):
        return None


def _week_bounds(today: date, week_start: str) -> tuple[date, date]:
    """Return (monday, sunday) or (sunday, saturday) for the week containing *today*."""
    days_since_start = (today.weekday() + 1) % 7 if week_start == "sunday" else today.weekday()
    start = today - timedelta(days=days_since_start)
    end = start + timedelta(days=6)
    return start, end


# ── Shift sensors ───────────────────────────────────────────────────


class CaleeCurrentShiftSensor(SensorEntity):
    """Sensor showing the current active shift, or 'off'."""

    _attr_has_entity_name = True
    _attr_name = "Current Shift"
    _attr_unique_id = f"{DOMAIN}_current_shift"
    _attr_icon = "mdi:briefcase-clock"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore) -> None:
        self._store = store

    async def async_update(self) -> None:
        now = dt_util.now()
        events = self._store.get_active_events(calendar_id=WORK_SHIFTS_CALENDAR_ID)

        for ev in events:
            start_dt = _parse_dt(ev.start)
            end_dt = _parse_dt(ev.end)
            if start_dt is None or end_dt is None:
                continue
            if start_dt <= now <= end_dt:
                total = (end_dt - start_dt).total_seconds()
                elapsed = (now - start_dt).total_seconds()
                remaining = (end_dt - now).total_seconds()
                progress = round(elapsed / total * 100, 1) if total > 0 else 0.0

                # Look up template for emoji.
                emoji = ""
                if ev.template_id:
                    tpl = self._store.get_template(ev.template_id)
                    if tpl:
                        emoji = tpl.emoji

                self._attr_native_value = ev.title
                self._attr_extra_state_attributes = {
                    "start": ev.start,
                    "end": ev.end,
                    "calendar_id": ev.calendar_id,
                    "progress_percent": progress,
                    "elapsed_minutes": round(elapsed / 60, 1),
                    "remaining_minutes": round(remaining / 60, 1),
                    "emoji": emoji,
                    "template_id": ev.template_id,
                }
                return

        self._attr_native_value = "off"
        self._attr_extra_state_attributes = {}


class CaleeNextShiftSensor(SensorEntity):
    """Sensor showing the next upcoming shift start time."""

    _attr_has_entity_name = True
    _attr_name = "Next Shift"
    _attr_unique_id = f"{DOMAIN}_next_shift"
    _attr_icon = "mdi:calendar-arrow-right"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore) -> None:
        self._store = store

    async def async_update(self) -> None:
        now = dt_util.now()
        events = self._store.get_active_events(calendar_id=WORK_SHIFTS_CALENDAR_ID)

        best = None
        best_start: datetime | None = None

        for ev in events:
            start_dt = _parse_dt(ev.start)
            if start_dt is None:
                continue
            if start_dt > now and (best_start is None or start_dt < best_start):
                best = ev
                best_start = start_dt

        if best is not None and best_start is not None:
            diff = best_start - now
            minutes = diff.total_seconds() / 60

            emoji = ""
            if best.template_id:
                tpl = self._store.get_template(best.template_id)
                if tpl:
                    emoji = tpl.emoji

            self._attr_native_value = best_start
            self._attr_extra_state_attributes = {
                "shift_title": best.title,
                "start": best.start,
                "end": best.end,
                "calendar_id": best.calendar_id,
                "starts_in_minutes": round(minutes, 1),
                "starts_in_hours": round(minutes / 60, 1),
                "emoji": emoji,
                "template_id": best.template_id,
            }
        else:
            self._attr_native_value = None
            self._attr_extra_state_attributes = {
                "shift_title": "none",
            }


class CaleeShiftsTodaySensor(SensorEntity):
    """Sensor counting shifts scheduled for today."""

    _attr_has_entity_name = True
    _attr_name = "Shifts Today"
    _attr_unique_id = f"{DOMAIN}_shifts_today"
    _attr_icon = "mdi:calendar-today"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore) -> None:
        self._store = store

    async def async_update(self) -> None:
        now = dt_util.now()
        today = now.date()
        day_start = datetime.combine(today, datetime.min.time(), tzinfo=now.tzinfo)
        day_end = day_start + timedelta(days=1)

        events = self._store.get_active_events(calendar_id=WORK_SHIFTS_CALENDAR_ID)
        shifts: list[dict] = []

        for ev in events:
            start_dt = _parse_dt(ev.start)
            end_dt = _parse_dt(ev.end)
            if start_dt is None or end_dt is None:
                continue
            # Overlaps today if event ends after day start and starts before day end.
            if end_dt > day_start and start_dt < day_end:
                shifts.append({
                    "title": ev.title,
                    "start": ev.start,
                    "end": ev.end,
                    "calendar_id": ev.calendar_id,
                })

        self._attr_native_value = len(shifts)
        self._attr_extra_state_attributes = {"shifts": shifts}


class CaleeShiftsThisWeekSensor(SensorEntity):
    """Sensor counting shifts scheduled for this week."""

    _attr_has_entity_name = True
    _attr_name = "Shifts This Week"
    _attr_unique_id = f"{DOMAIN}_shifts_this_week"
    _attr_icon = "mdi:calendar-week"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore, entry: ConfigEntry) -> None:
        self._store = store
        self._entry = entry

    async def async_update(self) -> None:
        now = dt_util.now()
        today = now.date()
        week_start_pref = self._entry.options.get("week_start", DEFAULT_WEEK_START)
        week_start, week_end = _week_bounds(today, week_start_pref)

        ws_start = datetime.combine(week_start, datetime.min.time(), tzinfo=now.tzinfo)
        ws_end = datetime.combine(week_end, datetime.max.time(), tzinfo=now.tzinfo)

        events = self._store.get_active_events(calendar_id=WORK_SHIFTS_CALENDAR_ID)
        shifts: list[dict] = []
        total_seconds = 0.0

        for ev in events:
            start_dt = _parse_dt(ev.start)
            end_dt = _parse_dt(ev.end)
            if start_dt is None or end_dt is None:
                continue
            if end_dt > ws_start and start_dt < ws_end:
                duration = (end_dt - start_dt).total_seconds()
                total_seconds += duration
                shifts.append({
                    "title": ev.title,
                    "start": ev.start,
                    "end": ev.end,
                    "calendar_id": ev.calendar_id,
                })

        self._attr_native_value = len(shifts)
        self._attr_extra_state_attributes = {
            "total_hours": round(total_seconds / 3600, 1),
            "shifts": shifts,
        }


# ── Task sensors ────────────────────────────────────────────────────


class CaleeTasksDueTodaySensor(SensorEntity):
    """Sensor counting tasks due today."""

    _attr_has_entity_name = True
    _attr_name = "Tasks Due Today"
    _attr_unique_id = f"{DOMAIN}_tasks_due_today"
    _attr_icon = "mdi:checkbox-marked-circle-outline"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore) -> None:
        self._store = store

    async def async_update(self) -> None:
        today = dt_util.now().date()
        all_tasks = self._store.get_active_tasks()
        due_today: list[dict] = []

        for task in all_tasks:
            if task.completed or not task.due:
                continue
            try:
                due_date = date.fromisoformat(task.due[:10])
            except (ValueError, TypeError):
                continue
            if due_date == today:
                due_today.append({
                    "title": task.title,
                    "list_id": task.list_id,
                    "due": task.due,
                })

        self._attr_native_value = len(due_today)
        self._attr_extra_state_attributes = {"tasks": due_today}


class CaleeTasksOverdueSensor(SensorEntity):
    """Sensor counting overdue tasks."""

    _attr_has_entity_name = True
    _attr_name = "Tasks Overdue"
    _attr_unique_id = f"{DOMAIN}_tasks_overdue"
    _attr_icon = "mdi:alert-circle"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore) -> None:
        self._store = store

    async def async_update(self) -> None:
        today = dt_util.now().date()
        all_tasks = self._store.get_active_tasks()
        overdue: list[dict] = []

        for task in all_tasks:
            if task.completed or not task.due:
                continue
            try:
                due_date = date.fromisoformat(task.due[:10])
            except (ValueError, TypeError):
                continue
            if due_date < today:
                overdue.append({
                    "title": task.title,
                    "list_id": task.list_id,
                    "due": task.due,
                    "days_overdue": (today - due_date).days,
                })

        self._attr_native_value = len(overdue)
        self._attr_extra_state_attributes = {"tasks": overdue}


class CaleeInboxCountSensor(SensorEntity):
    """Sensor counting incomplete tasks in the Inbox list."""

    _attr_has_entity_name = True
    _attr_name = "Inbox Count"
    _attr_unique_id = f"{DOMAIN}_inbox_count"
    _attr_icon = "mdi:inbox"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore) -> None:
        self._store = store

    async def async_update(self) -> None:
        tasks = self._store.get_active_tasks(list_id="inbox")
        incomplete = [t for t in tasks if not t.completed]
        self._attr_native_value = len(incomplete)


# ── Shopping sensors ────────────────────────────────────────────────


class CaleeShoppingCountSensor(SensorEntity):
    """Sensor counting uncompleted shopping items with price/budget info."""

    _attr_has_entity_name = True
    _attr_name = "Shopping Count"
    _attr_unique_id = f"{DOMAIN}_shopping_count"
    _attr_icon = "mdi:cart"
    _attr_device_info = _DEVICE_INFO
    should_poll = True

    def __init__(self, store: AbstractPlannerStore, entry: ConfigEntry) -> None:
        self._store = store
        self._entry = entry

    async def async_update(self) -> None:
        tasks = self._store.get_active_tasks(list_id="shopping")
        incomplete = [t for t in tasks if not t.completed]

        items = [t.title for t in incomplete]
        total_price = sum(t.price for t in incomplete if t.price is not None)
        budget = self._entry.options.get("budget", DEFAULT_BUDGET)
        budget_remaining = round(budget - total_price, 2) if budget else None

        self._attr_native_value = len(incomplete)
        self._attr_extra_state_attributes = {
            "items": items,
            "total_price": round(total_price, 2),
            "budget": budget,
            "budget_remaining": budget_remaining,
        }
