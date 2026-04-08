"""Admin/settings/mutation WebSocket handlers for Calee."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

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
    WS_TYPE_CREATE_CALENDAR,
    WS_TYPE_CREATE_LIST,
    WS_TYPE_CREATE_NOTIFICATION_RULE,
    WS_TYPE_CREATE_PRESET,
    WS_TYPE_CREATE_ROUTINE,
    WS_TYPE_CREATE_TEMPLATE,
    WS_TYPE_DELETE_CALENDAR,
    WS_TYPE_DELETE_LIST,
    WS_TYPE_DELETE_NOTIFICATION_RULE,
    WS_TYPE_DELETE_PRESET,
    WS_TYPE_DELETE_ROUTINE,
    WS_TYPE_DELETE_TEMPLATE,
    WS_TYPE_EXECUTE_ROUTINE,
    WS_TYPE_IMPORT_CSV,
    WS_TYPE_IMPORT_ICS,
    WS_TYPE_SET_CALENDAR_PRIVATE,
    WS_TYPE_SET_LIST_PRIVATE,
    WS_TYPE_SUBSCRIBE,
    WS_TYPE_UPDATE_CALENDAR,
    WS_TYPE_UPDATE_LIST,
    WS_TYPE_UPDATE_NOTIFICATION_RULE,
    WS_TYPE_UPDATE_ROUTINE,
    WS_TYPE_UPDATE_SETTINGS,
    WS_TYPE_UPDATE_TEMPLATE,
)
from ..notification_utils import validate_notification_target
from .helpers import _get_api, _get_config_entry

# ── Settings ────────────────────────────────────────────────────────


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

    if "notification_target" in msg:
        normalized_target = validate_notification_target(
            hass, msg["notification_target"]
        )
        if normalized_target is None:
            connection.send_error(
                msg["id"],
                "invalid_notification_target",
                "Notification target is not available",
            )
            return
        new_opts["notification_target"] = normalized_target

    if "reminder_calendars" in msg:
        new_opts["reminder_calendars"] = [
            calendar_id
            for calendar_id in msg["reminder_calendars"]
            if calendar_id
        ]

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


# ── Routine mutations ──────────────────────────────────────────────


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


# ── Notification rule mutations ──────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CREATE_NOTIFICATION_RULE,
        vol.Required("scope"): vol.In(["calendar", "template", "event"]),
        vol.Required("scope_id"): str,
        vol.Optional("enabled", default=True): bool,
        vol.Optional("reminder_minutes", default=60): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=1440)
        ),
        vol.Optional("notify_services", default=[]): [str],
        vol.Optional("include_actions", default=True): bool,
        vol.Optional("custom_title", default=""): str,
        vol.Optional("custom_message", default=""): str,
    }
)
@websocket_api.async_response
async def ws_handle_create_notification_rule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Create a new notification rule."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        rule = await api.async_create_notification_rule(
            scope=msg["scope"],
            scope_id=msg["scope_id"],
            enabled=msg.get("enabled", True),
            reminder_minutes=msg.get("reminder_minutes", 60),
            notify_services=msg.get("notify_services", []),
            include_actions=msg.get("include_actions", True),
            custom_title=msg.get("custom_title", ""),
            custom_message=msg.get("custom_message", ""),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "create_failed", str(err))
        return

    connection.send_result(msg["id"], rule.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_NOTIFICATION_RULE,
        vol.Required("rule_id"): str,
        vol.Optional("enabled"): bool,
        vol.Optional("reminder_minutes"): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=1440)
        ),
        vol.Optional("notify_services"): [str],
        vol.Optional("include_actions"): bool,
        vol.Optional("custom_title"): str,
        vol.Optional("custom_message"): str,
    }
)
@websocket_api.async_response
async def ws_handle_update_notification_rule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing notification rule."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        rule = await api.async_update_notification_rule(
            rule_id=msg["rule_id"],
            enabled=msg.get("enabled"),
            reminder_minutes=msg.get("reminder_minutes"),
            notify_services=msg.get("notify_services"),
            include_actions=msg.get("include_actions"),
            custom_title=msg.get("custom_title"),
            custom_message=msg.get("custom_message"),
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "update_failed", str(err))
        return

    connection.send_result(msg["id"], rule.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_NOTIFICATION_RULE,
        vol.Required("rule_id"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_notification_rule(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a notification rule."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        await api.async_delete_notification_rule(
            rule_id=msg["rule_id"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "delete_failed", str(err))
        return

    connection.send_result(msg["id"], {"success": True})
