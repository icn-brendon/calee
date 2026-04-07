"""Tests for the Calee sensor entities."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from custom_components.calee.models import PlannerEvent, PlannerTask, ShiftTemplate
from custom_components.calee.sensor import (
    CaleeCurrentShiftSensor,
    CaleeInboxCountSensor,
    CaleeNextShiftSensor,
    CaleeShiftsThisWeekSensor,
    CaleeShiftsTodaySensor,
    CaleeShoppingCountSensor,
    CaleeTasksDueTodaySensor,
    CaleeTasksOverdueSensor,
    _week_bounds,
)

from .conftest import FakeStore

# ── Helpers ──────────────────────────────────────────────────────────


def _mock_entry(options: dict | None = None):
    """Create a mock config entry with given options."""
    entry = MagicMock()
    entry.options = options or {}
    return entry


def _now_iso(delta_hours: float = 0) -> str:
    """Return an ISO datetime string offset from now."""
    return (datetime.now(UTC) + timedelta(hours=delta_hours)).isoformat()


# ── Week bounds ──────────────────────────────────────────────────────


class TestWeekBounds:
    """Tests for the _week_bounds helper."""

    def test_week_bounds_monday_start(self):
        """Monday start: week contains the given day."""
        from datetime import date

        # Wednesday 2026-04-08
        d = date(2026, 4, 8)
        start, end = _week_bounds(d, "monday")
        assert start.weekday() == 0  # Monday
        assert end.weekday() == 6  # Sunday
        assert start <= d <= end

    def test_week_bounds_sunday_start(self):
        """Sunday start: week contains the given day."""
        from datetime import date

        d = date(2026, 4, 8)  # Wednesday
        start, end = _week_bounds(d, "sunday")
        assert start.weekday() == 6  # Sunday
        assert start <= d <= end


# ── Current Shift Sensor ─────────────────────────────────────────────


class TestCurrentShiftSensor:
    """Tests for the CaleeCurrentShiftSensor."""

    @pytest.mark.asyncio
    async def test_shows_current_shift(self, fake_store: FakeStore):
        """Sensor shows the title of the currently active shift."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_current",
            calendar_id="work_shifts",
            title="Early Shift",
            start=(now - timedelta(hours=2)).isoformat(),
            end=(now + timedelta(hours=6)).isoformat(),
            template_id="tpl_early",
        )
        fake_store.events[event.id] = event

        # Add template for emoji lookup.
        tpl = ShiftTemplate(id="tpl_early", name="Early", emoji="\u2600\ufe0f")
        fake_store.templates[tpl.id] = tpl

        sensor = CaleeCurrentShiftSensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == "Early Shift"
        attrs = sensor._attr_extra_state_attributes
        assert attrs["template_id"] == "tpl_early"
        assert attrs["emoji"] == "\u2600\ufe0f"
        assert "progress_percent" in attrs
        assert "remaining_minutes" in attrs

    @pytest.mark.asyncio
    async def test_shows_off_when_no_shift(self, fake_store: FakeStore):
        """Sensor shows 'off' when no shift is active."""
        sensor = CaleeCurrentShiftSensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == "off"


# ── Next Shift Sensor ────────────────────────────────────────────────


class TestNextShiftSensor:
    """Tests for the CaleeNextShiftSensor."""

    @pytest.mark.asyncio
    async def test_shows_next_shift(self, fake_store: FakeStore):
        """Sensor shows the next upcoming shift."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_next",
            calendar_id="work_shifts",
            title="Late Shift",
            start=(now + timedelta(hours=3)).isoformat(),
            end=(now + timedelta(hours=11)).isoformat(),
        )
        fake_store.events[event.id] = event

        sensor = CaleeNextShiftSensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value is not None
        attrs = sensor._attr_extra_state_attributes
        assert attrs["shift_title"] == "Late Shift"
        assert "starts_in_minutes" in attrs
        assert "starts_in_hours" in attrs

    @pytest.mark.asyncio
    async def test_shows_none_when_no_upcoming(self, fake_store: FakeStore):
        """Sensor shows None when no future shift exists."""
        sensor = CaleeNextShiftSensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value is None


# ── Shifts Today Sensor ──────────────────────────────────────────────


class TestShiftsTodaySensor:
    """Tests for CaleeShiftsTodaySensor."""

    @pytest.mark.asyncio
    async def test_counts_today_shifts(self, fake_store: FakeStore):
        """Sensor counts shifts that overlap today."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_today",
            calendar_id="work_shifts",
            title="Today Shift",
            start=(now - timedelta(hours=1)).isoformat(),
            end=(now + timedelta(hours=7)).isoformat(),
        )
        fake_store.events[event.id] = event

        sensor = CaleeShiftsTodaySensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == 1
        assert len(sensor._attr_extra_state_attributes["shifts"]) == 1


# ── Shifts This Week Sensor ──────────────────────────────────────────


class TestShiftsThisWeekSensor:
    """Tests for CaleeShiftsThisWeekSensor."""

    @pytest.mark.asyncio
    async def test_respects_week_start_option(self, fake_store: FakeStore):
        """Sensor uses the week_start option from config entry."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_week",
            calendar_id="work_shifts",
            title="Week Shift",
            start=now.isoformat(),
            end=(now + timedelta(hours=8)).isoformat(),
        )
        fake_store.events[event.id] = event

        entry = _mock_entry({"week_start": "monday"})
        sensor = CaleeShiftsThisWeekSensor(fake_store, entry)
        await sensor.async_update()

        assert sensor._attr_native_value >= 1
        attrs = sensor._attr_extra_state_attributes
        assert "total_hours" in attrs

    @pytest.mark.asyncio
    async def test_sunday_week_start(self, fake_store: FakeStore):
        """Sensor works with Sunday week start."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_week_sun",
            calendar_id="work_shifts",
            title="Sunday Week Shift",
            start=now.isoformat(),
            end=(now + timedelta(hours=8)).isoformat(),
        )
        fake_store.events[event.id] = event

        entry = _mock_entry({"week_start": "sunday"})
        sensor = CaleeShiftsThisWeekSensor(fake_store, entry)
        await sensor.async_update()

        assert sensor._attr_native_value >= 1


# ── Tasks Due Today Sensor ───────────────────────────────────────────


class TestTasksDueTodaySensor:
    """Tests for CaleeTasksDueTodaySensor."""

    @pytest.mark.asyncio
    async def test_counts_tasks_due_today(self, fake_store: FakeStore):
        """Sensor counts incomplete tasks due today."""
        today_str = datetime.now(UTC).date().isoformat()
        task = PlannerTask(
            id="task_today",
            list_id="inbox",
            title="Buy lunch",
            due=today_str,
            completed=False,
        )
        fake_store.tasks[task.id] = task

        sensor = CaleeTasksDueTodaySensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == 1

    @pytest.mark.asyncio
    async def test_ignores_completed_tasks(self, fake_store: FakeStore):
        """Completed tasks are not counted."""
        today_str = datetime.now(UTC).date().isoformat()
        task = PlannerTask(
            id="task_done",
            list_id="inbox",
            title="Done Task",
            due=today_str,
            completed=True,
        )
        fake_store.tasks[task.id] = task

        sensor = CaleeTasksDueTodaySensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == 0


# ── Tasks Overdue Sensor ─────────────────────────────────────────────


class TestTasksOverdueSensor:
    """Tests for CaleeTasksOverdueSensor."""

    @pytest.mark.asyncio
    async def test_counts_overdue_tasks(self, fake_store: FakeStore):
        """Sensor counts tasks with due date in the past."""
        yesterday = (datetime.now(UTC) - timedelta(days=2)).date().isoformat()
        task = PlannerTask(
            id="task_overdue",
            list_id="inbox",
            title="Overdue Task",
            due=yesterday,
            completed=False,
        )
        fake_store.tasks[task.id] = task

        sensor = CaleeTasksOverdueSensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == 1
        attrs = sensor._attr_extra_state_attributes
        assert attrs["tasks"][0]["days_overdue"] >= 1


# ── Inbox Count Sensor ───────────────────────────────────────────────


class TestInboxCountSensor:
    """Tests for CaleeInboxCountSensor."""

    @pytest.mark.asyncio
    async def test_counts_incomplete_inbox_tasks(self, fake_store: FakeStore):
        """Sensor counts incomplete tasks in the inbox list."""
        task = PlannerTask(
            id="task_inbox",
            list_id="inbox",
            title="Inbox Task",
            completed=False,
        )
        fake_store.tasks[task.id] = task

        sensor = CaleeInboxCountSensor(fake_store)
        await sensor.async_update()

        assert sensor._attr_native_value == 1


# ── Shopping Count Sensor ─────────────────────────────────────────────


class TestShoppingCountSensor:
    """Tests for CaleeShoppingCountSensor."""

    @pytest.mark.asyncio
    async def test_counts_with_budget(self, fake_store: FakeStore):
        """Sensor counts shopping items and calculates budget remaining."""
        task = PlannerTask(
            id="task_shop",
            list_id="shopping",
            title="Milk",
            completed=False,
            price=3.50,
        )
        fake_store.tasks[task.id] = task

        entry = _mock_entry({"budget": 100.0})
        sensor = CaleeShoppingCountSensor(fake_store, entry)
        await sensor.async_update()

        assert sensor._attr_native_value == 1
        attrs = sensor._attr_extra_state_attributes
        assert attrs["total_price"] == 3.50
        assert attrs["budget"] == 100.0
        assert attrs["budget_remaining"] == 96.50
        assert "Milk" in attrs["items"]

    @pytest.mark.asyncio
    async def test_no_budget_configured(self, fake_store: FakeStore):
        """Shopping sensor works with zero budget (default)."""
        task = PlannerTask(
            id="task_shop2",
            list_id="shopping",
            title="Bread",
            completed=False,
            price=2.00,
        )
        fake_store.tasks[task.id] = task

        entry = _mock_entry({})
        sensor = CaleeShoppingCountSensor(fake_store, entry)
        await sensor.async_update()

        assert sensor._attr_native_value == 1
        attrs = sensor._attr_extra_state_attributes
        assert attrs["total_price"] == 2.00
