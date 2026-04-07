"""Calee — a family planner integration for Home Assistant.

Provides calendar entities for shifts, to-do entities for tasks/shopping,
service actions for CRUD, a WebSocket API for the frontend panel, and a
custom sidebar panel.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_interval

from .api import PlannerAPI
from .const import (
    BACKEND_JSON,
    BACKEND_MARIADB,
    BACKEND_POSTGRESQL,
    CONF_DB_HOST,
    CONF_DB_NAME,
    CONF_DB_PASSWORD,
    CONF_DB_PORT,
    CONF_DB_USERNAME,
    CONF_STORAGE_BACKEND,
    DOMAIN,
)
from .notify import async_setup_shift_reminders
from .panel import async_register_panel, async_unregister_panel
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.CALENDAR, Platform.SENSOR, Platform.TODO]

# Type alias — using typing.TypeAlias for 3.12 compat with from __future__.
CaleeConfigEntry = ConfigEntry


def _build_db_url(backend: str, config: dict) -> str:
    """Build an async SQLAlchemy database URL for the given backend."""
    user = config[CONF_DB_USERNAME]
    password = config[CONF_DB_PASSWORD]
    host = config[CONF_DB_HOST]
    port = config[CONF_DB_PORT]
    db = config[CONF_DB_NAME]
    if backend == BACKEND_MARIADB:
        return f"mysql+aiomysql://{user}:{password}@{host}:{port}/{db}"
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"


async def _create_store(hass: HomeAssistant, entry: CaleeConfigEntry):
    """Factory: create the appropriate store based on the config entry."""
    backend = entry.data.get(CONF_STORAGE_BACKEND, BACKEND_JSON)

    if backend == BACKEND_JSON:
        from .store import JsonPlannerStore

        store = JsonPlannerStore(hass)
    elif backend in (BACKEND_MARIADB, BACKEND_POSTGRESQL):
        from .db.sql_store import SqlPlannerStore

        url = _build_db_url(backend, entry.data)
        store = SqlPlannerStore(url)
    else:
        _LOGGER.error("Unknown storage backend %r, falling back to JSON", backend)
        from .store import JsonPlannerStore

        store = JsonPlannerStore(hass)

    await store.async_load()
    return store


async def _run_migration(
    hass: HomeAssistant,
    entry: CaleeConfigEntry,
    old_backend: str,
    new_store,
) -> None:
    """Migrate data from the old backend into *new_store*."""
    current_backend = entry.data.get(CONF_STORAGE_BACKEND, BACKEND_JSON)

    # Build the old store so we can read from it.
    if old_backend == BACKEND_JSON:
        from .store import JsonPlannerStore

        old_store = JsonPlannerStore(hass)
    elif old_backend in (BACKEND_MARIADB, BACKEND_POSTGRESQL):
        # We no longer have DB creds for the OLD backend in entry.data
        # because they were overwritten.  Migration from DB->JSON stores the
        # old backend name only; full reverse migration would need stored
        # creds.  For now we log and skip.
        _LOGGER.warning(
            "Automatic migration from %s is not supported yet; "
            "the new store will start empty",
            old_backend,
        )
        return
    else:
        return

    try:
        await old_store.async_load()

        count = 0
        # Copy events into the new store.
        for ev in old_store.get_active_events():
            await new_store.async_put_event(ev)
            count += 1

        # Copy tasks.
        for task in old_store.get_active_tasks():
            await new_store.async_put_task(task)
            count += 1

        # Copy templates.
        for tpl in old_store.get_templates().values():
            await new_store.async_put_template(tpl)
            count += 1

        # Copy presets.
        for preset in old_store.get_presets().values():
            await new_store.async_put_preset(preset)
            count += 1

        # Copy routines.
        for routine in old_store.get_routines().values():
            await new_store.async_put_routine(routine)
            count += 1

        await new_store.async_save()
        await old_store.async_close()

        _LOGGER.info(
            "Migration from %s to %s completed (%d items)",
            old_backend,
            current_backend,
            count,
        )
    except Exception:
        _LOGGER.exception("Migration from %s failed — new store starts empty", old_backend)


async def async_setup_entry(hass: HomeAssistant, entry: CaleeConfigEntry) -> bool:
    """Set up Calee from a config entry."""
    store = await _create_store(hass, entry)

    # Handle pending migration from an options-flow backend switch.
    pending = entry.options.get("_pending_migration")
    if pending:
        await _run_migration(hass, entry, pending, store)
        # Clear the migration flag.
        new_opts = {k: v for k, v in entry.options.items() if k != "_pending_migration"}
        hass.config_entries.async_update_entry(entry, options=new_opts)

    api = PlannerAPI(hass, store)

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "store": store,
        "api": api,
    }

    # Process recurring tasks on startup (non-fatal if it fails).
    try:
        await api.async_process_recurring_tasks()
    except Exception:
        _LOGGER.exception("Failed to process recurring tasks on startup")

    # Reset completed "always items" on startup (non-fatal).
    try:
        await api.async_process_recurring_shopping_items()
    except Exception:
        _LOGGER.exception("Failed to process recurring shopping items on startup")

    # Run recurring-task processing every hour.
    async def _periodic_recurrence(_now: object) -> None:
        """Process recurring tasks and reset recurring shopping items."""
        try:
            await api.async_process_recurring_tasks()
        except Exception:
            _LOGGER.exception("Recurring task processing failed")
        try:
            await api.async_process_recurring_shopping_items()
        except Exception:
            _LOGGER.exception("Recurring shopping reset failed")

    cancel_interval = async_track_time_interval(
        hass, _periodic_recurrence, timedelta(hours=1)
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_recurrence_interval"] = cancel_interval

    # Register service actions.
    await api.async_register_services()

    # Register WebSocket commands (idempotent — only once per HA instance).
    async_register_websocket_commands(hass)

    # Set up the shift reminder and morning summary notification system.
    try:
        notification_cancels = await async_setup_shift_reminders(
            hass, store, entry
        )
        hass.data[DOMAIN][entry.entry_id]["cancel_notifications"] = notification_cancels
    except Exception:
        _LOGGER.exception("Failed to set up shift reminder system")

    # Forward to entity platforms.
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register the sidebar panel.
    await async_register_panel(hass)

    _LOGGER.info("Calee loaded for config entry %s", entry.entry_id)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: CaleeConfigEntry) -> bool:
    """Unload a Calee config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        data = hass.data[DOMAIN].pop(entry.entry_id, None)
        if data:
            cancel = data.get("cancel_recurrence_interval")
            if cancel:
                cancel()
            # Cancel notification timers and action listeners.
            for cancel_fn in data.get("cancel_notifications", []):
                cancel_fn()
            await data["api"].async_unregister_services()
            await data["store"].async_close()

        # Remove panel only if no entries remain.
        if not hass.data[DOMAIN]:
            await async_unregister_panel(hass)
            hass.data.pop(DOMAIN, None)

    return unload_ok


async def async_remove_entry(hass: HomeAssistant, entry: CaleeConfigEntry) -> None:
    """Clean up when the integration is removed entirely."""
    _LOGGER.info("Calee config entry %s removed", entry.entry_id)
