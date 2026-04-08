"""Tests for Sprint 8: Task redesign features.

Covers: task grouping/sorting helpers, position-based reordering,
and the undo (restore) flow.
"""

from __future__ import annotations

from datetime import UTC, datetime

from custom_components.calee.models import PlannerTask

from .conftest import FakeStore

# ── Helpers ────────────────────────────────────────────────────────────


def _make_task(
    task_id: str,
    title: str = "Test Task",
    list_id: str = "inbox",
    due: str | None = None,
    position: int = 0,
    completed: bool = False,
    category: str = "",
) -> PlannerTask:
    return PlannerTask(
        id=task_id,
        list_id=list_id,
        title=title,
        due=due,
        position=position,
        completed=completed,
        category=category,
    )


# ── Position ordering ─────────────────────────────────────────────────


class TestTaskPositionOrdering:
    """Tests for position-based task ordering."""

    def test_tasks_have_position_field(self):
        """PlannerTask model has a position field defaulting to 0."""
        task = PlannerTask(id="t1", list_id="inbox", title="Hello")
        assert task.position == 0

    def test_position_round_trips_through_dict(self):
        """Position field is included in to_dict and from_dict."""
        task = _make_task("t1", position=5)
        d = task.to_dict()
        assert d["position"] == 5

        restored = PlannerTask.from_dict(d)
        assert restored.position == 5

    def test_get_active_tasks_returns_by_position(self, fake_store: FakeStore):
        """get_active_tasks returns tasks; position field can be used for sorting."""
        t1 = _make_task("t1", title="Third", list_id="inbox", position=3)
        t2 = _make_task("t2", title="First", list_id="inbox", position=1)
        t3 = _make_task("t3", title="Second", list_id="inbox", position=2)

        fake_store.tasks = {t.id: t for t in [t1, t2, t3]}

        active = fake_store.get_active_tasks(list_id="inbox")
        by_pos = sorted(active, key=lambda t: t.position)
        assert [t.title for t in by_pos] == ["First", "Second", "Third"]

    def test_soft_deleted_excluded_from_active(self, fake_store: FakeStore):
        """Soft-deleted tasks are excluded from get_active_tasks."""
        t1 = _make_task("t1", position=0)
        t2 = _make_task("t2", position=1)
        t2.deleted_at = datetime.now(UTC).isoformat()

        fake_store.tasks = {t.id: t for t in [t1, t2]}
        active = fake_store.get_active_tasks(list_id="inbox")
        assert len(active) == 1
        assert active[0].id == "t1"


# ── Task restore (undo) ──────────────────────────────────────────────


class TestTaskRestore:
    """Tests for soft-delete and restore (undo) flow."""

    def test_soft_delete_sets_deleted_at(self, fake_store: FakeStore):
        """Soft-deleting a task sets its deleted_at field."""
        task = _make_task("t1")
        fake_store.tasks[task.id] = task

        result = fake_store.soft_delete_task("t1")
        assert result is not None
        assert result.deleted_at is not None
        assert result.version == 2

    def test_restore_clears_deleted_at(self, fake_store: FakeStore):
        """Restoring a task clears its deleted_at field."""
        task = _make_task("t1")
        task.deleted_at = datetime.now(UTC).isoformat()
        task.version = 2
        fake_store.tasks[task.id] = task

        result = fake_store.restore_task("t1")
        assert result is not None
        assert result.deleted_at is None
        assert result.version == 3

    def test_restore_nonexistent_returns_none(self, fake_store: FakeStore):
        """Restoring a non-existent task returns None."""
        result = fake_store.restore_task("nonexistent")
        assert result is None


# ── Task category field ──────────────────────────────────────────────


class TestTaskCategory:
    """Tests for the category field used in grouping."""

    def test_category_defaults_to_empty(self):
        """Category defaults to empty string."""
        task = PlannerTask(id="t1", list_id="inbox", title="Test")
        assert task.category == ""

    def test_category_round_trips(self):
        """Category field persists through dict conversion."""
        task = _make_task("t1", category="household")
        d = task.to_dict()
        assert d["category"] == "household"

        restored = PlannerTask.from_dict(d)
        assert restored.category == "household"

    def test_tasks_can_be_grouped_by_category(self, fake_store: FakeStore):
        """Tasks with different categories can be grouped."""
        t1 = _make_task("t1", title="Dishes", category="household")
        t2 = _make_task("t2", title="Report", category="work")
        t3 = _make_task("t3", title="Laundry", category="household")

        fake_store.tasks = {t.id: t for t in [t1, t2, t3]}

        active = fake_store.get_active_tasks()
        groups: dict[str, list[PlannerTask]] = {}
        for t in active:
            groups.setdefault(t.category, []).append(t)

        assert len(groups["household"]) == 2
        assert len(groups["work"]) == 1


# ── Version conflict detection ───────────────────────────────────────


class TestVersionConflict:
    """Tests for optimistic locking version checks."""

    def test_version_starts_at_one(self):
        """New tasks start at version 1."""
        task = PlannerTask(id="t1", list_id="inbox", title="Test")
        assert task.version == 1

    def test_soft_delete_increments_version(self, fake_store: FakeStore):
        """Soft-deleting increments the version."""
        task = _make_task("t1")
        fake_store.tasks[task.id] = task

        fake_store.soft_delete_task("t1")
        assert fake_store.tasks["t1"].version == 2

    def test_restore_increments_version(self, fake_store: FakeStore):
        """Restoring increments the version."""
        task = _make_task("t1")
        task.deleted_at = datetime.now(UTC).isoformat()
        task.version = 2
        fake_store.tasks[task.id] = task

        fake_store.restore_task("t1")
        assert fake_store.tasks["t1"].version == 3
