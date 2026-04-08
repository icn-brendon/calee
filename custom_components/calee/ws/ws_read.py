"""Read-only query WebSocket handlers for Calee."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from ..const import (
    DEFAULT_BUDGET,
    DEFAULT_CURRENCY,
    DEFAULT_MAX_EVENT_AGE_DAYS,
    DEFAULT_MORNING_SUMMARY_ENABLED,
    DEFAULT_MORNING_SUMMARY_HOUR,
    DEFAULT_NOTIFICATION_TARGET,
    DEFAULT_NOTIFICATIONS_ENABLED,
    DEFAULT_REMINDER_CALENDARS,
    DEFAULT_REMINDER_MINUTES,
    DEFAULT_STRICT_PRIVACY,
    DEFAULT_TIME_FORMAT,
    DEFAULT_WEEK_START,
    VIRTUAL_VIEW_TODAY,
    VIRTUAL_VIEW_UPCOMING,
    WS_TYPE_AUDIT_LOG,
    WS_TYPE_CALENDARS,
    WS_TYPE_DELETED_ITEMS,
    WS_TYPE_EVENTS,
    WS_TYPE_EXPAND_RECURRING_EVENTS,
    WS_TYPE_GET_SETTINGS,
    WS_TYPE_LISTS,
    WS_TYPE_NOTIFICATION_RULES,
    WS_TYPE_NOTIFY_SERVICES,
    WS_TYPE_PRESETS,
    WS_TYPE_ROUTINES,
    WS_TYPE_TASKS,
    WS_TYPE_TEMPLATES,
)
from ..permissions import can_read, is_strict_privacy
from .helpers import (
    _filter_events_by_range,
    _get_api,
    _get_config_entry,
    _get_store,
)

_LOGGER = logging.getLogger(__name__)


# ── Calendars ────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CALENDARS,
    }
)
@callback
def ws_handle_calendars(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return calendars the requesting user can read.

    When no roles are configured, all calendars are returned (family
    default).  When roles exist, only calendars the user has an explicit
    role on (or calendars with no role assignments at all) are included.
    """
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    user_id = connection.user.id if connection.user else None
    user_is_admin = connection.user.is_admin if connection.user else False
    calendars = list(store.get_calendars().values())
    strict = is_strict_privacy(hass)

    # Filter by read permission when roles are configured, any
    # calendar has is_private set, or strict privacy is active.
    if user_id:
        has_roles = bool(store.get_roles())
        has_private = any(c.is_private for c in calendars)
        if has_roles or has_private or strict:
            calendars = [
                c for c in calendars
                if can_read(store, user_id, "calendar", c.id, strict=strict, is_admin=user_is_admin)
            ]

    result = [c.to_dict() for c in calendars]
    connection.send_result(msg["id"], result)


# ── Events ───────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_EVENTS,
        vol.Optional("calendar_id"): str,
        vol.Optional("start"): str,  # ISO 8601 date
        vol.Optional("end"): str,  # ISO 8601 date
    }
)
@callback
def ws_handle_events(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return active events, optionally filtered by calendar and date range.

    When roles are configured, events are limited to calendars the
    requesting user can read.
    """
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    events = store.get_active_events(calendar_id=msg.get("calendar_id"))

    # Per-user calendar filtering when roles are configured,
    # any calendar is private, or strict privacy is active.
    user_id = connection.user.id if connection.user else None
    user_is_admin = connection.user.is_admin if connection.user else False
    strict = is_strict_privacy(hass)
    if user_id:
        has_roles = bool(store.get_roles())
        has_private = any(
            c.is_private for c in store.get_calendars().values()
        )
        if has_roles or has_private or strict:
            events = [
                e for e in events
                if can_read(store, user_id, "calendar", e.calendar_id, strict=strict, is_admin=user_is_admin)
            ]

    # Optional date range filter.
    range_start = msg.get("start")
    range_end = msg.get("end")
    if range_start or range_end:
        events = _filter_events_by_range(events, range_start, range_end)

    result = [e.to_dict() for e in events]
    connection.send_result(msg["id"], result)


# ── Tasks ────────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_TASKS,
        vol.Optional("list_id"): str,
        vol.Optional("view"): vol.In([VIRTUAL_VIEW_TODAY, VIRTUAL_VIEW_UPCOMING]),
        vol.Optional("completed"): bool,
        vol.Optional("limit"): vol.All(int, vol.Range(min=1, max=5000)),
    }
)
@callback
def ws_handle_tasks(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return tasks, optionally filtered by list, virtual view, or status.

    Filters:
    - ``list_id`` -- restrict to a single list.
    - ``view``    -- virtual view ("today" / "upcoming").
    - ``completed`` -- ``true`` returns only completed tasks, ``false``
      (or omitted) returns only active tasks.
    - ``limit``   -- cap the number of returned tasks (default 500).

    When roles are configured, tasks are limited to lists the
    requesting user can read.
    """
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    # get_active_tasks returns non-deleted tasks (both completed and active).
    tasks = store.get_active_tasks(list_id=msg.get("list_id"))

    # Optional completed filter: true = completed only, false = active only.
    if "completed" in msg:
        want_completed = msg["completed"]
        tasks = [t for t in tasks if t.completed == want_completed]

    # Per-user list filtering when roles are configured,
    # any list is private, or strict privacy is active.
    user_id = connection.user.id if connection.user else None
    user_is_admin = connection.user.is_admin if connection.user else False
    strict = is_strict_privacy(hass)
    if user_id:
        has_roles = bool(store.get_roles())
        has_private = any(
            lst.is_private for lst in store.get_lists().values()
        )
        if has_roles or has_private or strict:
            tasks = [
                t for t in tasks
                if can_read(store, user_id, "list", t.list_id, strict=strict, is_admin=user_is_admin)
            ]

    # Apply virtual view filter.
    view = msg.get("view")
    if view == VIRTUAL_VIEW_TODAY:
        today_str = date.today().isoformat()
        tasks = [t for t in tasks if t.due and t.due[:10] == today_str]
    elif view == VIRTUAL_VIEW_UPCOMING:
        today_str = date.today().isoformat()
        tasks = [t for t in tasks if t.due and t.due[:10] > today_str]

    # Apply limit (default 500).
    limit = msg.get("limit", 500)
    tasks = tasks[:limit]

    result = [t.to_dict() for t in tasks]
    connection.send_result(msg["id"], result)


# ── Lists ────────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_LISTS,
    }
)
@callback
def ws_handle_lists(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return to-do lists the requesting user can read."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    user_id = connection.user.id if connection.user else None
    user_is_admin = connection.user.is_admin if connection.user else False
    all_lists = list(store.get_lists().values())
    strict = is_strict_privacy(hass)

    # Filter by read permission when roles are configured, any
    # list has is_private set, or strict privacy is active.
    if user_id:
        has_roles = bool(store.get_roles())
        has_private = any(lst.is_private for lst in all_lists)
        if has_roles or has_private or strict:
            all_lists = [
                lst for lst in all_lists
                if can_read(store, user_id, "list", lst.id, strict=strict, is_admin=user_is_admin)
            ]

    result = [lst.to_dict() for lst in all_lists]
    connection.send_result(msg["id"], result)


# ── Templates ────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_TEMPLATES,
    }
)
@callback
def ws_handle_templates(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all shift templates."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    result = [t.to_dict() for t in store.get_templates().values()]
    connection.send_result(msg["id"], result)


# ── Presets ──────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_PRESETS,
    }
)
@callback
def ws_handle_presets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all task presets."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    result = [p.to_dict() for p in store.get_presets().values()]
    connection.send_result(msg["id"], result)


# ── Routines ──────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_ROUTINES,
    }
)
@callback
def ws_handle_routines(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all routines."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    result = [r.to_dict() for r in store.get_routines().values()]
    connection.send_result(msg["id"], result)


# ── Notification rules ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_NOTIFICATION_RULES,
        vol.Optional("scope"): vol.In(["calendar", "template", "event"]),
        vol.Optional("scope_id"): str,
    }
)
@callback
def ws_handle_notification_rules(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return notification rules, optionally filtered by scope + scope_id."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    scope = msg.get("scope")
    scope_id = msg.get("scope_id")

    if scope and scope_id:
        rules = store.get_rules_for_scope(scope, scope_id)
    elif scope:
        # Filter by scope only (e.g. all calendar rules).
        rules = [
            r for r in store.get_notification_rules().values()
            if r.scope == scope
        ]
    else:
        rules = list(store.get_notification_rules().values())

    # Filter by read permissions: only return rules for calendars the
    # user can read (respects strict privacy and per-calendar roles).
    is_admin = connection.user.is_admin if connection.user else False
    strict = is_strict_privacy(hass)
    if not is_admin and strict:
        user_id = connection.user.id if connection.user else None
        visible: list = []
        for r in rules:
            cal_id = None
            if r.scope == "calendar":
                cal_id = r.scope_id
            elif r.scope == "template":
                tpl = store.get_template(r.scope_id)
                cal_id = tpl.calendar_id if tpl else None
            elif r.scope == "event":
                evt = store.get_event(r.scope_id)
                cal_id = evt.calendar_id if evt else None
            if cal_id is None or can_read(store, user_id, "calendar", cal_id):
                visible.append(r)
        rules = visible

    connection.send_result(msg["id"], [r.to_dict() for r in rules])


# ── Notify services ──────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_NOTIFY_SERVICES,
    }
)
@callback
def ws_handle_notify_services(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return available notify services for the device picker."""
    services: list[dict[str, str]] = []
    notify_domain = hass.services.async_services_for_domain("notify")
    for service_name in sorted(notify_domain):
        services.append({
            "service": f"notify.{service_name}",
            "name": service_name.replace("_", " ").title(),
        })

    connection.send_result(msg["id"], services)


# ── Deleted items ──────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETED_ITEMS,
    }
)
@callback
def ws_handle_deleted_items(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return recently soft-deleted events and tasks."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    deleted_events = [
        {**e.to_dict(), "item_type": "event"}
        for e in store.get_deleted_events(limit=50)
    ]
    deleted_tasks = [
        {**t.to_dict(), "item_type": "task"}
        for t in store.get_deleted_tasks(limit=50)
    ]

    # Combine and sort by deleted_at descending, limit to 50 total.
    items = deleted_events + deleted_tasks
    items.sort(key=lambda x: x.get("deleted_at") or "", reverse=True)

    connection.send_result(msg["id"], items[:50])


# ── Audit log ──────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_AUDIT_LOG,
        vol.Optional("limit", default=50): int,
    }
)
@callback
def ws_handle_audit_log(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return recent audit log entries."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    entries = store.get_audit_log(limit=msg.get("limit", 50))
    connection.send_result(msg["id"], [e.to_dict() for e in entries])


# ── Settings ────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_SETTINGS,
    }
)
@callback
def ws_handle_get_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return current user settings from the config entry options."""
    entry = _get_config_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    opts = entry.options
    connection.send_result(
        msg["id"],
        {
            "reminder_minutes": opts.get("reminder_minutes", DEFAULT_REMINDER_MINUTES),
            "max_event_age_days": opts.get("max_event_age_days", DEFAULT_MAX_EVENT_AGE_DAYS),
            "currency": opts.get("currency", DEFAULT_CURRENCY),
            "budget": opts.get("budget", DEFAULT_BUDGET),
            "week_start": opts.get("week_start", DEFAULT_WEEK_START),
            "time_format": opts.get("time_format", DEFAULT_TIME_FORMAT),
            "notifications_enabled": opts.get("notifications_enabled", DEFAULT_NOTIFICATIONS_ENABLED),
            "morning_summary_enabled": opts.get("morning_summary_enabled", DEFAULT_MORNING_SUMMARY_ENABLED),
            "morning_summary_hour": opts.get("morning_summary_hour", DEFAULT_MORNING_SUMMARY_HOUR),
            "notification_target": opts.get("notification_target", DEFAULT_NOTIFICATION_TARGET),
            "reminder_calendars": opts.get("reminder_calendars", list(DEFAULT_REMINDER_CALENDARS)),
            "strict_privacy": opts.get("strict_privacy", DEFAULT_STRICT_PRIVACY),
        },
    )


# ── Recurring event expansion ─────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_EXPAND_RECURRING_EVENTS,
        vol.Required("start"): str,  # ISO 8601 date
        vol.Required("end"): str,  # ISO 8601 date
        vol.Optional("calendar_id"): str,
    }
)
@callback
def ws_handle_expand_recurring_events(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return events with recurring events expanded into individual instances."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        start_date = date.fromisoformat(msg["start"][:10])
        end_date = date.fromisoformat(msg["end"][:10])
    except (ValueError, TypeError):
        connection.send_error(
            msg["id"], "invalid_date", "Invalid start or end date"
        )
        return

    events = api.expand_recurring_events(
        start_date=start_date,
        end_date=end_date,
        calendar_id=msg.get("calendar_id"),
    )

    # Apply per-user calendar filtering when roles are configured,
    # any calendar is private, or strict privacy is active.
    store = _get_store(hass)
    user_id = connection.user.id if connection.user else None
    user_is_admin = connection.user.is_admin if connection.user else False
    strict = is_strict_privacy(hass)
    if store and user_id:
        has_roles = bool(store.get_roles())
        has_private = any(
            c.is_private for c in store.get_calendars().values()
        )
        if has_roles or has_private or strict:
            events = [
                e for e in events
                if can_read(store, user_id, "calendar", e.calendar_id, strict=strict, is_admin=user_is_admin)
            ]

    # Mark recurring instances with metadata for the frontend.
    result = []
    for e in events:
        d = e.to_dict()
        # Virtual instances have IDs like "{parent_id}_{date}".
        if e.recurrence_rule and "_" in e.id:
            parts = e.id.rsplit("_", 1)
            if len(parts) == 2 and len(parts[1]) == 10:
                d["is_recurring_instance"] = True
                d["parent_event_id"] = parts[0]
        result.append(d)
    connection.send_result(msg["id"], result)
