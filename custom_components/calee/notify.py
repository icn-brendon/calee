"""Notification system for the Calee integration.

Provides shift reminder notifications, morning summaries, and
notification action handling for the Companion app.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Final

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import (
    DEFAULT_MORNING_SUMMARY_ENABLED,
    DEFAULT_MORNING_SUMMARY_HOUR,
    DEFAULT_NOTIFICATION_TARGET,
    DEFAULT_NOTIFICATIONS_ENABLED,
    DEFAULT_REMINDER_CALENDARS,
    DEFAULT_REMINDER_MINUTES,
    DEFAULT_TIME_FORMAT,
    DOMAIN,
    PANEL_URL,
)
from .db.base import AbstractPlannerStore
from .notification_utils import resolve_notification_target

_LOGGER = logging.getLogger(__name__)

# Actionable notification categories (Companion app).
NOTIFICATION_CATEGORY: Final = "calee_shift_reminder"

# Action identifiers sent back from Companion.
ACTION_OPEN_PLANNER: Final = "CALEE_OPEN"
ACTION_SNOOZE_15: Final = "CALEE_SNOOZE_15"
ACTION_SNOOZE_60: Final = "CALEE_SNOOZE_60"

# Keys for per-entry notification state stored in hass.data[DOMAIN][entry_id].
_KEY_NOTIFIED_EVENTS: Final = "notified_events"
_KEY_MORNING_SENT_DATE: Final = "morning_sent_date"


def _reminder_calendar_ids(
    store: AbstractPlannerStore,
    entry: ConfigEntry,
) -> list[str]:
    """Return the calendar IDs that should participate in reminders."""

    configured = entry.options.get("reminder_calendars", DEFAULT_REMINDER_CALENDARS)
    if isinstance(configured, list):
        calendar_ids = [calendar_id for calendar_id in configured if calendar_id]
        if calendar_ids:
            return calendar_ids
    return list(store.get_calendars().keys())


async def async_setup_shift_reminders(
    hass: HomeAssistant,
    store: AbstractPlannerStore,
    entry: ConfigEntry,
) -> list:
    """Set up the shift reminder system.

    Returns a list of cancel callbacks for cleanup.
    """
    # Initialise per-entry notification state.
    entry_data = hass.data[DOMAIN][entry.entry_id]
    entry_data.setdefault(_KEY_NOTIFIED_EVENTS, set())

    # Restore morning summary sent date from persisted options (survives restart).
    persisted_sent = entry.options.get("_morning_sent_date")
    if persisted_sent:
        try:
            from datetime import date as _date_type
            entry_data[_KEY_MORNING_SENT_DATE] = _date_type.fromisoformat(persisted_sent)
        except (ValueError, TypeError):
            entry_data.setdefault(_KEY_MORNING_SENT_DATE, None)
    else:
        entry_data.setdefault(_KEY_MORNING_SENT_DATE, None)

    cancel_callbacks: list = []

    # Per-minute check for shift reminders.
    async def _minute_tick(_now: object) -> None:
        notifications_enabled = entry.options.get(
            "notifications_enabled", DEFAULT_NOTIFICATIONS_ENABLED
        )
        if not notifications_enabled:
            return
        await async_check_and_send_reminders(hass, store, entry)

    cancel_reminder = async_track_time_interval(
        hass, _minute_tick, timedelta(minutes=1)
    )
    cancel_callbacks.append(cancel_reminder)

    # Daily morning summary — fires every minute but only sends once per day
    # when the configured hour is reached.
    async def _morning_check(_now: object) -> None:
        morning_enabled = entry.options.get(
            "morning_summary_enabled", DEFAULT_MORNING_SUMMARY_ENABLED
        )
        if not morning_enabled:
            return

        notifications_enabled = entry.options.get(
            "notifications_enabled", DEFAULT_NOTIFICATIONS_ENABLED
        )
        if not notifications_enabled:
            return

        now = dt_util.now()
        summary_hour = entry.options.get(
            "morning_summary_hour", DEFAULT_MORNING_SUMMARY_HOUR
        )

        edata = hass.data[DOMAIN][entry.entry_id]
        sent_date = edata.get(_KEY_MORNING_SENT_DATE)
        if now.hour == summary_hour and sent_date != now.date():
            sent = await async_send_morning_summary(hass, store, entry)
            if sent:
                # Mark sent AFTER successful send so failures can retry.
                edata[_KEY_MORNING_SENT_DATE] = now.date()
                # Persist to entry options so it survives restart.
                new_opts = dict(entry.options)
                new_opts["_morning_sent_date"] = now.date().isoformat()
                hass.config_entries.async_update_entry(entry, options=new_opts)

    cancel_morning = async_track_time_interval(
        hass, _morning_check, timedelta(minutes=1)
    )
    cancel_callbacks.append(cancel_morning)

    # Register notification action listener for Companion app — only once
    # globally, not per config entry.
    if not hass.data.get("calee_notification_listener_registered"):
        cancel_action = _register_notification_actions(hass)
        cancel_callbacks.append(cancel_action)
        hass.data["calee_notification_listener_registered"] = True

    _LOGGER.info("Shift reminder system initialised")
    return cancel_callbacks


async def async_check_and_send_reminders(
    hass: HomeAssistant,
    store: AbstractPlannerStore,
    entry: ConfigEntry,
) -> None:
    """Check for shifts needing reminders and send notifications."""
    reminder_minutes = entry.options.get("reminder_minutes", DEFAULT_REMINDER_MINUTES)
    if reminder_minutes <= 0:
        return

    now = dt_util.now()

    # Get events from all configured reminder calendars.
    reminder_calendars = _reminder_calendar_ids(store, entry)
    events = []
    for cal_id in reminder_calendars:
        events.extend(store.get_active_events(calendar_id=cal_id))

    notified: set[str] = hass.data[DOMAIN][entry.entry_id][_KEY_NOTIFIED_EVENTS]
    time_format = entry.options.get("time_format", DEFAULT_TIME_FORMAT)

    # Prune event IDs where the shift has already ended to prevent unbounded
    # growth of the notified set.  Also dismiss stale persistent notifications.
    active_ids = {e.id for e in events}
    stale_ids = set()
    for eid in notified:
        if eid not in active_ids:
            stale_ids.add(eid)
            continue
        # Also prune if the shift's end time is in the past.
        ev = next((e for e in events if e.id == eid), None)
        if ev is not None:
            end_dt = _parse_datetime(ev.end)
            if end_dt is not None and end_dt <= now:
                stale_ids.add(eid)
    for eid in stale_ids:
        await hass.services.async_call(
            "persistent_notification",
            "dismiss",
            {"notification_id": f"calee_shift_{eid}"},
        )
    notified -= stale_ids

    for event in events:
        start = _parse_datetime(event.start)
        if start is None:
            continue

        # Only consider shifts in the next 24 hours.
        if start > now + timedelta(hours=24):
            continue

        # Already past — no reminder needed.
        if start <= now:
            continue

        reminder_time = start - timedelta(minutes=reminder_minutes)

        # Should we send now?
        if reminder_time <= now < start:
            # Check if snoozed.
            if event.snooze_until:
                snooze_dt = _parse_datetime(event.snooze_until)
                if snooze_dt and now < snooze_dt:
                    continue

            # Check if already notified this session.
            if event.id in notified:
                continue

            minutes_until = int((start - now).total_seconds() / 60)
            target = entry.options.get(
                "notification_target", DEFAULT_NOTIFICATION_TARGET
            )
            await _send_shift_notification(
                hass, event, start, minutes_until, target,
                time_format=time_format,
            )
            notified.add(event.id)


async def _send_shift_notification(
    hass: HomeAssistant,
    event,
    start: datetime,
    minutes_before: int,
    target: str = "",
    time_format: str = "12h",
) -> None:
    """Send a shift reminder via HA's persistent notification + mobile."""
    local_start = dt_util.as_local(start)
    fmt = "%I:%M %p" if time_format == "12h" else "%H:%M"
    title = f"Shift in {minutes_before} minutes"
    message = f"{event.title} starts at {local_start.strftime(fmt)}"

    # Persistent notification (shows in HA sidebar) — always available.
    await hass.services.async_call(
        "persistent_notification",
        "create",
        {
            "title": title,
            "message": message,
            "notification_id": f"calee_shift_{event.id}",
        },
    )

    # Mobile notification via notify service (if configured and available).
    notify_target = resolve_notification_target(hass, target)
    if notify_target is None:
        _LOGGER.debug(
            "Notify target %r not available, skipping mobile push for event %s",
            target,
            event.id,
        )
        return

    service_data = {
        "title": title,
        "message": message,
        "data": {
            "actions": [
                {"action": f"CALEE_OPEN_{event.id}", "title": "Open Planner", "uri": PANEL_URL},
                {"action": f"CALEE_SNOOZE_15_{event.id}", "title": "Snooze 15min"},
                {"action": f"CALEE_SNOOZE_60_{event.id}", "title": "Snooze 1hr"},
            ],
            "action_data": {"event_id": event.id},
            "url": PANEL_URL,
            "tag": f"calee_shift_{event.id}",
        },
    }

    try:
        await hass.services.async_call(
            "notify", notify_target, service_data
        )
    except Exception:
        _LOGGER.debug(
            "Could not send mobile notification for event %s", event.id
        )


async def async_send_morning_summary(
    hass: HomeAssistant,
    store: AbstractPlannerStore,
    entry: ConfigEntry,
) -> bool:
    """Send a morning summary notification."""
    today = dt_util.now().date()
    today_iso = today.isoformat()
    time_format = entry.options.get("time_format", DEFAULT_TIME_FORMAT)
    fmt = "%I:%M %p" if time_format == "12h" else "%H:%M"

    # Today's shifts — compare in local time for correct day attribution.
    reminder_calendars = _reminder_calendar_ids(store, entry)
    all_shifts = []
    for cal_id in reminder_calendars:
        all_shifts.extend(store.get_active_events(calendar_id=cal_id))
    shifts = []
    for ev in all_shifts:
        start_dt = _parse_datetime(ev.start)
        if start_dt is None:
            continue
        if dt_util.as_local(start_dt).date() == today:
            shifts.append(ev)

    # Tasks due today.
    all_tasks = store.get_active_tasks()
    tasks_due = [
        t
        for t in all_tasks
        if t.due and t.due[:10] == today_iso and not t.completed
    ]

    # Shopping items.
    shopping = [
        t
        for t in store.get_active_tasks(list_id="shopping")
        if not t.completed
    ]

    if not shifts and not tasks_due and not shopping:
        return False  # Nothing to report.

    lines: list[str] = []
    if shifts:
        lines.append(f"{len(shifts)} shift(s) today")
        for s in shifts:
            start_dt = _parse_datetime(s.start)
            if start_dt:
                local_start = dt_util.as_local(start_dt)
                time_str = local_start.strftime(fmt)
            else:
                time_str = ""
            lines.append(f"  - {s.title} at {time_str}")
    if tasks_due:
        lines.append(f"{len(tasks_due)} task(s) due")
        for t in tasks_due:
            lines.append(f"  - {t.title}")
    if shopping:
        lines.append(f"{len(shopping)} shopping item(s)")

    message = "\n".join(lines)

    await hass.services.async_call(
        "persistent_notification",
        "create",
        {
            "title": "Calee — Today",
            "message": message,
            "notification_id": "calee_morning",
        },
    )

    # Also send as mobile notification (if service is available).
    target = entry.options.get("notification_target", DEFAULT_NOTIFICATION_TARGET)
    notify_target = resolve_notification_target(hass, target)
    if notify_target is None:
        _LOGGER.debug(
            "Notify target %r not available, skipping morning summary mobile push",
            target,
        )
        return True

    try:
        await hass.services.async_call(
            "notify",
            notify_target,
            {
                "title": "Calee — Today",
                "message": message,
                "data": {
                    "url": PANEL_URL,
                    "tag": "calee_morning",
                },
            },
        )
    except Exception:
        _LOGGER.debug("Could not send morning summary mobile notification")
    return True


@callback
def _register_notification_actions(
    hass: HomeAssistant,
):
    """Register listener for Companion app notification actions.

    Returns a cancel callback.
    """

    async def _handle_notification_action(event) -> None:
        """Handle mobile_app_notification_action events."""
        action = event.data.get("action", "")

        if action.startswith("CALEE_SNOOZE_15_"):
            await _handle_snooze_from_notification(hass, event, 15)
        elif action.startswith("CALEE_SNOOZE_60_"):
            await _handle_snooze_from_notification(hass, event, 60)
        elif action.startswith("CALEE_OPEN"):
            # No server-side action needed — the Companion app navigates via
            # the ``uri`` key included in the action data.
            pass

    return hass.bus.async_listen(
        "mobile_app_notification_action", _handle_notification_action
    )


async def _handle_snooze_from_notification(
    hass: HomeAssistant,
    event,
    minutes: int,
) -> None:
    """Snooze a shift reminder triggered by a notification action."""
    # Prefer event_id from action_data (unique per event), fall back to tag.
    action_data = event.data.get("action_data", {})
    event_id = action_data.get("event_id") if isinstance(action_data, dict) else None

    if not event_id:
        tag = event.data.get("tag", "")
        # Extract event_id from the tag format "calee_shift_{event_id}".
        if not tag.startswith("calee_shift_"):
            _LOGGER.debug(
                "Notification action tag %r does not match expected format", tag
            )
            return
        event_id = tag.removeprefix("calee_shift_")

    # Find the correct config entry by checking which entry's store owns this event.
    data = hass.data.get(DOMAIN, {})
    for _entry_id, entry_data in data.items():
        if not isinstance(entry_data, dict):
            continue
        entry_store = entry_data.get("store")
        if entry_store is None:
            continue
        if entry_store.get_event(event_id) is None:
            continue

        api = entry_data.get("api")
        if api is None:
            continue

        try:
            await api.async_snooze_reminder(event_id, minutes)
            _LOGGER.info(
                "Snoozed event %s for %d minutes via notification action",
                event_id,
                minutes,
            )
        except Exception:
            _LOGGER.exception("Failed to snooze event %s", event_id)
        # Remove from per-entry notified set so it can re-fire after snooze expires.
        notified = entry_data.get(_KEY_NOTIFIED_EVENTS)
        if notified is not None:
            notified.discard(event_id)
        return

    _LOGGER.warning("No config entry found with event %s for snooze action", event_id)


def _parse_datetime(iso_str: str | None) -> datetime | None:
    """Parse an ISO 8601 string into a timezone-aware datetime."""
    if not iso_str:
        return None
    try:
        dt = dt_util.parse_datetime(iso_str)
        if dt is not None and dt.tzinfo is None:
            dt = dt.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
        return dt
    except (ValueError, TypeError):
        return None
