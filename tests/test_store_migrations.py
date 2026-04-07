"""Tests for storage schema and migrations."""

from custom_components.calee.const import STORAGE_VERSION
from custom_components.calee.migrations import migrate
from custom_components.calee.models import (
    PlannerCalendar,
    PlannerEvent,
    PlannerList,
    PlannerTask,
)


class TestMigrate:
    def test_sets_version_to_current(self) -> None:
        data = {"version": 1}
        result = migrate(data)
        assert result["version"] == STORAGE_VERSION

    def test_handles_missing_version_key(self) -> None:
        data = {}
        result = migrate(data)
        assert result["version"] == STORAGE_VERSION

    def test_skips_if_version_newer_than_code(self) -> None:
        data = {"version": 999, "calendars": []}
        result = migrate(data)
        assert result["version"] == 999  # untouched
        assert result["calendars"] == []


class TestModelRoundTrip:
    """Verify to_dict / from_dict round-trips for all models."""

    def test_calendar_round_trip(self) -> None:
        cal = PlannerCalendar(id="test", name="Test Cal", color="#ff0000", timezone="Australia/Sydney")
        data = cal.to_dict()
        restored = PlannerCalendar.from_dict(data)
        assert restored.id == cal.id
        assert restored.name == cal.name
        assert restored.color == cal.color
        assert restored.timezone == cal.timezone

    def test_event_round_trip(self) -> None:
        ev = PlannerEvent(
            id="evt1",
            calendar_id="cal1",
            title="Test",
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
            version=3,
            deleted_at=None,
        )
        data = ev.to_dict()
        restored = PlannerEvent.from_dict(data)
        assert restored.id == ev.id
        assert restored.version == 3
        assert restored.deleted_at is None
        assert restored.source == "manual"

    def test_event_round_trip_with_soft_delete(self) -> None:
        ev = PlannerEvent(
            id="evt2",
            calendar_id="cal1",
            title="Deleted",
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
            deleted_at="2026-04-01T00:00:00+00:00",
        )
        data = ev.to_dict()
        restored = PlannerEvent.from_dict(data)
        assert restored.deleted_at == "2026-04-01T00:00:00+00:00"

    def test_task_round_trip(self) -> None:
        task = PlannerTask(
            id="t1",
            list_id="inbox",
            title="Buy milk",
            due="2026-04-07",
            version=2,
        )
        data = task.to_dict()
        restored = PlannerTask.from_dict(data)
        assert restored.id == task.id
        assert restored.version == 2
        assert restored.deleted_at is None

    def test_list_round_trip(self) -> None:
        lst = PlannerList(id="shop", name="Shopping", list_type="shopping")
        data = lst.to_dict()
        restored = PlannerList.from_dict(data)
        assert restored.list_type == "shopping"

    def test_event_snooze_until_round_trip(self) -> None:
        """snooze_until survives a to_dict / from_dict cycle."""
        snooze_iso = "2026-04-07T10:30:00+00:00"
        ev = PlannerEvent(
            id="snz1",
            calendar_id="cal1",
            title="Snoozed",
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
            snooze_until=snooze_iso,
        )
        data = ev.to_dict()
        assert data["snooze_until"] == snooze_iso

        restored = PlannerEvent.from_dict(data)
        assert restored.snooze_until == snooze_iso

    def test_event_snooze_until_defaults_none(self) -> None:
        """Events without snooze_until in dict default to None."""
        data = {
            "id": "no_snooze",
            "calendar_id": "cal1",
            "title": "Normal",
            "start": "",
            "end": "",
        }
        ev = PlannerEvent.from_dict(data)
        assert ev.snooze_until is None

    def test_event_from_dict_defaults_version(self) -> None:
        """Events from old storage (no version field) default to 1."""
        data = {
            "id": "old",
            "calendar_id": "cal1",
            "title": "Legacy",
            "start": "",
            "end": "",
        }
        ev = PlannerEvent.from_dict(data)
        assert ev.version == 1
        assert ev.deleted_at is None
