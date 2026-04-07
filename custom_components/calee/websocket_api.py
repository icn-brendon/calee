"""WebSocket API for the Calee frontend panel.

Registers commands so the Planner panel (and any other WS client) can
query calendars, events, tasks, lists, and templates — and subscribe
to real-time change notifications.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from .const import (
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
    DOMAIN,
    VIRTUAL_VIEW_TODAY,
    VIRTUAL_VIEW_UPCOMING,
    WS_TYPE_ADD_EVENT_EXCEPTION,
    WS_TYPE_ADD_FROM_PRESET,
    WS_TYPE_ADD_SHIFT_FROM_TEMPLATE,
    WS_TYPE_AUDIT_LOG,
    WS_TYPE_CALENDARS,
    WS_TYPE_COMPLETE_TASK,
    WS_TYPE_CREATE_CALENDAR,
    WS_TYPE_CREATE_EVENT,
    WS_TYPE_CREATE_LIST,
    WS_TYPE_CREATE_PRESET,
    WS_TYPE_CREATE_ROUTINE,
    WS_TYPE_CREATE_TASK,
    WS_TYPE_CREATE_TEMPLATE,
    WS_TYPE_DELETE_CALENDAR,
    WS_TYPE_DELETE_EVENT,
    WS_TYPE_DELETE_LIST,
    WS_TYPE_DELETE_PRESET,
    WS_TYPE_DELETE_ROUTINE,
    WS_TYPE_DELETE_TASK,
    WS_TYPE_DELETE_TEMPLATE,
    WS_TYPE_DELETED_ITEMS,
    WS_TYPE_EDIT_EVENT_OCCURRENCE,
    WS_TYPE_EVENTS,
    WS_TYPE_EXECUTE_ROUTINE,
    WS_TYPE_EXPAND_RECURRING_EVENTS,
    WS_TYPE_GET_SETTINGS,
    WS_TYPE_IMPORT_CSV,
    WS_TYPE_IMPORT_ICS,
    WS_TYPE_LINK_TASK_TO_EVENT,
    WS_TYPE_LISTS,
    WS_TYPE_PRESETS,
    WS_TYPE_RESTORE_EVENT,
    WS_TYPE_RESTORE_TASK,
    WS_TYPE_ROUTINES,
    WS_TYPE_SET_CALENDAR_PRIVATE,
    WS_TYPE_SET_LIST_PRIVATE,
    WS_TYPE_SUBSCRIBE,
    WS_TYPE_TASKS,
    WS_TYPE_TEMPLATES,
    WS_TYPE_UNCOMPLETE_TASK,
    WS_TYPE_UNLINK_TASK_FROM_EVENT,
    WS_TYPE_UPDATE_CALENDAR,
    WS_TYPE_UPDATE_EVENT,
    WS_TYPE_UPDATE_LIST,
    WS_TYPE_UPDATE_ROUTINE,
    WS_TYPE_UPDATE_SETTINGS,
    WS_TYPE_UPDATE_TASK,
    WS_TYPE_UPDATE_TEMPLATE,
)
from .permissions import can_read, is_strict_privacy

_LOGGER = logging.getLogger(__name__)

# Track whether commands have been registered (once per HA instance).
_REGISTERED = "calee_ws_registered"


def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register all Calee WebSocket commands (idempotent)."""
    if hass.data.get(_REGISTERED):
        return

    websocket_api.async_register_command(hass, ws_handle_calendars)
    websocket_api.async_register_command(hass, ws_handle_events)
    websocket_api.async_register_command(hass, ws_handle_tasks)
    websocket_api.async_register_command(hass, ws_handle_lists)
    websocket_api.async_register_command(hass, ws_handle_templates)
    websocket_api.async_register_command(hass, ws_handle_create_template)
    websocket_api.async_register_command(hass, ws_handle_update_template)
    websocket_api.async_register_command(hass, ws_handle_delete_template)
    websocket_api.async_register_command(hass, ws_handle_add_shift_from_template)
    websocket_api.async_register_command(hass, ws_handle_create_event)
    websocket_api.async_register_command(hass, ws_handle_update_event)
    websocket_api.async_register_command(hass, ws_handle_delete_event)
    websocket_api.async_register_command(hass, ws_handle_create_task)
    websocket_api.async_register_command(hass, ws_handle_update_task)
    websocket_api.async_register_command(hass, ws_handle_delete_task)
    websocket_api.async_register_command(hass, ws_handle_complete_task)
    websocket_api.async_register_command(hass, ws_handle_uncomplete_task)
    websocket_api.async_register_command(hass, ws_handle_link_task_to_event)
    websocket_api.async_register_command(hass, ws_handle_unlink_task_from_event)
    websocket_api.async_register_command(hass, ws_handle_import_csv)
    websocket_api.async_register_command(hass, ws_handle_import_ics)
    websocket_api.async_register_command(hass, ws_handle_presets)
    websocket_api.async_register_command(hass, ws_handle_create_preset)
    websocket_api.async_register_command(hass, ws_handle_delete_preset)
    websocket_api.async_register_command(hass, ws_handle_add_from_preset)
    websocket_api.async_register_command(hass, ws_handle_restore_event)
    websocket_api.async_register_command(hass, ws_handle_restore_task)
    websocket_api.async_register_command(hass, ws_handle_subscribe)
    websocket_api.async_register_command(hass, ws_handle_get_settings)
    websocket_api.async_register_command(hass, ws_handle_update_settings)
    websocket_api.async_register_command(hass, ws_handle_deleted_items)
    websocket_api.async_register_command(hass, ws_handle_audit_log)
    websocket_api.async_register_command(hass, ws_handle_set_calendar_private)
    websocket_api.async_register_command(hass, ws_handle_set_list_private)
    websocket_api.async_register_command(hass, ws_handle_expand_recurring_events)
    websocket_api.async_register_command(hass, ws_handle_routines)
    websocket_api.async_register_command(hass, ws_handle_create_routine)
    websocket_api.async_register_command(hass, ws_handle_update_routine)
    websocket_api.async_register_command(hass, ws_handle_delete_routine)
    websocket_api.async_register_command(hass, ws_handle_execute_routine)
    websocket_api.async_register_command(hass, ws_handle_add_event_exception)
    websocket_api.async_register_command(hass, ws_handle_edit_event_occurrence)
    websocket_api.async_register_command(hass, ws_handle_create_calendar)
    websocket_api.async_register_command(hass, ws_handle_update_calendar)
    websocket_api.async_register_command(hass, ws_handle_delete_calendar)
    websocket_api.async_register_command(hass, ws_handle_create_list)
    websocket_api.async_register_command(hass, ws_handle_update_list)
    websocket_api.async_register_command(hass, ws_handle_delete_list)

    hass.data[_REGISTERED] = True
    _LOGGER.debug("Calee WebSocket commands registered")


# ── Helpers ──────────────────────────────────────────────────────────


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
    - ``list_id`` — restrict to a single list.
    - ``view``    — virtual view ("today" / "upcoming").
    - ``completed`` — ``true`` returns only completed tasks, ``false``
      (or omitted) returns only active tasks.
    - ``limit``   — cap the number of returned tasks (default 500).

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


# ── Template mutations ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_TEMPLATE,
        vol.Required("name"): str,
        vol.Required("calendar_id"): str,
        vol.Required("start_time"): str,
        vol.Required("end_time"): str,
        vol.Optional("color", default="#64b5f6"): str,
        vol.Optional("note", default=""): str,
        vol.Optional("emoji", default=""): str,
    }
)
@websocket_api.async_response
async def ws_handle_create_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new shift template."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    template = await api.async_create_template(
        name=msg["name"],
        calendar_id=msg["calendar_id"],
        start_time=msg["start_time"],
        end_time=msg["end_time"],
        color=msg.get("color", "#64b5f6"),
        note=msg.get("note", ""),
        emoji=msg.get("emoji", ""),
        user_id=connection.user.id if connection.user else None,
    )
    connection.send_result(msg["id"], template.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_TEMPLATE,
        vol.Required("template_id"): str,
        vol.Optional("name"): str,
        vol.Optional("calendar_id"): str,
        vol.Optional("start_time"): str,
        vol.Optional("end_time"): str,
        vol.Optional("color"): str,
        vol.Optional("note"): str,
        vol.Optional("emoji"): str,
    }
)
@websocket_api.async_response
async def ws_handle_update_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing shift template (preserves template ID)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        template = await api.async_update_template(
            template_id=msg["template_id"],
            name=msg.get("name"),
            calendar_id=msg.get("calendar_id"),
            start_time=msg.get("start_time"),
            end_time=msg.get("end_time"),
            color=msg.get("color"),
            note=msg.get("note"),
            emoji=msg.get("emoji"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], template.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_TEMPLATE,
        vol.Required("template_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a shift template."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    template = await api.async_delete_template(
        template_id=msg["template_id"],
        user_id=connection.user.id if connection.user else None,
    )
    connection.send_result(msg["id"], template.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_ADD_SHIFT_FROM_TEMPLATE,
        vol.Required("template_id"): str,
        vol.Required("date"): str,
        vol.Optional("recurrence_rule"): str,
    }
)
@websocket_api.async_response
async def ws_handle_add_shift_from_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a shift from a template for a given date."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    event = await api.async_add_shift_from_template(
        template_id=msg["template_id"],
        shift_date=msg["date"],
        recurrence_rule=msg.get("recurrence_rule"),
        user_id=connection.user.id if connection.user else None,
    )
    connection.send_result(msg["id"], event.to_dict())


# ── Event mutations ─────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_EVENT,
        vol.Required("calendar_id"): str,
        vol.Required("title"): str,
        vol.Required("start"): str,
        vol.Required("end"): str,
        vol.Optional("note", default=""): str,
        vol.Optional("recurrence_rule"): str,
        vol.Optional("template_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_create_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new calendar event (shift)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        event = await api.async_add_shift(
            calendar_id=msg["calendar_id"],
            title=msg["title"],
            start=msg["start"],
            end=msg["end"],
            note=msg.get("note", ""),
            recurrence_rule=msg.get("recurrence_rule"),
            template_id=msg.get("template_id"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "create_failed", str(err))
        return

    connection.send_result(msg["id"], event.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_EVENT,
        vol.Required("event_id"): str,
        vol.Required("version"): int,
        vol.Optional("title"): str,
        vol.Optional("start"): str,
        vol.Optional("end"): str,
        vol.Optional("note"): str,
        vol.Optional("recurrence_rule"): str,
    }
)
@websocket_api.async_response
async def ws_handle_update_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing calendar event (shift)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        event = await api.async_update_shift(
            event_id=msg["event_id"],
            version=msg["version"],
            title=msg.get("title"),
            start=msg.get("start"),
            end=msg.get("end"),
            note=msg.get("note"),
            recurrence_rule=msg.get("recurrence_rule"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], event.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_EVENT,
        vol.Required("event_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete (soft-delete) a calendar event."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_delete_shift(
            event_id=msg["event_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})


# ── Task mutations ──────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_TASK,
        vol.Required("list_id"): str,
        vol.Required("title"): str,
        vol.Optional("note", default=""): str,
        vol.Optional("due"): str,
        vol.Optional("recurrence_rule"): str,
        vol.Optional("category", default=""): str,
        vol.Optional("is_recurring", default=False): bool,
        vol.Optional("recur_reset_hour", default=0): int,
        vol.Optional("quantity", default=1.0): vol.All(
            vol.Coerce(float), vol.Range(min=0.1)
        ),
        vol.Optional("unit", default=""): str,
        vol.Optional("price"): vol.Any(float, int, None),
    }
)
@websocket_api.async_response
async def ws_handle_create_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new task.

    For shopping lists, if an active task with the same title exists the
    quantity is incremented instead of creating a duplicate.  The response
    includes ``merged: true`` when this happens.
    """
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    price_val = msg.get("price")
    if isinstance(price_val, int):
        price_val = float(price_val)

    quantity_val = msg.get("quantity", 1.0)
    if isinstance(quantity_val, int):
        quantity_val = float(quantity_val)

    try:
        task = await api.async_add_task(
            list_id=msg["list_id"],
            title=msg["title"],
            note=msg.get("note", ""),
            due=msg.get("due"),
            recurrence_rule=msg.get("recurrence_rule"),
            category=msg.get("category", ""),
            is_recurring=msg.get("is_recurring", False),
            recur_reset_hour=msg.get("recur_reset_hour", 0),
            quantity=quantity_val,
            unit=msg.get("unit", ""),
            price=price_val,
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "create_failed", str(err))
        return

    result = task.to_dict()
    if getattr(task, "_merged", False):
        result["merged"] = True
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_TASK,
        vol.Required("task_id"): str,
        vol.Required("version"): int,
        vol.Optional("title"): str,
        vol.Optional("note"): str,
        vol.Optional("due"): str,
        vol.Optional("recurrence_rule"): str,
        vol.Optional("completed"): bool,
        vol.Optional("category"): str,
        vol.Optional("is_recurring"): bool,
        vol.Optional("recur_reset_hour"): int,
        vol.Optional("quantity"): vol.All(
            vol.Coerce(float), vol.Range(min=0.1)
        ),
        vol.Optional("unit"): str,
        vol.Optional("price"): vol.Any(float, int, None),
    }
)
@websocket_api.async_response
async def ws_handle_update_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing task."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    price_val = msg.get("price")
    if isinstance(price_val, int):
        price_val = float(price_val)

    quantity_val = msg.get("quantity")
    if isinstance(quantity_val, int):
        quantity_val = float(quantity_val)

    try:
        task = await api.async_update_task(
            task_id=msg["task_id"],
            version=msg["version"],
            title=msg.get("title"),
            note=msg.get("note"),
            due=msg.get("due"),
            recurrence_rule=msg.get("recurrence_rule"),
            completed=msg.get("completed"),
            category=msg.get("category"),
            is_recurring=msg.get("is_recurring"),
            recur_reset_hour=msg.get("recur_reset_hour"),
            quantity=quantity_val,
            unit=msg.get("unit"),
            price=price_val,
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], task.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_TASK,
        vol.Required("task_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete (soft-delete) a task."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_delete_task(
            task_id=msg["task_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_COMPLETE_TASK,
        vol.Required("task_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_complete_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Mark a task as completed."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        task = await api.async_complete_task(
            task_id=msg["task_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "complete_failed", str(err))
        return

    connection.send_result(msg["id"], task.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UNCOMPLETE_TASK,
        vol.Required("task_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_uncomplete_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Mark a completed task as not completed."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        task = await api.async_uncomplete_task(
            task_id=msg["task_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "uncomplete_failed", str(err))
        return

    connection.send_result(msg["id"], task.to_dict())


# ── Task-event linking ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_LINK_TASK_TO_EVENT,
        vol.Required("task_id"): str,
        vol.Required("event_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_link_task_to_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Link a task to a calendar event."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        task = await api.async_link_task_to_event(
            task_id=msg["task_id"],
            event_id=msg["event_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "link_failed", str(err))
        return

    connection.send_result(msg["id"], task.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UNLINK_TASK_FROM_EVENT,
        vol.Required("task_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_unlink_task_from_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove the event link from a task."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        task = await api.async_unlink_task_from_event(
            task_id=msg["task_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "unlink_failed", str(err))
        return

    connection.send_result(msg["id"], task.to_dict())


# ── Roster import ──────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_IMPORT_CSV,
        vol.Required("calendar_id"): str,
        vol.Required("data"): str,
        vol.Optional("source", default="csv"): str,
        vol.Optional("dry_run", default=False): bool,
    }
)
@websocket_api.async_response
async def ws_handle_import_csv(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Import shifts from CSV data (or preview with dry_run)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        if msg.get("dry_run", False):
            result = await api.async_preview_import_csv(
                calendar_id=msg["calendar_id"],
                csv_data=msg["data"],
                source=msg.get("source", "csv"),
            )
        else:
            result = await api.async_import_csv(
                calendar_id=msg["calendar_id"],
                csv_data=msg["data"],
                source=msg.get("source", "csv"),
                user_id=connection.user.id if connection.user else None,
            )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "import_failed", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "import_failed", str(err))
        return

    connection.send_result(msg["id"], result.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_IMPORT_ICS,
        vol.Required("calendar_id"): str,
        vol.Required("data"): str,
        vol.Optional("source", default="ics"): str,
        vol.Optional("dry_run", default=False): bool,
    }
)
@websocket_api.async_response
async def ws_handle_import_ics(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Import shifts from ICS (iCalendar) data (or preview with dry_run)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        if msg.get("dry_run", False):
            result = await api.async_preview_import_ics(
                calendar_id=msg["calendar_id"],
                ics_data=msg["data"],
                source=msg.get("source", "ics"),
            )
        else:
            result = await api.async_import_ics(
                calendar_id=msg["calendar_id"],
                ics_data=msg["data"],
                source=msg.get("source", "ics"),
                user_id=connection.user.id if connection.user else None,
            )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "import_failed", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "import_failed", str(err))
        return

    connection.send_result(msg["id"], result.to_dict())


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


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_ADD_FROM_PRESET,
        vol.Required("preset_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_add_from_preset(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a task from a preset (one-tap quick-add)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        task = await api.async_add_from_preset(
            preset_id=msg["preset_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "add_from_preset_failed", str(err))
        return

    result = task.to_dict()
    if getattr(task, "_merged", False):
        result["merged"] = True
    connection.send_result(msg["id"], result)


# ── Preset mutations ──────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_PRESET,
        vol.Required("title"): str,
        vol.Required("list_id"): str,
        vol.Optional("category", default=""): str,
        vol.Optional("icon", default=""): str,
        vol.Optional("note", default=""): str,
    }
)
@websocket_api.async_response
async def ws_handle_create_preset(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new task preset."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        preset = await api.async_create_preset(
            title=msg["title"],
            list_id=msg["list_id"],
            category=msg.get("category", ""),
            icon=msg.get("icon", ""),
            note=msg.get("note", ""),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "create_preset_failed", str(err))
        return

    connection.send_result(msg["id"], preset.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_PRESET,
        vol.Required("preset_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_preset(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a task preset."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        preset = await api.async_delete_preset(
            preset_id=msg["preset_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_preset_failed", str(err))
        return

    connection.send_result(msg["id"], preset.to_dict())


# ── Restore (undo soft-delete) ──────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_RESTORE_EVENT,
        vol.Required("event_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_restore_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Restore a soft-deleted calendar event."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        event = await api.async_restore_shift(
            event_id=msg["event_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "restore_failed", str(err))
        return

    connection.send_result(msg["id"], event.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_RESTORE_TASK,
        vol.Required("task_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_restore_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Restore a soft-deleted task."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        task = await api.async_restore_task(
            task_id=msg["task_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "restore_failed", str(err))
        return

    connection.send_result(msg["id"], task.to_dict())


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


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_SETTINGS,
        vol.Optional("reminder_minutes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=1440)),
        vol.Optional("max_event_age_days"): vol.All(vol.Coerce(int), vol.Range(min=30, max=3650)),
        vol.Optional("currency"): str,
        vol.Optional("budget"): vol.All(vol.Coerce(float), vol.Range(min=0)),
        vol.Optional("week_start"): vol.In(["monday", "sunday"]),
        vol.Optional("time_format"): vol.In(["12h", "24h"]),
        vol.Optional("notifications_enabled"): bool,
        vol.Optional("morning_summary_enabled"): bool,
        vol.Optional("morning_summary_hour"): vol.All(vol.Coerce(int), vol.Range(min=0, max=23)),
        vol.Optional("notification_target"): str,
        vol.Optional("reminder_calendars"): [str],
        vol.Optional("strict_privacy"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_update_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update user settings in the config entry options."""
    entry = _get_config_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    # Build the updated options dict, merging incoming values with existing.
    new_opts = dict(entry.options)
    _settings_keys = (
        "reminder_minutes", "max_event_age_days", "currency", "budget",
        "week_start", "time_format", "notifications_enabled",
        "morning_summary_enabled", "morning_summary_hour", "notification_target",
        "reminder_calendars", "strict_privacy",
    )
    for key in _settings_keys:
        if key in msg:
            new_opts[key] = msg[key]

    hass.config_entries.async_update_entry(entry, options=new_opts)

    connection.send_result(
        msg["id"],
        {
            "reminder_minutes": new_opts.get("reminder_minutes", DEFAULT_REMINDER_MINUTES),
            "max_event_age_days": new_opts.get("max_event_age_days", DEFAULT_MAX_EVENT_AGE_DAYS),
            "currency": new_opts.get("currency", DEFAULT_CURRENCY),
            "budget": new_opts.get("budget", DEFAULT_BUDGET),
            "week_start": new_opts.get("week_start", DEFAULT_WEEK_START),
            "time_format": new_opts.get("time_format", DEFAULT_TIME_FORMAT),
            "notifications_enabled": new_opts.get("notifications_enabled", DEFAULT_NOTIFICATIONS_ENABLED),
            "morning_summary_enabled": new_opts.get("morning_summary_enabled", DEFAULT_MORNING_SUMMARY_ENABLED),
            "morning_summary_hour": new_opts.get("morning_summary_hour", DEFAULT_MORNING_SUMMARY_HOUR),
            "notification_target": new_opts.get("notification_target", DEFAULT_NOTIFICATION_TARGET),
            "reminder_calendars": new_opts.get("reminder_calendars", list(DEFAULT_REMINDER_CALENDARS)),
            "strict_privacy": new_opts.get("strict_privacy", DEFAULT_STRICT_PRIVACY),
        },
    )


# ── Subscribe ────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SUBSCRIBE,
    }
)
@callback
def ws_handle_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to planner change notifications.

    The panel calls this once on load. When any planner data changes,
    the api module fires a `calee_changed` event and this
    subscription forwards it to the panel as a WS message.
    """
    # Send initial ack.
    connection.send_result(msg["id"])

    @callback
    def _forward_event(event: Any) -> None:
        """Forward a planner change event to the WS subscriber."""
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "action": event.data.get("action"),
                    "resource_type": event.data.get("resource_type"),
                    "resource_id": event.data.get("resource_id"),
                },
            )
        )

    unsub = hass.bus.async_listen("calee_changed", _forward_event)

    @callback
    def _on_close() -> None:
        unsub()

    connection.subscriptions[msg["id"]] = _on_close


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


# ── Privacy controls ──────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SET_CALENDAR_PRIVATE,
        vol.Required("calendar_id"): str,
        vol.Required("is_private"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_set_calendar_private(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Toggle privacy on a calendar."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_set_calendar_private(
            calendar_id=msg["calendar_id"],
            is_private=msg["is_private"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SET_LIST_PRIVATE,
        vol.Required("list_id"): str,
        vol.Required("is_private"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_set_list_private(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Toggle privacy on a to-do list."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_set_list_private(
            list_id=msg["list_id"],
            is_private=msg["is_private"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})


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


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_ROUTINE,
        vol.Required("name"): str,
        vol.Optional("emoji", default=""): str,
        vol.Optional("description", default=""): str,
        vol.Optional("shift_template_id"): str,
        vol.Optional("tasks", default=[]): list,
        vol.Optional("shopping_items", default=[]): list,
    }
)
@websocket_api.async_response
async def ws_handle_create_routine(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new routine."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        routine = await api.async_create_routine(
            name=msg["name"],
            emoji=msg.get("emoji", ""),
            description=msg.get("description", ""),
            shift_template_id=msg.get("shift_template_id"),
            tasks=msg.get("tasks", []),
            shopping_items=msg.get("shopping_items", []),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "create_failed", str(err))
        return

    connection.send_result(msg["id"], routine.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_ROUTINE,
        vol.Required("routine_id"): str,
        vol.Optional("name"): str,
        vol.Optional("emoji"): str,
        vol.Optional("description"): str,
        vol.Optional("shift_template_id"): vol.Any(str, None),
        vol.Optional("tasks"): list,
        vol.Optional("shopping_items"): list,
    }
)
@websocket_api.async_response
async def ws_handle_update_routine(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing routine."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        routine = await api.async_update_routine(
            routine_id=msg["routine_id"],
            name=msg.get("name"),
            emoji=msg.get("emoji"),
            description=msg.get("description"),
            shift_template_id=msg.get("shift_template_id", ...),
            tasks=msg.get("tasks"),
            shopping_items=msg.get("shopping_items"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], routine.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_ROUTINE,
        vol.Required("routine_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_routine(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a routine."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        routine = await api.async_delete_routine(
            routine_id=msg["routine_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return

    connection.send_result(msg["id"], routine.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_EXECUTE_ROUTINE,
        vol.Required("routine_id"): str,
        vol.Required("date"): str,
    }
)
@websocket_api.async_response
async def ws_handle_execute_routine(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Execute a routine for a given date."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        result = await api.async_execute_routine(
            routine_id=msg["routine_id"],
            target_date=msg["date"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "execute_failed", str(err))
        return

    connection.send_result(msg["id"], result)


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


# ── Exception handling (recurring events) ────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_ADD_EVENT_EXCEPTION,
        vol.Required("event_id"): str,
        vol.Required("date"): str,  # ISO 8601 date
    }
)
@websocket_api.async_response
async def ws_handle_add_event_exception(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a date to an event's exception list (skip that occurrence)."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        event = await api.async_add_event_exception(
            event_id=msg["event_id"],
            exception_date=msg["date"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "exception_failed", str(err))
        return

    connection.send_result(msg["id"], event.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_EDIT_EVENT_OCCURRENCE,
        vol.Required("event_id"): str,
        vol.Required("date"): str,  # ISO 8601 date
        vol.Optional("title"): str,
        vol.Optional("start"): str,
        vol.Optional("end"): str,
        vol.Optional("note"): str,
        vol.Optional("calendar_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_edit_event_occurrence(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a standalone event for one date and add exception to parent."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        standalone = await api.async_edit_event_occurrence(
            event_id=msg["event_id"],
            occurrence_date=msg["date"],
            title=msg.get("title"),
            start=msg.get("start"),
            end=msg.get("end"),
            note=msg.get("note"),
            calendar_id=msg.get("calendar_id"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "occurrence_failed", str(err))
        return

    connection.send_result(msg["id"], standalone.to_dict())


# ── Calendar CRUD ────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_CALENDAR,
        vol.Required("name"): str,
        vol.Optional("color", default="#64b5f6"): str,
        vol.Optional("emoji", default=""): str,
    }
)
@websocket_api.async_response
async def ws_handle_create_calendar(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new calendar."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    cal = await api.async_create_calendar(
        name=msg["name"],
        color=msg.get("color", "#64b5f6"),
        emoji=msg.get("emoji", ""),
        user_id=connection.user.id if connection.user else None,
    )
    connection.send_result(msg["id"], cal.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_CALENDAR,
        vol.Required("calendar_id"): str,
        vol.Optional("name"): str,
        vol.Optional("color"): str,
        vol.Optional("emoji"): str,
    }
)
@websocket_api.async_response
async def ws_handle_update_calendar(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing calendar."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        cal = await api.async_update_calendar(
            calendar_id=msg["calendar_id"],
            name=msg.get("name"),
            color=msg.get("color"),
            emoji=msg.get("emoji"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], cal.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_CALENDAR,
        vol.Required("calendar_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_calendar(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a calendar and all its events."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_delete_calendar(
            calendar_id=msg["calendar_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})


# ── List CRUD ─────────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_LIST,
        vol.Required("name"): str,
        vol.Optional("list_type", default="standard"): str,
    }
)
@websocket_api.async_response
async def ws_handle_create_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new to-do list."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    lst = await api.async_create_list(
        name=msg["name"],
        list_type=msg.get("list_type", "standard"),
        user_id=connection.user.id if connection.user else None,
    )
    connection.send_result(msg["id"], lst.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_LIST,
        vol.Required("list_id"): str,
        vol.Optional("name"): str,
    }
)
@websocket_api.async_response
async def ws_handle_update_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing to-do list."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        lst = await api.async_update_list(
            list_id=msg["list_id"],
            name=msg.get("name"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], lst.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_LIST,
        vol.Required("list_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a to-do list and all its tasks."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_delete_list(
            list_id=msg["list_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})
