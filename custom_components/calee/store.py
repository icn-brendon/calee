"""Persistent storage for the Calee integration.

Uses Home Assistant's built-in Store helper so data lives in
.storage/calee.storage and survives restarts.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    DEFAULT_CALENDARS,
    DEFAULT_LISTS,
    DEFAULT_PRESETS,
    DEFAULT_TEMPLATES,
    SOFT_DELETE_RETENTION_DAYS,
    STORAGE_KEY,
    STORAGE_VERSION,
    AuditAction,
)
from .db.base import AbstractPlannerStore
from .migrations import migrate
from .models import (
    AuditEntry,
    PlannerCalendar,
    PlannerEvent,
    PlannerList,
    PlannerTask,
    RoleAssignment,
    ShiftTemplate,
    TaskPreset,
)

_LOGGER = logging.getLogger(__name__)

# Maximum audit entries retained (ring buffer).
_MAX_AUDIT_ENTRIES = 500


class JsonPlannerStore(AbstractPlannerStore):
    """Manages all planner data in a single .storage file."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store[dict[str, Any]](hass, STORAGE_VERSION, STORAGE_KEY)

        # In-memory state — loaded from disk on async_load.
        self.calendars: dict[str, PlannerCalendar] = {}
        self.events: dict[str, PlannerEvent] = {}
        self.templates: dict[str, ShiftTemplate] = {}
        self.lists: dict[str, PlannerList] = {}
        self.tasks: dict[str, PlannerTask] = {}
        self.presets: dict[str, TaskPreset] = {}
        self.roles: list[RoleAssignment] = []
        self.audit_log: list[AuditEntry] = []

    # ── Lifecycle ────────────────────────────────────────────────────

    async def async_load(self) -> None:
        """Load state from disk, seeding defaults if first run."""
        raw: dict[str, Any] | None = await self._store.async_load()

        if raw is None:
            _LOGGER.info("First run — seeding default calendars and lists")
            self._seed_defaults()
            await self.async_save()
            return

        # Run any pending migrations.
        raw = migrate(raw)

        # Deserialise.
        self.calendars = {
            c["id"]: PlannerCalendar.from_dict(c) for c in raw.get("calendars", [])
        }
        self.events = {
            e["id"]: PlannerEvent.from_dict(e) for e in raw.get("events", [])
        }
        self.templates = {
            t["id"]: ShiftTemplate.from_dict(t) for t in raw.get("templates", [])
        }
        self.lists = {
            lst["id"]: PlannerList.from_dict(lst) for lst in raw.get("lists", [])
        }
        self.tasks = {
            t["id"]: PlannerTask.from_dict(t) for t in raw.get("tasks", [])
        }
        self.presets = {
            p["id"]: TaskPreset.from_dict(p) for p in raw.get("presets", [])
        }
        self.roles = [
            RoleAssignment.from_dict(r) for r in raw.get("roles", [])
        ]
        self.audit_log = [
            AuditEntry.from_dict(a) for a in raw.get("audit_log", [])
        ]

    async def async_save(self) -> None:
        """Persist current state to disk, pruning expired soft-deletes."""
        self._prune_expired_soft_deletes()

        data: dict[str, Any] = {
            "version": STORAGE_VERSION,
            "calendars": [c.to_dict() for c in self.calendars.values()],
            "events": [e.to_dict() for e in self.events.values()],
            "templates": [t.to_dict() for t in self.templates.values()],
            "lists": [lst.to_dict() for lst in self.lists.values()],
            "tasks": [t.to_dict() for t in self.tasks.values()],
            "presets": [p.to_dict() for p in self.presets.values()],
            "roles": [r.to_dict() for r in self.roles],
            "audit_log": [a.to_dict() for a in self.audit_log[-_MAX_AUDIT_ENTRIES:]],
        }
        await self._store.async_save(data)

    async def async_close(self) -> None:
        """No-op for JSON backend — nothing to close."""

    # ── Calendars ────────────────────────────────────────────────────

    def get_calendars(self) -> dict[str, PlannerCalendar]:
        """Return all calendars keyed by id."""
        return self.calendars

    def get_calendar(self, calendar_id: str) -> PlannerCalendar | None:
        """Return a single calendar or *None*."""
        return self.calendars.get(calendar_id)

    async def async_put_calendar(self, calendar: PlannerCalendar) -> None:
        """Insert or replace a calendar."""
        self.calendars[calendar.id] = calendar

    async def async_put_list(self, planner_list: PlannerList) -> None:
        """Insert or replace a to-do list."""
        self.lists[planner_list.id] = planner_list

    # ── Events ───────────────────────────────────────────────────────

    def get_event(self, event_id: str) -> PlannerEvent | None:
        """Return a single event or *None*."""
        return self.events.get(event_id)

    def get_active_events(self, calendar_id: str | None = None) -> list[PlannerEvent]:
        """Return events that are not soft-deleted."""
        events = [e for e in self.events.values() if e.deleted_at is None]
        if calendar_id:
            events = [e for e in events if e.calendar_id == calendar_id]
        return events

    async def async_put_event(self, event: PlannerEvent) -> None:
        """Insert or replace an event."""
        self.events[event.id] = event

    async def async_remove_event(self, event_id: str) -> None:
        """Hard-delete an event by id."""
        del self.events[event_id]

    def find_event_by_source(
        self, source: str, external_id: str
    ) -> PlannerEvent | None:
        """Find a single event matching *source* + *external_id*."""
        for ev in self.events.values():
            if ev.source == source and ev.external_id == external_id:
                return ev
        return None

    # ── Soft delete / restore ────────────────────────────────────────

    def soft_delete_event(self, event_id: str) -> PlannerEvent | None:
        """Mark an event as deleted.  Returns the event or None."""
        event = self.events.get(event_id)
        if event and event.deleted_at is None:
            event.deleted_at = datetime.now(UTC).isoformat()
            event.version += 1
        return event

    def restore_event(self, event_id: str) -> PlannerEvent | None:
        """Undo a soft delete on an event."""
        event = self.events.get(event_id)
        if event and event.deleted_at is not None:
            event.deleted_at = None
            event.version += 1
        return event

    def soft_delete_task(self, task_id: str) -> PlannerTask | None:
        """Mark a task as deleted.  Returns the task or None."""
        task = self.tasks.get(task_id)
        if task and task.deleted_at is None:
            task.deleted_at = datetime.now(UTC).isoformat()
            task.version += 1
        return task

    def restore_task(self, task_id: str) -> PlannerTask | None:
        """Undo a soft delete on a task."""
        task = self.tasks.get(task_id)
        if task and task.deleted_at is not None:
            task.deleted_at = None
            task.version += 1
        return task

    # ── Templates ────────────────────────────────────────────────────

    def get_templates(self) -> dict[str, ShiftTemplate]:
        """Return all shift templates keyed by id."""
        return self.templates

    def get_template(self, template_id: str) -> ShiftTemplate | None:
        """Return a single template or *None*."""
        return self.templates.get(template_id)

    async def async_put_template(self, template: ShiftTemplate) -> None:
        """Insert or replace a shift template."""
        self.templates[template.id] = template

    async def async_remove_template(self, template_id: str) -> None:
        """Hard-delete a template by id."""
        del self.templates[template_id]

    # ── Lists ────────────────────────────────────────────────────────

    def get_lists(self) -> dict[str, PlannerList]:
        """Return all to-do lists keyed by id."""
        return self.lists

    def get_list(self, list_id: str) -> PlannerList | None:
        """Return a single list or *None*."""
        return self.lists.get(list_id)

    # ── Tasks ────────────────────────────────────────────────────────

    def get_task(self, task_id: str) -> PlannerTask | None:
        """Return a single task or *None*."""
        return self.tasks.get(task_id)

    def get_active_tasks(self, list_id: str | None = None) -> list[PlannerTask]:
        """Return tasks that are not soft-deleted."""
        tasks = [t for t in self.tasks.values() if t.deleted_at is None]
        if list_id:
            tasks = [t for t in tasks if t.list_id == list_id]
        return tasks

    async def async_put_task(self, task: PlannerTask) -> None:
        """Insert or replace a task."""
        self.tasks[task.id] = task

    # ── Presets ──────────────────────────────────────────────────────

    def get_presets(self) -> dict[str, TaskPreset]:
        """Return all task presets keyed by id."""
        return self.presets

    def get_preset(self, preset_id: str) -> TaskPreset | None:
        """Return a single preset or *None*."""
        return self.presets.get(preset_id)

    async def async_put_preset(self, preset: TaskPreset) -> None:
        """Insert or replace a task preset."""
        self.presets[preset.id] = preset

    async def async_remove_preset(self, preset_id: str) -> None:
        """Hard-delete a preset by id."""
        del self.presets[preset_id]

    # ── Roles ────────────────────────────────────────────────────────

    def get_roles(self) -> list[RoleAssignment]:
        """Return all role assignments."""
        return self.roles

    # ── Audit ────────────────────────────────────────────────────────

    def record_audit(
        self,
        user_id: str,
        action: AuditAction,
        resource_type: str,
        resource_id: str,
        detail: str = "",
    ) -> None:
        """Append an audit entry (capped to _MAX_AUDIT_ENTRIES)."""
        entry = AuditEntry(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
        )
        self.audit_log.append(entry)
        if len(self.audit_log) > _MAX_AUDIT_ENTRIES:
            self.audit_log = self.audit_log[-_MAX_AUDIT_ENTRIES:]

    def get_audit_log(self, limit: int = 500) -> list[AuditEntry]:
        """Return the most recent *limit* audit entries."""
        return self.audit_log[-limit:]

    # ── Deleted items ───────────────────────────────────────────────

    def get_deleted_events(self, limit: int = 50) -> list[PlannerEvent]:
        """Return soft-deleted events, most recently deleted first."""
        deleted = [e for e in self.events.values() if e.deleted_at is not None]
        deleted.sort(key=lambda e: e.deleted_at or "", reverse=True)
        return deleted[:limit]

    def get_deleted_tasks(self, limit: int = 50) -> list[PlannerTask]:
        """Return soft-deleted tasks, most recently deleted first."""
        deleted = [t for t in self.tasks.values() if t.deleted_at is not None]
        deleted.sort(key=lambda t: t.deleted_at or "", reverse=True)
        return deleted[:limit]

    # ── Internal helpers ─────────────────────────────────────────────

    def _seed_defaults(self) -> None:
        """Create the default calendars, lists, and shift templates."""
        for cal_def in DEFAULT_CALENDARS:
            cal = PlannerCalendar(
                id=cal_def["id"],
                name=cal_def["name"],
                color=cal_def.get("color", "#64b5f6"),
            )
            self.calendars[cal.id] = cal

        for list_def in DEFAULT_LISTS:
            lst = PlannerList(
                id=list_def["id"],
                name=list_def["name"],
                list_type="shopping" if list_def["id"] == "shopping" else "standard",
            )
            self.lists[lst.id] = lst

        for tpl_def in DEFAULT_TEMPLATES:
            tpl = ShiftTemplate(
                id=tpl_def["id"],
                name=tpl_def["name"],
                calendar_id=tpl_def.get("calendar_id", ""),
                start_time=tpl_def.get("start_time", ""),
                end_time=tpl_def.get("end_time", ""),
                color=tpl_def.get("color", "#64b5f6"),
                emoji=tpl_def.get("emoji", ""),
            )
            self.templates[tpl.id] = tpl

        for preset_def in DEFAULT_PRESETS:
            preset = TaskPreset(
                id=preset_def["id"],
                title=preset_def.get("title", ""),
                list_id=preset_def.get("list_id", ""),
                category=preset_def.get("category", ""),
                icon=preset_def.get("icon", ""),
            )
            self.presets[preset.id] = preset

    def _prune_expired_soft_deletes(self) -> None:
        """Remove events/tasks that were soft-deleted more than SOFT_DELETE_RETENTION_DAYS ago."""
        cutoff = (
            datetime.now(UTC) - timedelta(days=SOFT_DELETE_RETENTION_DAYS)
        ).isoformat()

        expired_event_ids = [
            eid
            for eid, e in self.events.items()
            if e.deleted_at is not None and e.deleted_at < cutoff
        ]
        for eid in expired_event_ids:
            del self.events[eid]

        expired_task_ids = [
            tid
            for tid, t in self.tasks.items()
            if t.deleted_at is not None and t.deleted_at < cutoff
        ]
        for tid in expired_task_ids:
            del self.tasks[tid]

        if expired_event_ids or expired_task_ids:
            _LOGGER.debug(
                "Pruned %d expired events and %d expired tasks",
                len(expired_event_ids),
                len(expired_task_ids),
            )


# Backward-compatible alias so existing imports continue to work.
PlannerStore = JsonPlannerStore
