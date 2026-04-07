"""Abstract store interface for the Calee integration.

All storage backends (JSON, MariaDB, PostgreSQL) implement this
interface so the API layer remains backend-agnostic.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..const import AuditAction
from ..models import (
    AuditEntry,
    PlannerCalendar,
    PlannerEvent,
    PlannerList,
    PlannerTask,
    RoleAssignment,
    Routine,
    ShiftTemplate,
    TaskPreset,
)


class AbstractPlannerStore(ABC):
    """Backend-agnostic contract for planner data access."""

    # ── Lifecycle ────────────────────────────────────────────────────

    @abstractmethod
    async def async_load(self) -> None:
        """Load / initialise the data store."""
        ...

    @abstractmethod
    async def async_save(self) -> None:
        """Persist any pending changes."""
        ...

    @abstractmethod
    async def async_close(self) -> None:
        """Release resources (connections, file handles, etc.)."""
        ...

    # ── Calendars ────────────────────────────────────────────────────

    @abstractmethod
    def get_calendars(self) -> dict[str, PlannerCalendar]:
        """Return all calendars keyed by id."""
        ...

    @abstractmethod
    def get_calendar(self, calendar_id: str) -> PlannerCalendar | None:
        """Return a single calendar or *None*."""
        ...

    @abstractmethod
    async def async_put_calendar(self, calendar: PlannerCalendar) -> None:
        """Insert or replace a calendar."""
        ...

    @abstractmethod
    async def async_remove_calendar(self, calendar_id: str) -> None:
        """Hard-delete a calendar by id."""
        ...

    @abstractmethod
    async def async_put_list(self, planner_list: PlannerList) -> None:
        """Insert or replace a to-do list."""
        ...

    @abstractmethod
    async def async_remove_list(self, list_id: str) -> None:
        """Hard-delete a to-do list by id."""
        ...

    # ── Events ───────────────────────────────────────────────────────

    @abstractmethod
    def get_event(self, event_id: str) -> PlannerEvent | None:
        """Return a single event or *None*."""
        ...

    @abstractmethod
    def get_active_events(self, calendar_id: str | None = None) -> list[PlannerEvent]:
        """Return events that are **not** soft-deleted."""
        ...

    @abstractmethod
    async def async_put_event(self, event: PlannerEvent) -> None:
        """Insert or replace an event."""
        ...

    @abstractmethod
    async def async_remove_event(self, event_id: str) -> None:
        """Hard-delete an event by id."""
        ...

    @abstractmethod
    def find_event_by_source(
        self, source: str, external_id: str
    ) -> PlannerEvent | None:
        """Find a single event matching *source* + *external_id*."""
        ...

    # ── Soft delete / restore ────────────────────────────────────────

    @abstractmethod
    def soft_delete_event(self, event_id: str) -> PlannerEvent | None:
        """Mark an event as deleted. Returns the event or *None*."""
        ...

    @abstractmethod
    def restore_event(self, event_id: str) -> PlannerEvent | None:
        """Undo a soft delete on an event."""
        ...

    @abstractmethod
    def soft_delete_task(self, task_id: str) -> PlannerTask | None:
        """Mark a task as deleted. Returns the task or *None*."""
        ...

    @abstractmethod
    def restore_task(self, task_id: str) -> PlannerTask | None:
        """Undo a soft delete on a task."""
        ...

    # ── Templates ────────────────────────────────────────────────────

    @abstractmethod
    def get_templates(self) -> dict[str, ShiftTemplate]:
        """Return all shift templates keyed by id."""
        ...

    @abstractmethod
    def get_template(self, template_id: str) -> ShiftTemplate | None:
        """Return a single template or *None*."""
        ...

    @abstractmethod
    async def async_put_template(self, template: ShiftTemplate) -> None:
        """Insert or replace a shift template."""
        ...

    @abstractmethod
    async def async_remove_template(self, template_id: str) -> None:
        """Hard-delete a template by id."""
        ...

    # ── Presets ──────────────────────────────────────────────────────

    @abstractmethod
    def get_presets(self) -> dict[str, TaskPreset]:
        """Return all task presets keyed by id."""
        ...

    @abstractmethod
    def get_preset(self, preset_id: str) -> TaskPreset | None:
        """Return a single preset or *None*."""
        ...

    @abstractmethod
    async def async_put_preset(self, preset: TaskPreset) -> None:
        """Insert or replace a task preset."""
        ...

    @abstractmethod
    async def async_remove_preset(self, preset_id: str) -> None:
        """Hard-delete a preset by id."""
        ...

    # ── Lists ────────────────────────────────────────────────────────

    @abstractmethod
    def get_lists(self) -> dict[str, PlannerList]:
        """Return all to-do lists keyed by id."""
        ...

    @abstractmethod
    def get_list(self, list_id: str) -> PlannerList | None:
        """Return a single list or *None*."""
        ...

    # ── Tasks ────────────────────────────────────────────────────────

    @abstractmethod
    def get_task(self, task_id: str) -> PlannerTask | None:
        """Return a single task or *None*."""
        ...

    @abstractmethod
    def get_active_tasks(self, list_id: str | None = None) -> list[PlannerTask]:
        """Return tasks that are **not** soft-deleted."""
        ...

    @abstractmethod
    async def async_put_task(self, task: PlannerTask) -> None:
        """Insert or replace a task."""
        ...

    # ── Roles ────────────────────────────────────────────────────────

    @abstractmethod
    def get_roles(self) -> list[RoleAssignment]:
        """Return all role assignments."""
        ...

    # ── Audit ────────────────────────────────────────────────────────

    @abstractmethod
    def record_audit(
        self,
        user_id: str,
        action: AuditAction,
        resource_type: str,
        resource_id: str,
        detail: str = "",
    ) -> None:
        """Append an audit entry."""
        ...

    @abstractmethod
    def get_audit_log(self, limit: int = 500) -> list[AuditEntry]:
        """Return the most recent *limit* audit entries."""
        ...

    # ── Routines ─────────────────────────────────────────────────────

    @abstractmethod
    def get_routines(self) -> dict[str, Routine]:
        """Return all routines keyed by id."""
        ...

    @abstractmethod
    def get_routine(self, routine_id: str) -> Routine | None:
        """Return a single routine or *None*."""
        ...

    @abstractmethod
    async def async_put_routine(self, routine: Routine) -> None:
        """Insert or replace a routine."""
        ...

    @abstractmethod
    async def async_remove_routine(self, routine_id: str) -> None:
        """Hard-delete a routine by id."""
        ...

    # ── Deleted items ───────────────────────────────────────────────

    @abstractmethod
    def get_deleted_events(self, limit: int = 50) -> list[PlannerEvent]:
        """Return soft-deleted events, most recently deleted first."""
        ...

    @abstractmethod
    def get_deleted_tasks(self, limit: int = 50) -> list[PlannerTask]:
        """Return soft-deleted tasks, most recently deleted first."""
        ...
