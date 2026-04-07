"""Bidirectional migration between JSON and SQL storage backends.

These utilities allow users to switch backends without data loss.
The source data store is never modified or deleted.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant

if TYPE_CHECKING:
    from .sql_store import SqlPlannerStore

_LOGGER = logging.getLogger(__name__)


@dataclass
class MigrationResult:
    """Summary of a completed migration."""

    calendars: int = 0
    events: int = 0
    templates: int = 0
    lists: int = 0
    tasks: int = 0
    presets: int = 0
    routines: int = 0
    roles: int = 0
    audit_entries: int = 0
    skipped: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    @property
    def total(self) -> int:
        """Total number of migrated items."""
        return (
            self.calendars
            + self.events
            + self.templates
            + self.lists
            + self.tasks
            + self.presets
            + self.routines
            + self.roles
            + self.audit_entries
        )


# ── JSON -> SQL ─────────────────────────────────────────────────────────


async def async_migrate_json_to_db(
    hass: HomeAssistant,
    sql_store: SqlPlannerStore,
) -> MigrationResult:
    """Migrate all data from the JSON file store into the SQL database.

    This function is **idempotent**: if a record already exists in the DB
    (matched by primary key), it is upserted.  The original JSON file is
    kept as a backup and is never deleted.

    Args:
        hass: The Home Assistant instance (needed to instantiate the JSON store).
        sql_store: An already-initialised ``SqlPlannerStore`` (``async_load``
            must have been called).

    Returns:
        A ``MigrationResult`` with per-entity counts.
    """
    # Import here to avoid circular imports when the JSON store is in the
    # same package.
    from ..store import PlannerStore

    result = MigrationResult()

    # ── 1. Load existing JSON data ──────────────────────────────────
    _LOGGER.info("Migration: loading JSON store data")
    json_store = PlannerStore(hass)
    await json_store.async_load()

    # ── 2. Calendars ────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d calendars", len(json_store.calendars)
    )
    for cal in json_store.calendars.values():
        if cal.id in sql_store.calendars:
            result.skipped.setdefault("calendars", 0)
            result.skipped["calendars"] += 1
            continue
        try:
            from .schema import calendars as calendars_table

            sql_store.calendars[cal.id] = cal
            await sql_store._upsert(calendars_table, cal.to_dict())
            result.calendars += 1
        except Exception as exc:
            msg = f"Failed to migrate calendar {cal.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 3. Events ───────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d events", len(json_store.events)
    )
    for event in json_store.events.values():
        if event.id in sql_store.events:
            result.skipped.setdefault("events", 0)
            result.skipped["events"] += 1
            continue
        try:
            await sql_store.async_put_event(event)
            result.events += 1
        except Exception as exc:
            msg = f"Failed to migrate event {event.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 4. Templates ────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d templates", len(json_store.templates)
    )
    for tpl in json_store.templates.values():
        if tpl.id in sql_store.templates:
            result.skipped.setdefault("templates", 0)
            result.skipped["templates"] += 1
            continue
        try:
            await sql_store.async_put_template(tpl)
            result.templates += 1
        except Exception as exc:
            msg = f"Failed to migrate template {tpl.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 5. Lists ────────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d lists", len(json_store.lists)
    )
    for lst in json_store.lists.values():
        if lst.id in sql_store.lists:
            result.skipped.setdefault("lists", 0)
            result.skipped["lists"] += 1
            continue
        try:
            from .schema import lists as lists_table

            sql_store.lists[lst.id] = lst
            await sql_store._upsert(lists_table, lst.to_dict())
            result.lists += 1
        except Exception as exc:
            msg = f"Failed to migrate list {lst.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 6. Tasks ────────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d tasks", len(json_store.tasks)
    )
    for task in json_store.tasks.values():
        if task.id in sql_store.tasks:
            result.skipped.setdefault("tasks", 0)
            result.skipped["tasks"] += 1
            continue
        try:
            await sql_store.async_put_task(task)
            result.tasks += 1
        except Exception as exc:
            msg = f"Failed to migrate task {task.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 7. Presets ───────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d presets", len(json_store.presets)
    )
    for preset in json_store.presets.values():
        if preset.id in sql_store.presets:
            result.skipped.setdefault("presets", 0)
            result.skipped["presets"] += 1
            continue
        try:
            await sql_store.async_put_preset(preset)
            result.presets += 1
        except Exception as exc:
            msg = f"Failed to migrate preset {preset.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 8. Routines ────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d routines", len(json_store.routines)
    )
    for routine in json_store.routines.values():
        if routine.id in sql_store.routines:
            result.skipped.setdefault("routines", 0)
            result.skipped["routines"] += 1
            continue
        try:
            await sql_store.async_put_routine(routine)
            result.routines += 1
        except Exception as exc:
            msg = f"Failed to migrate routine {routine.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 9. Roles ────────────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d role assignments", len(json_store.roles)
    )
    existing_role_keys = {
        (r.user_id, r.resource_type, r.resource_id) for r in sql_store.roles
    }
    for role in json_store.roles:
        key = (role.user_id, role.resource_type, role.resource_id)
        if key in existing_role_keys:
            result.skipped.setdefault("roles", 0)
            result.skipped["roles"] += 1
            continue
        try:
            sql_store.roles.append(role)
            await sql_store._upsert_role(role.to_dict())
            result.roles += 1
        except Exception as exc:
            msg = f"Failed to migrate role {key}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    # ── 10. Audit log ───────────────────────────────────────────────
    _LOGGER.info(
        "Migration: migrating %d audit entries", len(json_store.audit_log)
    )
    existing_audit_ids = {a.id for a in sql_store.audit_log}
    for entry in json_store.audit_log:
        if entry.id in existing_audit_ids:
            result.skipped.setdefault("audit_entries", 0)
            result.skipped["audit_entries"] += 1
            continue
        try:
            sql_store.audit_log.append(entry)
            await sql_store._insert_audit_entry(entry)
            result.audit_entries += 1
        except Exception as exc:
            msg = f"Failed to migrate audit entry {entry.id}: {exc}"
            _LOGGER.error(msg)
            result.errors.append(msg)

    _LOGGER.info(
        "Migration complete: %d items migrated (%d skipped, %d errors)",
        result.total,
        sum(result.skipped.values()),
        len(result.errors),
    )
    return result


# ── SQL -> JSON ─────────────────────────────────────────────────────────


async def async_migrate_db_to_json(
    hass: HomeAssistant,
    sql_store: SqlPlannerStore,
) -> MigrationResult:
    """Export all data from the SQL database back into the JSON file store.

    This is the reverse of ``async_migrate_json_to_db`` and is useful when
    a user wants to downgrade from a database backend to the simpler JSON
    storage.  The database is **not** modified.

    Args:
        hass: The Home Assistant instance.
        sql_store: An already-initialised ``SqlPlannerStore``.

    Returns:
        A ``MigrationResult`` with per-entity counts.
    """
    from ..store import PlannerStore

    result = MigrationResult()

    # Load existing JSON data so we can merge (idempotent).
    json_store = PlannerStore(hass)
    await json_store.async_load()

    # ── Calendars ───────────────────────────────────────────────────
    for cal in sql_store.calendars.values():
        if cal.id in json_store.calendars:
            result.skipped.setdefault("calendars", 0)
            result.skipped["calendars"] += 1
            continue
        json_store.calendars[cal.id] = cal
        result.calendars += 1

    # ── Events ──────────────────────────────────────────────────────
    for event in sql_store.events.values():
        if event.id in json_store.events:
            result.skipped.setdefault("events", 0)
            result.skipped["events"] += 1
            continue
        json_store.events[event.id] = event
        result.events += 1

    # ── Templates ───────────────────────────────────────────────────
    for tpl in sql_store.templates.values():
        if tpl.id in json_store.templates:
            result.skipped.setdefault("templates", 0)
            result.skipped["templates"] += 1
            continue
        json_store.templates[tpl.id] = tpl
        result.templates += 1

    # ── Lists ───────────────────────────────────────────────────────
    for lst in sql_store.lists.values():
        if lst.id in json_store.lists:
            result.skipped.setdefault("lists", 0)
            result.skipped["lists"] += 1
            continue
        json_store.lists[lst.id] = lst
        result.lists += 1

    # ── Tasks ───────────────────────────────────────────────────────
    for task in sql_store.tasks.values():
        if task.id in json_store.tasks:
            result.skipped.setdefault("tasks", 0)
            result.skipped["tasks"] += 1
            continue
        json_store.tasks[task.id] = task
        result.tasks += 1

    # ── Presets ─────────────────────────────────────────────────────
    for preset in sql_store.presets.values():
        if preset.id in json_store.presets:
            result.skipped.setdefault("presets", 0)
            result.skipped["presets"] += 1
            continue
        json_store.presets[preset.id] = preset
        result.presets += 1

    # ── Routines ───────────────────────────────────────────────────
    for routine in sql_store.routines.values():
        if routine.id in json_store.routines:
            result.skipped.setdefault("routines", 0)
            result.skipped["routines"] += 1
            continue
        json_store.routines[routine.id] = routine
        result.routines += 1

    # ── Roles ───────────────────────────────────────────────────────
    existing_role_keys = {
        (r.user_id, r.resource_type, r.resource_id) for r in json_store.roles
    }
    for role in sql_store.roles:
        key = (role.user_id, role.resource_type, role.resource_id)
        if key in existing_role_keys:
            result.skipped.setdefault("roles", 0)
            result.skipped["roles"] += 1
            continue
        json_store.roles.append(role)
        result.roles += 1

    # ── Audit log ───────────────────────────────────────────────────
    existing_audit_ids = {a.id for a in json_store.audit_log}
    for entry in sql_store.audit_log:
        if entry.id in existing_audit_ids:
            result.skipped.setdefault("audit_entries", 0)
            result.skipped["audit_entries"] += 1
            continue
        json_store.audit_log.append(entry)
        result.audit_entries += 1

    # ── Persist to disk ─────────────────────────────────────────────
    await json_store.async_save()

    _LOGGER.info(
        "Reverse migration complete: %d items exported to JSON "
        "(%d skipped, %d errors)",
        result.total,
        sum(result.skipped.values()),
        len(result.errors),
    )
    return result
