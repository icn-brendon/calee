"""Event mutation WebSocket handlers for Calee."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from ..const import (
    WS_TYPE_ADD_EVENT_EXCEPTION,
    WS_TYPE_ADD_SHIFT_FROM_TEMPLATE,
    WS_TYPE_CREATE_EVENT,
    WS_TYPE_DELETE_EVENT,
    WS_TYPE_EDIT_EVENT_OCCURRENCE,
    WS_TYPE_RESTORE_EVENT,
    WS_TYPE_UPDATE_EVENT,
)
from .helpers import _get_api

_LOGGER = logging.getLogger(__name__)


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


# ── Add shift from template ──────────────────────────────────────────


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
