"""WebSocket API package for the Calee frontend panel.

Registers commands so the Planner panel (and any other WS client) can
query calendars, events, tasks, lists, and templates — and subscribe
to real-time change notifications.
"""

from __future__ import annotations

import logging

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .ws_admin import (
    ws_handle_create_calendar,
    ws_handle_create_list,
    ws_handle_create_notification_rule,
    ws_handle_create_preset,
    ws_handle_create_routine,
    ws_handle_create_template,
    ws_handle_delete_calendar,
    ws_handle_delete_list,
    ws_handle_delete_notification_rule,
    ws_handle_delete_preset,
    ws_handle_delete_routine,
    ws_handle_delete_template,
    ws_handle_execute_routine,
    ws_handle_import_csv,
    ws_handle_import_ics,
    ws_handle_set_calendar_private,
    ws_handle_set_list_private,
    ws_handle_subscribe,
    ws_handle_update_calendar,
    ws_handle_update_list,
    ws_handle_update_notification_rule,
    ws_handle_update_routine,
    ws_handle_update_settings,
    ws_handle_update_template,
)
from .ws_events import (
    ws_handle_add_event_exception,
    ws_handle_add_shift_from_template,
    ws_handle_create_event,
    ws_handle_delete_event,
    ws_handle_edit_event_occurrence,
    ws_handle_restore_event,
    ws_handle_update_event,
)
from .ws_read import (
    ws_handle_audit_log,
    ws_handle_calendars,
    ws_handle_deleted_items,
    ws_handle_events,
    ws_handle_expand_recurring_events,
    ws_handle_get_settings,
    ws_handle_lists,
    ws_handle_notification_rules,
    ws_handle_notify_services,
    ws_handle_presets,
    ws_handle_routines,
    ws_handle_tasks,
    ws_handle_templates,
)
from .ws_tasks import (
    ws_handle_add_from_preset,
    ws_handle_complete_task,
    ws_handle_create_task,
    ws_handle_delete_task,
    ws_handle_link_task_to_event,
    ws_handle_reorder_task,
    ws_handle_restore_task,
    ws_handle_uncomplete_task,
    ws_handle_unlink_task_from_event,
    ws_handle_update_task,
)

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
    websocket_api.async_register_command(hass, ws_handle_reorder_task)
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
    websocket_api.async_register_command(hass, ws_handle_notification_rules)
    websocket_api.async_register_command(hass, ws_handle_create_notification_rule)
    websocket_api.async_register_command(hass, ws_handle_update_notification_rule)
    websocket_api.async_register_command(hass, ws_handle_delete_notification_rule)
    websocket_api.async_register_command(hass, ws_handle_notify_services)

    hass.data[_REGISTERED] = True
    _LOGGER.debug("Calee WebSocket commands registered")
