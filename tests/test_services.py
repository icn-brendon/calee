"""Tests for the soft-delete and active-item query behaviour, plus
task update and delete operations via the PlannerAPI.

Store-level tests use the FakeStore from conftest directly.
API-level tests use a lightweight FakeHass to avoid requiring a full
Home Assistant instance.
"""

from __future__ import annotations

import pytest

from custom_components.calee.api import PlannerAPI
from custom_components.calee.models import PlannerEvent, PlannerTask

# ── Lightweight HA fakes ────────────────────────────────────────────


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


# ── Fixtures ────────────────────────────────────────────────────────


@pytest.fixture
def hass() -> _FakeHass:
    return _FakeHass()


@pytest.fixture
def api(hass, fake_store) -> PlannerAPI:
    return PlannerAPI(hass, fake_store)


# ── Store-level soft-delete tests ───────────────────────────────────


class TestSoftDelete:
    def test_soft_delete_marks_event(self, fake_store, sample_event) -> None:
        fake_store.events[sample_event.id] = sample_event
        result = fake_store.soft_delete_event(sample_event.id)

        assert result is not None
        assert result.deleted_at is not None
        assert result.version == 2  # bumped from default 1

    def test_soft_deleted_event_excluded_from_active(self, fake_store, sample_event) -> None:
        fake_store.events[sample_event.id] = sample_event
        fake_store.soft_delete_event(sample_event.id)

        active = fake_store.get_active_events()
        assert sample_event.id not in [e.id for e in active]

    def test_restore_event_clears_deleted_at(self, fake_store, sample_event) -> None:
        fake_store.events[sample_event.id] = sample_event
        fake_store.soft_delete_event(sample_event.id)
        result = fake_store.restore_event(sample_event.id)

        assert result is not None
        assert result.deleted_at is None
        assert result.version == 3  # bumped again

    def test_restore_event_makes_it_active_again(self, fake_store, sample_event) -> None:
        fake_store.events[sample_event.id] = sample_event
        fake_store.soft_delete_event(sample_event.id)
        fake_store.restore_event(sample_event.id)

        active = fake_store.get_active_events()
        assert sample_event.id in [e.id for e in active]

    def test_soft_delete_nonexistent_returns_none(self, fake_store) -> None:
        assert fake_store.soft_delete_event("nonexistent") is None

    def test_soft_delete_task(self, fake_store, sample_task) -> None:
        fake_store.tasks[sample_task.id] = sample_task
        result = fake_store.soft_delete_task(sample_task.id)

        assert result is not None
        assert result.deleted_at is not None
        assert result.version == 2

    def test_soft_deleted_task_excluded_from_active(self, fake_store, sample_task) -> None:
        fake_store.tasks[sample_task.id] = sample_task
        fake_store.soft_delete_task(sample_task.id)

        active = fake_store.get_active_tasks()
        assert sample_task.id not in [t.id for t in active]

    def test_restore_task_clears_deleted_at(self, fake_store, sample_task) -> None:
        fake_store.tasks[sample_task.id] = sample_task
        fake_store.soft_delete_task(sample_task.id)
        result = fake_store.restore_task(sample_task.id)

        assert result is not None
        assert result.deleted_at is None
        assert result.version == 3


class TestActiveQueries:
    def test_get_active_events_by_calendar(self, fake_store) -> None:
        ev1 = PlannerEvent(id="e1", calendar_id="work_shifts", title="A")
        ev2 = PlannerEvent(id="e2", calendar_id="personal", title="B")
        fake_store.events["e1"] = ev1
        fake_store.events["e2"] = ev2

        active = fake_store.get_active_events(calendar_id="work_shifts")
        assert len(active) == 1
        assert active[0].id == "e1"

    def test_get_active_tasks_by_list(self, fake_store) -> None:
        t1 = PlannerTask(id="t1", list_id="inbox", title="A")
        t2 = PlannerTask(id="t2", list_id="shopping", title="B")
        fake_store.tasks["t1"] = t1
        fake_store.tasks["t2"] = t2

        active = fake_store.get_active_tasks(list_id="shopping")
        assert len(active) == 1
        assert active[0].id == "t2"

    def test_get_active_events_all(self, fake_store) -> None:
        ev1 = PlannerEvent(id="e1", calendar_id="work_shifts", title="A")
        ev2 = PlannerEvent(id="e2", calendar_id="personal", title="B")
        fake_store.events["e1"] = ev1
        fake_store.events["e2"] = ev2

        active = fake_store.get_active_events()
        assert len(active) == 2


class TestDefaultSeeds:
    def test_default_calendars_seeded(self, fake_store) -> None:
        assert "work_shifts" in fake_store.calendars
        assert "family_shared" in fake_store.calendars
        assert "personal" in fake_store.calendars
        assert "team_shared" in fake_store.calendars

    def test_default_lists_seeded(self, fake_store) -> None:
        assert "inbox" in fake_store.lists
        assert "shopping" in fake_store.lists

    def test_today_and_upcoming_not_seeded(self, fake_store) -> None:
        """Today and Upcoming are virtual views, not physical lists."""
        assert "today" not in fake_store.lists
        assert "upcoming" not in fake_store.lists

    def test_shopping_list_type(self, fake_store) -> None:
        assert fake_store.lists["shopping"].list_type == "shopping"

    def test_inbox_list_type(self, fake_store) -> None:
        assert fake_store.lists["inbox"].list_type == "standard"


# ── API-level task update tests ─────────────────────────────────────


class TestUpdateTask:
    async def test_update_title(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Original title"
        )
        original_version = task.version
        updated = await api.async_update_task(
            task_id=task.id,
            version=original_version,
            title="New title",
        )

        assert updated.title == "New title"
        assert updated.version == original_version + 1
        assert fake_store.tasks[task.id].title == "New title"

    async def test_update_note(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task", note="Old note"
        )
        updated = await api.async_update_task(
            task_id=task.id,
            version=task.version,
            note="New note",
        )

        assert updated.note == "New note"

    async def test_update_due(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task", due="2026-04-07"
        )
        updated = await api.async_update_task(
            task_id=task.id,
            version=task.version,
            due="2026-04-10",
        )

        assert updated.due == "2026-04-10"

    async def test_update_completed_status(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )
        assert not task.completed

        updated = await api.async_update_task(
            task_id=task.id,
            version=task.version,
            completed=True,
        )

        assert updated.completed is True

    async def test_update_move_to_different_list(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Move me"
        )
        assert task.list_id == "inbox"

        updated = await api.async_update_task(
            task_id=task.id,
            version=task.version,
            list_id="shopping",
        )

        assert updated.list_id == "shopping"

    async def test_update_move_to_nonexistent_list_raises(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )

        with pytest.raises(Exception, match="not found"):
            await api.async_update_task(
                task_id=task.id,
                version=task.version,
                list_id="nonexistent",
            )

    async def test_update_version_conflict_raises(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )

        with pytest.raises(Exception, match="Version conflict"):
            await api.async_update_task(
                task_id=task.id,
                version=999,
                title="Should fail",
            )

    async def test_update_deleted_task_raises(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )
        await api.async_delete_task(task_id=task.id)

        with pytest.raises(Exception, match="not found"):
            await api.async_update_task(
                task_id=task.id,
                version=task.version,
                title="Should fail",
            )

    async def test_update_nonexistent_task_raises(self, api) -> None:
        with pytest.raises(Exception, match="not found"):
            await api.async_update_task(
                task_id="nonexistent",
                version=1,
                title="Should fail",
            )

    async def test_update_fires_bus_event(self, api, hass) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )
        hass.bus.events.clear()

        await api.async_update_task(
            task_id=task.id,
            version=task.version,
            title="Updated",
        )

        assert len(hass.bus.events) == 1
        event_type, data = hass.bus.events[0]
        assert event_type == "calee_changed"
        assert data["action"] == "update"
        assert data["resource_type"] == "task"
        assert data["resource_id"] == task.id

    async def test_update_records_audit(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task", user_id="user123"
        )
        fake_store.audit_log.clear()

        await api.async_update_task(
            task_id=task.id,
            version=task.version,
            title="Updated",
            user_id="user123",
        )

        assert len(fake_store.audit_log) == 1
        entry = fake_store.audit_log[0]
        assert entry["action"].value == "update"
        assert entry["resource_type"] == "task"
        assert entry["resource_id"] == task.id

    async def test_update_bumps_updated_at(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )
        original_updated_at = task.updated_at

        updated = await api.async_update_task(
            task_id=task.id,
            version=task.version,
            title="Changed",
        )

        assert updated.updated_at >= original_updated_at


# ── API-level task delete tests ─────────────────────────────────────


class TestDeleteTask:
    async def test_delete_soft_deletes(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Delete me"
        )
        assert task.deleted_at is None

        result = await api.async_delete_task(task_id=task.id)

        assert result.deleted_at is not None
        assert fake_store.tasks[task.id].deleted_at is not None

    async def test_deleted_task_excluded_from_active(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Delete me"
        )
        await api.async_delete_task(task_id=task.id)

        active = fake_store.get_active_tasks(list_id="inbox")
        assert task.id not in [t.id for t in active]

    async def test_delete_nonexistent_raises(self, api) -> None:
        with pytest.raises(Exception, match="not found"):
            await api.async_delete_task(task_id="nonexistent")

    async def test_delete_fires_bus_event(self, api, hass) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )
        hass.bus.events.clear()

        await api.async_delete_task(task_id=task.id)

        assert len(hass.bus.events) == 1
        event_type, data = hass.bus.events[0]
        assert event_type == "calee_changed"
        assert data["action"] == "delete"
        assert data["resource_type"] == "task"
        assert data["resource_id"] == task.id

    async def test_delete_records_audit(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task", user_id="user123"
        )
        fake_store.audit_log.clear()

        await api.async_delete_task(task_id=task.id, user_id="user123")

        assert len(fake_store.audit_log) == 1
        entry = fake_store.audit_log[0]
        assert entry["action"].value == "delete"
        assert entry["resource_type"] == "task"
        assert entry["resource_id"] == task.id

    async def test_delete_bumps_version(self, api, fake_store) -> None:
        task = await api.async_add_task(
            list_id="inbox", title="Task"
        )
        original_version = task.version

        await api.async_delete_task(task_id=task.id)

        # soft_delete_task bumps version
        assert fake_store.tasks[task.id].version == original_version + 1
