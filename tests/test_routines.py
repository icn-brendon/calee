"""Tests for duplicate-merge behaviour and routine execution.

Covers:
- Adding a duplicate shopping task increments quantity and returns merged flag.
- Executing a routine creates shift + tasks + shopping items.
- Executing a routine with an invalid date raises an error.
"""

from __future__ import annotations

import pytest

from custom_components.calee.api import PlannerAPI
from custom_components.calee.models import Routine

# ── Lightweight HA fakes (mirrors test_services.py) ──────────────────


class _FakeBus:
    """Records bus events without needing a real HA event loop."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def async_fire(self, event_type: str, data: dict) -> None:
        self.events.append((event_type, data))


class _FakeAuth:
    """Stub auth that always returns an admin user."""

    async def async_get_user(self, user_id: str):  # type: ignore[return]
        return type("User", (), {"is_admin": True})()


class _FakeHass:
    """Minimal stand-in for HomeAssistant used by PlannerAPI."""

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


# ── Duplicate merge tests ─────────────────────────────────────────────


class TestDuplicateMerge:
    """Adding a shopping item that already exists merges quantities."""

    @pytest.mark.asyncio
    async def test_duplicate_shopping_task_increments_quantity(
        self, api: PlannerAPI, fake_store
    ) -> None:
        # Add first item
        task1 = await api.async_add_task(
            list_id="shopping",
            title="Milk",
            quantity=2.0,
            unit="L",
        )
        assert task1.quantity == 2.0

        # Add duplicate — should merge
        task2 = await api.async_add_task(
            list_id="shopping",
            title="Milk",
            quantity=3.0,
            unit="L",
        )
        assert task2.id == task1.id, "Merged task should reuse existing ID"
        assert task2.quantity == 5.0, "Quantities should be summed"
        assert getattr(task2, "_merged", False) is True

    @pytest.mark.asyncio
    async def test_duplicate_different_case_still_merges(
        self, api: PlannerAPI, fake_store
    ) -> None:
        task1 = await api.async_add_task(
            list_id="shopping",
            title="Bread",
            quantity=1.0,
        )
        task2 = await api.async_add_task(
            list_id="shopping",
            title="  BREAD  ",
            quantity=1.0,
        )
        assert task2.id == task1.id
        assert task2.quantity == 2.0
        assert getattr(task2, "_merged", False) is True


# ── Routine execution tests ──────────────────────────────────────────


class TestRoutineExecute:
    """Executing a routine should create shifts, tasks, and shopping items."""

    @pytest.mark.asyncio
    async def test_execute_routine_creates_tasks_and_shopping(
        self, api: PlannerAPI, fake_store
    ) -> None:
        routine = Routine(
            id="routine_test_001",
            name="Day Shift Prep",
            tasks=[
                {"title": "Pack lunch", "list_id": "inbox", "due_offset_days": 0},
            ],
            shopping_items=[
                {"title": "Energy bars", "category": "food", "quantity": 3, "unit": "pcs"},
                {"title": "Water", "category": "drinks", "quantity": 2, "unit": "L"},
            ],
        )
        await fake_store.async_put_routine(routine)

        result = await api.async_execute_routine(
            routine_id="routine_test_001",
            target_date="2026-04-07",
        )

        assert result["routine_id"] == "routine_test_001"
        assert len(result["task_ids"]) == 1
        assert len(result["shopping_item_ids"]) == 2

        # Verify the tasks actually exist in the store
        for tid in result["task_ids"]:
            assert fake_store.get_task(tid) is not None
        for sid in result["shopping_item_ids"]:
            assert fake_store.get_task(sid) is not None

    @pytest.mark.asyncio
    async def test_execute_routine_with_shift_template(
        self, api: PlannerAPI, fake_store
    ) -> None:
        routine = Routine(
            id="routine_shift_001",
            name="Morning Routine",
            shift_template_id="tpl_early",
            tasks=[],
            shopping_items=[],
        )
        await fake_store.async_put_routine(routine)

        result = await api.async_execute_routine(
            routine_id="routine_shift_001",
            target_date="2026-04-07",
        )

        assert result["routine_id"] == "routine_shift_001"
        # Shift should have been created from the 'early' template
        assert result["shift_id"] is not None

    @pytest.mark.asyncio
    async def test_execute_routine_invalid_date_raises(
        self, api: PlannerAPI, fake_store
    ) -> None:
        routine = Routine(
            id="routine_bad_date",
            name="Bad Date Routine",
            tasks=[{"title": "X", "list_id": "inbox", "due_offset_days": 0}],
            shopping_items=[],
        )
        await fake_store.async_put_routine(routine)

        with pytest.raises(Exception, match="Invalid date format"):
            await api.async_execute_routine(
                routine_id="routine_bad_date",
                target_date="not-a-date",
            )

    @pytest.mark.asyncio
    async def test_execute_routine_saves_audit(
        self, api: PlannerAPI, fake_store
    ) -> None:
        routine = Routine(
            id="routine_audit_001",
            name="Audit Test",
            tasks=[],
            shopping_items=[],
        )
        await fake_store.async_put_routine(routine)

        await api.async_execute_routine(
            routine_id="routine_audit_001",
            target_date="2026-04-07",
        )

        # Check an audit entry was recorded for the execution
        audit_entries = [
            e for e in fake_store.audit_log
            if e.get("resource_id") == "routine_audit_001"
            and "Executed" in e.get("detail", "")
        ]
        assert len(audit_entries) == 1
