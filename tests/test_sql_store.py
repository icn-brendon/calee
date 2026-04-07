"""Tests for the SQL store using an in-memory SQLite database."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from custom_components.calee.db.sql_store import SqlPlannerStore
from custom_components.calee.models import (
    PlannerCalendar,
    PlannerEvent,
    PlannerList,
    PlannerTask,
    Routine,
    TaskPreset,
)


@pytest.fixture
async def sql_store():
    """Create an in-memory SQLite SQL store for testing."""
    store = SqlPlannerStore("sqlite+aiosqlite:///:memory:")
    await store.async_load()
    yield store
    await store.async_close()


# ── Event round-trip ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_event_read_back_all_fields(sql_store: SqlPlannerStore):
    """Create an event with all fields and verify they round-trip correctly."""
    event = PlannerEvent(
        id="evt_001",
        calendar_id="work_shifts",
        title="Morning Shift",
        start="2026-04-07T06:00:00+00:00",
        end="2026-04-07T14:00:00+00:00",
        all_day=False,
        note="Bring coffee",
        template_id="tpl_early",
        source="manual",
        external_id="ext_001",
        recurrence_rule="FREQ=WEEKLY;BYDAY=MO",
        exceptions=["2026-04-14", "2026-04-21"],
        version=1,
        snooze_until="2026-04-07T05:30:00+00:00",
    )
    await sql_store.async_put_event(event)

    # Reload from DB to verify persistence.
    store2 = SqlPlannerStore("sqlite+aiosqlite:///:memory:")
    store2._engine = sql_store._engine
    store2._session_factory = sql_store._session_factory
    await store2._load_all_from_db()

    got = store2.get_event("evt_001")
    assert got is not None
    assert got.id == "evt_001"
    assert got.calendar_id == "work_shifts"
    assert got.title == "Morning Shift"
    assert "06:00:00" in got.start
    assert "14:00:00" in got.end
    assert got.all_day is False
    assert got.note == "Bring coffee"
    assert got.template_id == "tpl_early"
    assert got.source == "manual"
    assert got.external_id == "ext_001"
    assert got.recurrence_rule == "FREQ=WEEKLY;BYDAY=MO"
    assert got.exceptions == ["2026-04-14", "2026-04-21"]
    assert got.version == 1
    assert got.snooze_until is not None
    assert "05:30:00" in got.snooze_until
    assert got.deleted_at is None


# ── Task round-trip ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_task_read_back_with_quantity_unit_position(sql_store: SqlPlannerStore):
    """Create a task with quantity/unit/position and verify round-trip."""
    task = PlannerTask(
        id="task_001",
        list_id="shopping",
        title="Milk",
        note="Full cream",
        completed=False,
        due="2026-04-07",
        category="groceries",
        is_recurring=True,
        recur_reset_hour=6,
        quantity=2.0,
        unit="L",
        price=4.50,
        position=3,
    )
    await sql_store.async_put_task(task)

    store2 = SqlPlannerStore("sqlite+aiosqlite:///:memory:")
    store2._engine = sql_store._engine
    store2._session_factory = sql_store._session_factory
    await store2._load_all_from_db()

    got = store2.get_task("task_001")
    assert got is not None
    assert got.id == "task_001"
    assert got.list_id == "shopping"
    assert got.title == "Milk"
    assert got.note == "Full cream"
    assert got.completed is False
    assert got.category == "groceries"
    assert got.is_recurring is True
    assert got.recur_reset_hour == 6
    assert got.quantity == 2.0
    assert got.unit == "L"
    assert got.price == 4.50
    assert got.position == 3
    assert got.deleted_at is None


# ── Soft delete + restore ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_soft_delete_and_restore_event(sql_store: SqlPlannerStore):
    """Soft-delete an event, verify it's excluded from active, then restore."""
    event = PlannerEvent(
        id="evt_sd",
        calendar_id="work_shifts",
        title="Test Shift",
        start="2026-04-07T06:00:00+00:00",
        end="2026-04-07T14:00:00+00:00",
    )
    await sql_store.async_put_event(event)

    # Soft-delete.
    deleted = sql_store.soft_delete_event("evt_sd")
    assert deleted is not None
    assert deleted.deleted_at is not None
    await sql_store.async_put_event(deleted)

    # Excluded from active events.
    active = sql_store.get_active_events()
    assert not any(e.id == "evt_sd" for e in active)

    # Appears in deleted events.
    deleted_list = sql_store.get_deleted_events()
    assert any(e.id == "evt_sd" for e in deleted_list)

    # Restore.
    restored = sql_store.restore_event("evt_sd")
    assert restored is not None
    assert restored.deleted_at is None
    await sql_store.async_put_event(restored)

    # Back in active events.
    active = sql_store.get_active_events()
    assert any(e.id == "evt_sd" for e in active)


@pytest.mark.asyncio
async def test_soft_delete_and_restore_task(sql_store: SqlPlannerStore):
    """Soft-delete a task, then restore it."""
    task = PlannerTask(
        id="task_sd",
        list_id="inbox",
        title="Test Task",
    )
    await sql_store.async_put_task(task)

    # Soft-delete.
    deleted = sql_store.soft_delete_task("task_sd")
    assert deleted is not None
    assert deleted.deleted_at is not None
    await sql_store.async_put_task(deleted)

    # Excluded from active.
    active = sql_store.get_active_tasks()
    assert not any(t.id == "task_sd" for t in active)

    # Restore.
    restored = sql_store.restore_task("task_sd")
    assert restored is not None
    assert restored.deleted_at is None
    await sql_store.async_put_task(restored)

    active = sql_store.get_active_tasks()
    assert any(t.id == "task_sd" for t in active)


# ── Pruning ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_prune_removes_old_deleted_items(sql_store: SqlPlannerStore):
    """Pruning removes soft-deleted items older than the retention window."""
    old_time = (datetime.now(UTC) - timedelta(days=60)).isoformat()

    event = PlannerEvent(
        id="evt_old",
        calendar_id="work_shifts",
        title="Old Event",
        start="2026-01-01T06:00:00+00:00",
        end="2026-01-01T14:00:00+00:00",
        deleted_at=old_time,
    )
    await sql_store.async_put_event(event)

    task = PlannerTask(
        id="task_old",
        list_id="inbox",
        title="Old Task",
        deleted_at=old_time,
    )
    await sql_store.async_put_task(task)

    # Verify they exist before pruning.
    assert sql_store.get_event("evt_old") is not None
    assert sql_store.get_task("task_old") is not None

    await sql_store.async_prune()

    # Should be removed after pruning.
    assert sql_store.get_event("evt_old") is None
    assert sql_store.get_task("task_old") is None


@pytest.mark.asyncio
async def test_prune_keeps_recent_deleted_items(sql_store: SqlPlannerStore):
    """Recently deleted items are not pruned."""
    recent_time = (datetime.now(UTC) - timedelta(days=5)).isoformat()

    event = PlannerEvent(
        id="evt_recent",
        calendar_id="work_shifts",
        title="Recent Event",
        start="2026-04-01T06:00:00+00:00",
        end="2026-04-01T14:00:00+00:00",
        deleted_at=recent_time,
    )
    await sql_store.async_put_event(event)

    await sql_store.async_prune()

    assert sql_store.get_event("evt_recent") is not None


# ── Routine CRUD ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_routine_crud_with_json_lists(sql_store: SqlPlannerStore):
    """Create, read, update, and delete a routine with JSON task/shopping lists."""
    routine = Routine(
        id="routine_test",
        name="Night Prep",
        emoji="\U0001f319",
        description="Prepare for tonight",
        shift_template_id="tpl_night",
        tasks=[
            {"title": "Pack dinner", "list_id": "inbox", "due_offset_days": 0},
        ],
        shopping_items=[
            {"title": "Energy bars", "category": "food", "quantity": 2},
        ],
    )
    await sql_store.async_put_routine(routine)

    # Read back.
    got = sql_store.get_routine("routine_test")
    assert got is not None
    assert got.name == "Night Prep"
    assert got.emoji == "\U0001f319"
    assert got.description == "Prepare for tonight"
    assert got.shift_template_id == "tpl_night"
    assert len(got.tasks) == 1
    assert got.tasks[0]["title"] == "Pack dinner"
    assert len(got.shopping_items) == 1
    assert got.shopping_items[0]["title"] == "Energy bars"

    # Reload from DB to verify JSON persistence.
    store2 = SqlPlannerStore("sqlite+aiosqlite:///:memory:")
    store2._engine = sql_store._engine
    store2._session_factory = sql_store._session_factory
    await store2._load_all_from_db()

    got2 = store2.get_routine("routine_test")
    assert got2 is not None
    assert len(got2.tasks) == 1
    assert len(got2.shopping_items) == 1
    assert got2.tasks[0]["title"] == "Pack dinner"
    assert got2.shopping_items[0]["quantity"] == 2

    # Update.
    routine.name = "Updated Routine"
    routine.tasks.append({"title": "Set alarm", "list_id": "inbox"})
    await sql_store.async_put_routine(routine)
    updated = sql_store.get_routine("routine_test")
    assert updated.name == "Updated Routine"
    assert len(updated.tasks) == 2

    # Delete.
    await sql_store.async_remove_routine("routine_test")
    assert sql_store.get_routine("routine_test") is None
    assert "routine_test" not in sql_store.get_routines()


# ── Calendar fields ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_calendar_is_private_and_emoji(sql_store: SqlPlannerStore):
    """Calendar is_private and emoji fields round-trip correctly."""
    cal = PlannerCalendar(
        id="cal_private",
        name="Private Calendar",
        color="#ff0000",
        emoji="\U0001f512",
        is_private=True,
    )
    await sql_store.async_put_calendar(cal)

    store2 = SqlPlannerStore("sqlite+aiosqlite:///:memory:")
    store2._engine = sql_store._engine
    store2._session_factory = sql_store._session_factory
    await store2._load_all_from_db()

    got = store2.get_calendar("cal_private")
    assert got is not None
    assert got.is_private is True
    assert got.emoji == "\U0001f512"


# ── List is_private ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_is_private(sql_store: SqlPlannerStore):
    """List is_private field round-trips correctly."""
    lst = PlannerList(
        id="list_private",
        name="Private List",
        list_type="standard",
        is_private=True,
    )
    await sql_store.async_put_list(lst)

    store2 = SqlPlannerStore("sqlite+aiosqlite:///:memory:")
    store2._engine = sql_store._engine
    store2._session_factory = sql_store._session_factory
    await store2._load_all_from_db()

    got = store2.get_list("list_private")
    assert got is not None
    assert got.is_private is True


# ── Preset CRUD ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_preset_crud(sql_store: SqlPlannerStore):
    """Create, read, and delete a preset."""
    preset = TaskPreset(
        id="preset_test",
        title="Coffee",
        list_id="shopping",
        category="groceries",
        icon="mdi:coffee",
    )
    await sql_store.async_put_preset(preset)

    got = sql_store.get_preset("preset_test")
    assert got is not None
    assert got.title == "Coffee"
    assert got.list_id == "shopping"
    assert got.category == "groceries"
    assert got.icon == "mdi:coffee"

    # Delete.
    await sql_store.async_remove_preset("preset_test")
    assert sql_store.get_preset("preset_test") is None
