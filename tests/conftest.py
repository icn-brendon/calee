"""Shared pytest fixtures for Calee tests."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from custom_components.calee.const import (
    DEFAULT_CALENDARS,
    DEFAULT_LISTS,
    DEFAULT_PRESETS,
    DEFAULT_TEMPLATES,
)
from custom_components.calee.models import (
    PlannerCalendar,
    PlannerEvent,
    PlannerList,
    PlannerTask,
    RoleAssignment,
    Routine,
    ShiftTemplate,
    TaskPreset,
)


class FakeStore:
    """In-memory store for unit tests (no Home Assistant dependency)."""

    def __init__(self) -> None:
        self.calendars: dict[str, PlannerCalendar] = {}
        self.events: dict[str, PlannerEvent] = {}
        self.templates: dict[str, ShiftTemplate] = {}
        self.lists: dict[str, PlannerList] = {}
        self.tasks: dict[str, PlannerTask] = {}
        self.presets: dict[str, TaskPreset] = {}
        self.routines: dict[str, Routine] = {}
        self.roles: list[RoleAssignment] = []
        self.audit_log: list = []
        self._seed_defaults()

    def _seed_defaults(self) -> None:
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

    # ── Abstract interface methods ────────────────────────────────────

    def get_calendars(self) -> dict[str, PlannerCalendar]:
        """Return all calendars."""
        return self.calendars

    def get_calendar(self, calendar_id: str) -> PlannerCalendar | None:
        """Return a single calendar by ID, or None."""
        return self.calendars.get(calendar_id)

    def get_event(self, event_id: str) -> PlannerEvent | None:
        """Return a single event by ID, or None."""
        return self.events.get(event_id)

    def get_templates(self) -> dict[str, ShiftTemplate]:
        """Return all templates."""
        return self.templates

    def get_template(self, template_id: str) -> ShiftTemplate | None:
        """Return a single template by ID, or None."""
        return self.templates.get(template_id)

    def get_lists(self) -> dict[str, PlannerList]:
        """Return all lists."""
        return self.lists

    def get_list(self, list_id: str) -> PlannerList | None:
        """Return a single list by ID, or None."""
        return self.lists.get(list_id)

    def get_task(self, task_id: str) -> PlannerTask | None:
        """Return a single task by ID, or None."""
        return self.tasks.get(task_id)

    def get_presets(self) -> dict[str, TaskPreset]:
        """Return all task presets."""
        return self.presets

    def get_preset(self, preset_id: str) -> TaskPreset | None:
        """Return a single preset by ID, or None."""
        return self.presets.get(preset_id)

    async def async_put_preset(self, preset: TaskPreset) -> None:
        """Insert or update a preset."""
        self.presets[preset.id] = preset

    async def async_remove_preset(self, preset_id: str) -> None:
        """Remove a preset from the store."""
        self.presets.pop(preset_id, None)

    def get_routines(self) -> dict[str, Routine]:
        """Return all routines."""
        return self.routines

    def get_routine(self, routine_id: str) -> Routine | None:
        """Return a single routine by ID, or None."""
        return self.routines.get(routine_id)

    async def async_put_routine(self, routine: Routine) -> None:
        """Insert or update a routine."""
        self.routines[routine.id] = routine

    async def async_remove_routine(self, routine_id: str) -> None:
        """Remove a routine from the store."""
        self.routines.pop(routine_id, None)

    def get_roles(self) -> list[RoleAssignment]:
        """Return all role assignments."""
        return self.roles

    def get_audit_log(self, limit: int | None = None) -> list:
        """Return recent audit log entries."""
        if limit is not None:
            return self.audit_log[-limit:]
        return self.audit_log

    # ── Mutation methods ───────────────────────────────────────────────

    async def async_put_event(self, event: PlannerEvent) -> None:
        """Insert or update an event."""
        self.events[event.id] = event

    async def async_put_task(self, task: PlannerTask) -> None:
        """Insert or update a task."""
        self.tasks[task.id] = task

    async def async_put_template(self, template: ShiftTemplate) -> None:
        """Insert or update a template."""
        self.templates[template.id] = template

    async def async_remove_event(self, event_id: str) -> None:
        """Remove an event from the store."""
        self.events.pop(event_id, None)

    async def async_remove_template(self, template_id: str) -> None:
        """Remove a template from the store."""
        self.templates.pop(template_id, None)

    def find_event_by_source(
        self, source: str, external_id: str
    ) -> PlannerEvent | None:
        """Find an event by its source and external ID."""
        for event in self.events.values():
            if (
                getattr(event, "source", None) == source
                and getattr(event, "external_id", None) == external_id
            ):
                return event
        return None

    # ── Existing methods (kept for backward compatibility) ─────────────

    def get_active_events(self, calendar_id: str | None = None) -> list[PlannerEvent]:
        events = [e for e in self.events.values() if e.deleted_at is None]
        if calendar_id:
            events = [e for e in events if e.calendar_id == calendar_id]
        return events

    def get_active_tasks(self, list_id: str | None = None) -> list[PlannerTask]:
        tasks = [t for t in self.tasks.values() if t.deleted_at is None]
        if list_id:
            tasks = [t for t in tasks if t.list_id == list_id]
        return tasks

    def soft_delete_event(self, event_id: str) -> PlannerEvent | None:
        event = self.events.get(event_id)
        if event and event.deleted_at is None:
            event.deleted_at = datetime.now(UTC).isoformat()
            event.version += 1
        return event

    def restore_event(self, event_id: str) -> PlannerEvent | None:
        event = self.events.get(event_id)
        if event and event.deleted_at is not None:
            event.deleted_at = None
            event.version += 1
        return event

    def soft_delete_task(self, task_id: str) -> PlannerTask | None:
        task = self.tasks.get(task_id)
        if task and task.deleted_at is None:
            task.deleted_at = datetime.now(UTC).isoformat()
            task.version += 1
        return task

    def restore_task(self, task_id: str) -> PlannerTask | None:
        task = self.tasks.get(task_id)
        if task and task.deleted_at is not None:
            task.deleted_at = None
            task.version += 1
        return task

    def record_audit(self, **kwargs: object) -> None:
        self.audit_log.append(kwargs)

    async def async_save(self) -> None:
        """Persist store data (no-op for FakeStore)."""
        pass

    async def async_close(self) -> None:
        """Clean up resources (no-op for FakeStore)."""
        pass


@pytest.fixture
def fake_store() -> FakeStore:
    """Return a fresh FakeStore instance."""
    return FakeStore()


@pytest.fixture
def sample_event() -> PlannerEvent:
    """Return a sample shift event."""
    return PlannerEvent(
        id="evt_test_001",
        calendar_id="work_shifts",
        title="Morning Shift",
        start="2026-04-07T06:00:00+00:00",
        end="2026-04-07T14:00:00+00:00",
    )


@pytest.fixture
def sample_overnight_event() -> PlannerEvent:
    """Return a sample overnight shift event."""
    return PlannerEvent(
        id="evt_test_002",
        calendar_id="work_shifts",
        title="Night Shift",
        start="2026-04-07T22:00:00+00:00",
        end="2026-04-08T06:00:00+00:00",
    )


@pytest.fixture
def sample_task() -> PlannerTask:
    """Return a sample task."""
    return PlannerTask(
        id="task_test_001",
        list_id="inbox",
        title="Pick up groceries",
        due="2026-04-07",
    )
