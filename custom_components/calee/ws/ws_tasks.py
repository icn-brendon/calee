"""Task mutation WebSocket handlers for Calee."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from ..const import (
    WS_TYPE_ADD_FROM_PRESET,
    WS_TYPE_COMPLETE_TASK,
    WS_TYPE_CREATE_TASK,
    WS_TYPE_DELETE_TASK,
    WS_TYPE_LINK_TASK_TO_EVENT,
    WS_TYPE_REORDER_TASK,
    WS_TYPE_RESTORE_TASK,
    WS_TYPE_UNCOMPLETE_TASK,
    WS_TYPE_UNLINK_TASK_FROM_EVENT,
    WS_TYPE_UPDATE_TASK,
)
from .helpers import _get_api

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


# ── Restore (undo soft-delete) ──────────────────────────────────────


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


# ── Reorder task ────────────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_REORDER_TASK,
        vol.Required("task_id"): str,
        vol.Required("before_task_id"): str,
        vol.Required("version"): vol.Coerce(int),
    }
)
@websocket_api.async_response
async def ws_handle_reorder_task(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reorder a task by moving it before another task."""
    api = _get_api(hass)
    if api is None:
        connection.send_error(msg["id"], "not_loaded", "Calee not loaded")
        return

    try:
        updated = await api.async_reorder_task(
            task_id=msg["task_id"],
            before_task_id=msg["before_task_id"],
            version=msg["version"],
            user_id=connection.user.id if connection.user else None,
        )
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "reorder_failed", str(err))
        return

    connection.send_result(msg["id"], updated.to_dict() if updated else None)


# ── Add from preset ──────────────────────────────────────────────────


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
