"""Tests for the recurring-task engine and task-event linking."""

from __future__ import annotations

import pytest

from custom_components.calee.api import PlannerAPI
from custom_components.calee.models import PlannerEvent, PlannerTask
from custom_components.calee.recurrence import (
    RecurrencePattern,
    RecurrenceType,
    next_due_date,
    parse_recurrence,
)

# ── Lightweight HA fakes (same pattern as test_services.py) ──────────


class _FakeBus:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def async_fire(self, event_type: str, data: dict) -> None:
        self.events.append((event_type, data))


class _FakeAuth:
    async def async_get_user(self, user_id: str):  # type: ignore[return]
        return type("User", (), {"is_admin": True})()


class _FakeHass:
    def __init__(self) -> None:
        self.bus = _FakeBus()
        self.auth = _FakeAuth()


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture
def hass() -> _FakeHass:
    return _FakeHass()


@pytest.fixture
def api(hass, fake_store) -> PlannerAPI:
    return PlannerAPI(hass, fake_store)


# ═══════════════════════════════════════════════════════════════════════
# 1. parse_recurrence
# ═══════════════════════════════════════════════════════════════════════


class TestParseRecurrence:
    def test_daily(self) -> None:
        p = parse_recurrence("daily")
        assert p.type == RecurrenceType.DAILY
        assert p.interval_days is None

    def test_weekly(self) -> None:
        p = parse_recurrence("weekly")
        assert p.type == RecurrenceType.WEEKLY

    def test_biweekly(self) -> None:
        p = parse_recurrence("biweekly")
        assert p.type == RecurrenceType.BIWEEKLY

    def test_monthly(self) -> None:
        p = parse_recurrence("monthly")
        assert p.type == RecurrenceType.MONTHLY

    def test_weekdays(self) -> None:
        p = parse_recurrence("weekdays")
        assert p.type == RecurrenceType.WEEKDAYS

    def test_every_n_days_with_colon(self) -> None:
        p = parse_recurrence("every_N_days:7")
        assert p.type == RecurrenceType.EVERY_N_DAYS
        assert p.interval_days == 7

    def test_every_n_days_embedded(self) -> None:
        p = parse_recurrence("every_3_days")
        assert p.type == RecurrenceType.EVERY_N_DAYS
        assert p.interval_days == 3

    def test_case_insensitive(self) -> None:
        p = parse_recurrence("Daily")
        assert p.type == RecurrenceType.DAILY

    def test_whitespace_stripped(self) -> None:
        p = parse_recurrence("  weekly  ")
        assert p.type == RecurrenceType.WEEKLY

    def test_unknown_rule_raises(self) -> None:
        with pytest.raises(ValueError, match="Unrecognised"):
            parse_recurrence("yearly")

    def test_zero_interval_raises(self) -> None:
        with pytest.raises(ValueError, match="Interval must be >= 1"):
            parse_recurrence("every_0_days")


# ═══════════════════════════════════════════════════════════════════════
# 2. next_due_date
# ═══════════════════════════════════════════════════════════════════════


class TestNextDueDate:
    def test_daily(self) -> None:
        pattern = RecurrencePattern(type=RecurrenceType.DAILY)
        assert next_due_date("2026-04-06", pattern) == "2026-04-07"

    def test_weekly(self) -> None:
        pattern = RecurrencePattern(type=RecurrenceType.WEEKLY)
        assert next_due_date("2026-04-06", pattern) == "2026-04-13"

    def test_biweekly(self) -> None:
        pattern = RecurrencePattern(type=RecurrenceType.BIWEEKLY)
        assert next_due_date("2026-04-06", pattern) == "2026-04-20"

    def test_monthly_normal(self) -> None:
        pattern = RecurrencePattern(type=RecurrenceType.MONTHLY)
        assert next_due_date("2026-04-06", pattern) == "2026-05-06"

    def test_monthly_end_of_year(self) -> None:
        pattern = RecurrencePattern(type=RecurrenceType.MONTHLY)
        assert next_due_date("2026-12-15", pattern) == "2027-01-15"

    def test_monthly_clamps_day(self) -> None:
        """Jan 31 -> Feb 28 (2026 is not a leap year)."""
        pattern = RecurrencePattern(type=RecurrenceType.MONTHLY)
        assert next_due_date("2026-01-31", pattern) == "2026-02-28"

    def test_monthly_clamps_day_leap_year(self) -> None:
        """Jan 31 -> Feb 29 in a leap year."""
        pattern = RecurrencePattern(type=RecurrenceType.MONTHLY)
        assert next_due_date("2028-01-31", pattern) == "2028-02-29"

    def test_weekdays_from_friday(self) -> None:
        """2026-04-10 is a Friday; next weekday is Monday 2026-04-13."""
        pattern = RecurrencePattern(type=RecurrenceType.WEEKDAYS)
        assert next_due_date("2026-04-10", pattern) == "2026-04-13"

    def test_weekdays_from_wednesday(self) -> None:
        """2026-04-08 is a Wednesday; next weekday is Thursday 2026-04-09."""
        pattern = RecurrencePattern(type=RecurrenceType.WEEKDAYS)
        assert next_due_date("2026-04-08", pattern) == "2026-04-09"

    def test_weekdays_from_saturday(self) -> None:
        """2026-04-11 is a Saturday; next weekday is Monday 2026-04-13."""
        pattern = RecurrencePattern(type=RecurrenceType.WEEKDAYS)
        assert next_due_date("2026-04-11", pattern) == "2026-04-13"

    def test_every_n_days(self) -> None:
        pattern = RecurrencePattern(type=RecurrenceType.EVERY_N_DAYS, interval_days=5)
        assert next_due_date("2026-04-06", pattern) == "2026-04-11"

    def test_accepts_datetime_string(self) -> None:
        """Should work with full ISO datetime, returning a date-only string."""
        pattern = RecurrencePattern(type=RecurrenceType.DAILY)
        assert next_due_date("2026-04-06T10:30:00+00:00", pattern) == "2026-04-07"


# ═══════════════════════════════════════════════════════════════════════
# 3. async_process_recurring_tasks
# ═══════════════════════════════════════════════════════════════════════


class TestProcessRecurringTasks:
    async def test_completed_recurring_task_spawns_new_one(self, api, fake_store) -> None:
        """A completed task with a daily recurrence rule should produce a new task."""
        task = PlannerTask(
            id="recurring_001",
            list_id="inbox",
            title="Water plants",
            note="Use the green can",
            completed=True,
            due="2026-04-06",
            recurrence_rule="daily",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 1
        new_task = new_tasks[0]
        assert new_task.title == "Water plants"
        assert new_task.note == "Use the green can"
        assert new_task.list_id == "inbox"
        assert new_task.due == "2026-04-07"
        assert new_task.recurrence_rule == "daily"
        assert new_task.completed is False

    async def test_source_task_rule_cleared(self, api, fake_store) -> None:
        """The completed source task should have its recurrence_rule cleared."""
        task = PlannerTask(
            id="recurring_002",
            list_id="inbox",
            title="Daily standup",
            completed=True,
            due="2026-04-06",
            recurrence_rule="weekdays",
        )
        fake_store.tasks[task.id] = task

        await api.async_process_recurring_tasks()

        assert fake_store.tasks["recurring_002"].recurrence_rule is None

    async def test_non_completed_task_ignored(self, api, fake_store) -> None:
        """Tasks that are not completed should not spawn new ones."""
        task = PlannerTask(
            id="recurring_003",
            list_id="inbox",
            title="Pending task",
            completed=False,
            due="2026-04-06",
            recurrence_rule="daily",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 0

    async def test_task_without_recurrence_ignored(self, api, fake_store) -> None:
        """Completed tasks without a recurrence rule should not spawn."""
        task = PlannerTask(
            id="recurring_004",
            list_id="inbox",
            title="One-off task",
            completed=True,
            due="2026-04-06",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 0

    async def test_task_without_due_date_ignored(self, api, fake_store) -> None:
        """Completed recurring tasks with no due date should be skipped."""
        task = PlannerTask(
            id="recurring_005",
            list_id="inbox",
            title="No due date",
            completed=True,
            recurrence_rule="daily",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 0

    async def test_weekly_recurrence(self, api, fake_store) -> None:
        task = PlannerTask(
            id="recurring_006",
            list_id="inbox",
            title="Weekly review",
            completed=True,
            due="2026-04-06",
            recurrence_rule="weekly",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 1
        assert new_tasks[0].due == "2026-04-13"
        assert new_tasks[0].recurrence_rule == "weekly"

    async def test_monthly_recurrence(self, api, fake_store) -> None:
        task = PlannerTask(
            id="recurring_007",
            list_id="inbox",
            title="Monthly report",
            completed=True,
            due="2026-04-06",
            recurrence_rule="monthly",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 1
        assert new_tasks[0].due == "2026-05-06"

    async def test_every_n_days_recurrence(self, api, fake_store) -> None:
        task = PlannerTask(
            id="recurring_008",
            list_id="inbox",
            title="Every 3 days",
            completed=True,
            due="2026-04-06",
            recurrence_rule="every_3_days",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 1
        assert new_tasks[0].due == "2026-04-09"

    async def test_invalid_rule_skipped(self, api, fake_store) -> None:
        """Tasks with an unparseable recurrence rule should be skipped gracefully."""
        task = PlannerTask(
            id="recurring_009",
            list_id="inbox",
            title="Bad rule",
            completed=True,
            due="2026-04-06",
            recurrence_rule="every_other_full_moon",
        )
        fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 0

    async def test_records_audit_entry(self, api, fake_store) -> None:
        task = PlannerTask(
            id="recurring_010",
            list_id="inbox",
            title="Audit me",
            completed=True,
            due="2026-04-06",
            recurrence_rule="daily",
        )
        fake_store.tasks[task.id] = task
        fake_store.audit_log.clear()

        await api.async_process_recurring_tasks()

        assert len(fake_store.audit_log) >= 1
        entry = fake_store.audit_log[0]
        assert entry["action"].value == "create"
        assert entry["resource_type"] == "task"
        assert "spawned" in entry["detail"]

    async def test_fires_bus_event(self, api, fake_store, hass) -> None:
        task = PlannerTask(
            id="recurring_011",
            list_id="inbox",
            title="Bus event check",
            completed=True,
            due="2026-04-06",
            recurrence_rule="daily",
        )
        fake_store.tasks[task.id] = task
        hass.bus.events.clear()

        new_tasks = await api.async_process_recurring_tasks()

        assert len(hass.bus.events) == 1
        event_type, data = hass.bus.events[0]
        assert event_type == "calee_changed"
        assert data["action"] == "create"
        assert data["resource_type"] == "task"
        assert data["resource_id"] == new_tasks[0].id

    async def test_multiple_recurring_tasks(self, api, fake_store) -> None:
        """Multiple completed recurring tasks should each spawn a new one."""
        for i in range(3):
            task = PlannerTask(
                id=f"multi_{i}",
                list_id="inbox",
                title=f"Task {i}",
                completed=True,
                due="2026-04-06",
                recurrence_rule="daily",
            )
            fake_store.tasks[task.id] = task

        new_tasks = await api.async_process_recurring_tasks()

        assert len(new_tasks) == 3
        titles = {t.title for t in new_tasks}
        assert titles == {"Task 0", "Task 1", "Task 2"}


# ═══════════════════════════════════════════════════════════════════════
# 4. Task-event linking / unlinking
# ═══════════════════════════════════════════════════════════════════════


class TestLinkTaskToEvent:
    async def test_link_sets_related_event_id(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Linked task")
        event = PlannerEvent(
            id="evt_link_001",
            calendar_id="work_shifts",
            title="Meeting",
            start="2026-04-07T09:00:00",
            end="2026-04-07T10:00:00",
        )
        fake_store.events[event.id] = event

        updated = await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )

        assert updated.related_event_id == event.id
        assert fake_store.tasks[task.id].related_event_id == event.id

    async def test_link_bumps_version(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Version check")
        event = PlannerEvent(id="evt_link_002", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event
        original_version = task.version

        updated = await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )

        assert updated.version == original_version + 1

    async def test_link_nonexistent_task_raises(self, api, fake_store) -> None:
        event = PlannerEvent(id="evt_link_003", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event

        with pytest.raises(Exception, match="not found"):
            await api.async_link_task_to_event(
                task_id="nonexistent", event_id=event.id
            )

    async def test_link_nonexistent_event_raises(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Task")

        with pytest.raises(Exception, match="not found"):
            await api.async_link_task_to_event(
                task_id=task.id, event_id="nonexistent"
            )

    async def test_link_deleted_task_raises(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Deleted")
        await api.async_delete_task(task_id=task.id)
        event = PlannerEvent(id="evt_link_004", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event

        with pytest.raises(Exception, match="not found"):
            await api.async_link_task_to_event(
                task_id=task.id, event_id=event.id
            )

    async def test_link_deleted_event_raises(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Task")
        event = PlannerEvent(
            id="evt_link_005",
            calendar_id="work_shifts",
            title="Deleted event",
        )
        fake_store.events[event.id] = event
        fake_store.soft_delete_event(event.id)

        with pytest.raises(Exception, match="not found"):
            await api.async_link_task_to_event(
                task_id=task.id, event_id=event.id
            )

    async def test_link_records_audit(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Audit link")
        event = PlannerEvent(id="evt_link_006", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event
        fake_store.audit_log.clear()

        await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id, user_id="user1"
        )

        assert len(fake_store.audit_log) == 1
        entry = fake_store.audit_log[0]
        assert entry["action"].value == "update"
        assert "Linked" in entry["detail"]

    async def test_link_fires_bus_event(self, api, fake_store, hass) -> None:
        task = await api.async_add_task(list_id="inbox", title="Bus check")
        event = PlannerEvent(id="evt_link_007", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event
        hass.bus.events.clear()

        await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )

        assert len(hass.bus.events) == 1
        _, data = hass.bus.events[0]
        assert data["action"] == "update"
        assert data["resource_type"] == "task"


class TestUnlinkTaskFromEvent:
    async def test_unlink_clears_related_event_id(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Unlink me")
        event = PlannerEvent(id="evt_unlink_001", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event

        await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )
        assert fake_store.tasks[task.id].related_event_id == event.id

        updated = await api.async_unlink_task_from_event(task_id=task.id)

        assert updated.related_event_id is None
        assert fake_store.tasks[task.id].related_event_id is None

    async def test_unlink_bumps_version(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Version")
        event = PlannerEvent(id="evt_unlink_002", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event

        linked = await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )
        version_after_link = linked.version

        unlinked = await api.async_unlink_task_from_event(task_id=task.id)
        assert unlinked.version == version_after_link + 1

    async def test_unlink_nonexistent_task_raises(self, api) -> None:
        with pytest.raises(Exception, match="not found"):
            await api.async_unlink_task_from_event(task_id="nonexistent")

    async def test_unlink_records_audit(self, api, fake_store) -> None:
        task = await api.async_add_task(list_id="inbox", title="Audit unlink")
        event = PlannerEvent(id="evt_unlink_003", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event
        await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )
        fake_store.audit_log.clear()

        await api.async_unlink_task_from_event(
            task_id=task.id, user_id="user1"
        )

        assert len(fake_store.audit_log) == 1
        entry = fake_store.audit_log[0]
        assert entry["action"].value == "update"
        assert "Unlinked" in entry["detail"]

    async def test_unlink_fires_bus_event(self, api, fake_store, hass) -> None:
        task = await api.async_add_task(list_id="inbox", title="Bus")
        event = PlannerEvent(id="evt_unlink_004", calendar_id="work_shifts", title="E")
        fake_store.events[event.id] = event
        await api.async_link_task_to_event(
            task_id=task.id, event_id=event.id
        )
        hass.bus.events.clear()

        await api.async_unlink_task_from_event(task_id=task.id)

        assert len(hass.bus.events) == 1
        _, data = hass.bus.events[0]
        assert data["action"] == "update"
        assert data["resource_type"] == "task"
