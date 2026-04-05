"""Tests for calendar entity and model behaviour.

These tests verify the calendar entity's properties, feature flags,
device info, and the helper conversion functions without requiring
a running Home Assistant instance.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, patch

import pytest

from custom_components.calee.calendar import (
    CaleeCalendarEntity,
    _dt_to_iso,
    _find_next_event,
    _to_calendar_event,
)
from custom_components.calee.const import DOMAIN
from custom_components.calee.models import (
    PlannerCalendar,
    PlannerEvent,
    ShiftTemplate,
)

from .conftest import FakeStore

# ── Model-level tests (unchanged) ───────────────────────────────────


class TestPlannerEventModel:
    def test_default_source_is_manual(self) -> None:
        ev = PlannerEvent()
        assert ev.source == "manual"

    def test_default_version_is_one(self) -> None:
        ev = PlannerEvent()
        assert ev.version == 1

    def test_default_deleted_at_is_none(self) -> None:
        ev = PlannerEvent()
        assert ev.deleted_at is None

    def test_id_is_32_char_hex(self) -> None:
        ev = PlannerEvent()
        assert len(ev.id) == 32
        assert all(c in "0123456789abcdef" for c in ev.id)

    def test_created_at_is_utc_iso(self) -> None:
        ev = PlannerEvent()
        assert "+" in ev.created_at or ev.created_at.endswith("Z") or "UTC" in ev.created_at

    def test_to_dict_includes_version_and_deleted_at(self) -> None:
        ev = PlannerEvent(id="test", calendar_id="cal")
        d = ev.to_dict()
        assert "version" in d
        assert "deleted_at" in d
        assert d["version"] == 1
        assert d["deleted_at"] is None


class TestShiftTemplateModel:
    def test_template_defaults(self) -> None:
        tmpl = ShiftTemplate()
        assert tmpl.name == ""
        assert tmpl.calendar_id == ""
        assert tmpl.start_time == ""
        assert tmpl.end_time == ""
        assert tmpl.is_overnight is False

    def test_template_id_is_32_char_hex(self) -> None:
        tmpl = ShiftTemplate()
        assert len(tmpl.id) == 32


# ── Helper function tests ───────────────────────────────────────────


class TestDtToIso:
    def test_datetime_with_tz_returns_isoformat(self) -> None:
        dt = datetime(2026, 4, 7, 10, 0, 0, tzinfo=UTC)
        result = _dt_to_iso(dt)
        assert result == "2026-04-07T10:00:00+00:00"

    def test_naive_datetime_assumes_utc(self) -> None:
        dt = datetime(2026, 4, 7, 10, 0, 0)
        result = _dt_to_iso(dt)
        assert "+00:00" in result
        assert "2026-04-07T10:00:00" in result

    def test_date_returns_iso_date_string(self) -> None:
        d = date(2026, 4, 7)
        result = _dt_to_iso(d)
        assert result == "2026-04-07"


class TestToCalendarEvent:
    def test_valid_event_converts(self) -> None:
        ev = PlannerEvent(
            id="e1",
            title="Test",
            start="2026-04-07T10:00:00+00:00",
            end="2026-04-07T12:00:00+00:00",
            note="A note",
        )
        result = _to_calendar_event(ev)
        assert result is not None
        assert result.summary == "Test"
        assert result.uid == "e1"
        assert result.description == "A note"

    def test_empty_start_returns_none(self) -> None:
        ev = PlannerEvent(id="e1", start="", end="2026-04-07T12:00:00+00:00")
        result = _to_calendar_event(ev)
        assert result is None

    def test_empty_end_returns_none(self) -> None:
        ev = PlannerEvent(id="e1", start="2026-04-07T10:00:00+00:00", end="")
        result = _to_calendar_event(ev)
        assert result is None

    def test_empty_note_sets_description_none(self) -> None:
        ev = PlannerEvent(
            id="e1",
            title="Test",
            start="2026-04-07T10:00:00+00:00",
            end="2026-04-07T12:00:00+00:00",
            note="",
        )
        result = _to_calendar_event(ev)
        assert result is not None
        assert result.description is None

    def test_all_day_event_returns_date_objects(self) -> None:
        ev = PlannerEvent(
            id="e1",
            title="Holiday",
            start="2026-04-07",
            end="2026-04-08",
            all_day=True,
        )
        result = _to_calendar_event(ev)
        assert result is not None
        assert isinstance(result.start, date)
        assert not isinstance(result.start, datetime)
        assert isinstance(result.end, date)
        assert not isinstance(result.end, datetime)
        assert result.start == date(2026, 4, 7)
        assert result.end == date(2026, 4, 8)

    def test_all_day_event_with_datetime_string_returns_date_objects(self) -> None:
        """All-day events stored with full datetime strings still return dates."""
        ev = PlannerEvent(
            id="e1",
            title="Holiday",
            start="2026-04-07T00:00:00+00:00",
            end="2026-04-08T00:00:00+00:00",
            all_day=True,
        )
        result = _to_calendar_event(ev)
        assert result is not None
        assert isinstance(result.start, date)
        assert not isinstance(result.start, datetime)
        assert result.start == date(2026, 4, 7)
        assert result.end == date(2026, 4, 8)

    def test_timed_event_returns_datetime_objects(self) -> None:
        ev = PlannerEvent(
            id="e1",
            title="Meeting",
            start="2026-04-07T10:00:00+00:00",
            end="2026-04-07T11:00:00+00:00",
            all_day=False,
        )
        result = _to_calendar_event(ev)
        assert result is not None
        assert isinstance(result.start, datetime)
        assert isinstance(result.end, datetime)
        assert result.start == datetime(2026, 4, 7, 10, 0, 0, tzinfo=UTC)
        assert result.end == datetime(2026, 4, 7, 11, 0, 0, tzinfo=UTC)

    def test_all_day_event_invalid_date_returns_none(self) -> None:
        ev = PlannerEvent(
            id="e1",
            title="Bad",
            start="not-a-date",
            end="2026-04-08",
            all_day=True,
        )
        result = _to_calendar_event(ev)
        assert result is None


class TestFindNextEvent:
    def test_returns_soonest_future_event(self) -> None:
        now = datetime(2026, 4, 7, 9, 0, 0, tzinfo=UTC)
        events = [
            PlannerEvent(
                id="e1",
                title="Later",
                start="2026-04-07T14:00:00+00:00",
                end="2026-04-07T16:00:00+00:00",
            ),
            PlannerEvent(
                id="e2",
                title="Sooner",
                start="2026-04-07T10:00:00+00:00",
                end="2026-04-07T12:00:00+00:00",
            ),
        ]
        result = _find_next_event(events, now)
        assert result is not None
        assert result.uid == "e2"

    def test_returns_none_when_all_ended(self) -> None:
        now = datetime(2026, 4, 7, 20, 0, 0, tzinfo=UTC)
        events = [
            PlannerEvent(
                id="e1",
                title="Past",
                start="2026-04-07T06:00:00+00:00",
                end="2026-04-07T08:00:00+00:00",
            ),
        ]
        result = _find_next_event(events, now)
        assert result is None

    def test_returns_none_when_empty(self) -> None:
        now = datetime(2026, 4, 7, 9, 0, 0, tzinfo=UTC)
        result = _find_next_event([], now)
        assert result is None

    def test_all_day_event_found_when_current(self) -> None:
        now = datetime(2026, 4, 7, 9, 0, 0, tzinfo=UTC)
        events = [
            PlannerEvent(
                id="e1",
                title="All Day",
                start="2026-04-07",
                end="2026-04-08",
                all_day=True,
            ),
        ]
        result = _find_next_event(events, now)
        assert result is not None
        assert result.uid == "e1"
        assert isinstance(result.start, date)
        assert not isinstance(result.start, datetime)

    def test_mixed_all_day_and_timed_events(self) -> None:
        now = datetime(2026, 4, 7, 9, 0, 0, tzinfo=UTC)
        events = [
            PlannerEvent(
                id="e_allday",
                title="Holiday",
                start="2026-04-07",
                end="2026-04-08",
                all_day=True,
            ),
            PlannerEvent(
                id="e_timed",
                title="Meeting",
                start="2026-04-07T14:00:00+00:00",
                end="2026-04-07T15:00:00+00:00",
                all_day=False,
            ),
        ]
        result = _find_next_event(events, now)
        assert result is not None
        # All-day event starts at midnight, so it comes first.
        assert result.uid == "e_allday"


# ── Entity property / feature tests ─────────────────────────────────


class TestCalendarEntityProperties:
    """Tests for CaleeCalendarEntity attributes and features."""

    @pytest.fixture
    def store(self) -> FakeStore:
        return FakeStore()

    @pytest.fixture
    def api(self) -> AsyncMock:
        mock = AsyncMock()
        mock.async_add_shift = AsyncMock()
        mock.async_delete_shift = AsyncMock()
        mock.async_update_shift = AsyncMock()
        return mock

    @pytest.fixture
    def calendar(self) -> PlannerCalendar:
        return PlannerCalendar(id="work_shifts", name="Work Shifts", color="#e57373")

    @pytest.fixture
    def entity(self, store, api, calendar) -> CaleeCalendarEntity:
        ent = CaleeCalendarEntity(store, api, calendar)
        # Patch HA-internal method that requires a running event loop.
        ent.async_schedule_update_ha_state = lambda force_refresh=False: None
        return ent

    def test_unique_id(self, entity) -> None:
        assert entity.unique_id == f"{DOMAIN}_work_shifts"

    def test_name(self, entity) -> None:
        assert entity.name == "Work Shifts"

    def test_has_entity_name_true(self, entity) -> None:
        assert entity._attr_has_entity_name is True

    def test_supported_features_include_create(self, entity) -> None:
        from homeassistant.components.calendar import CalendarEntityFeature

        assert entity.supported_features & CalendarEntityFeature.CREATE_EVENT

    def test_supported_features_include_delete(self, entity) -> None:
        from homeassistant.components.calendar import CalendarEntityFeature

        assert entity.supported_features & CalendarEntityFeature.DELETE_EVENT

    def test_supported_features_include_update(self, entity) -> None:
        from homeassistant.components.calendar import CalendarEntityFeature

        assert entity.supported_features & CalendarEntityFeature.UPDATE_EVENT

    def test_device_info_set(self, entity) -> None:
        info = entity.device_info
        assert info is not None
        assert (DOMAIN, "calee") in info["identifiers"]
        assert info["name"] == "Calee"
        assert info["manufacturer"] == "Calee"

    def test_event_property_initially_none(self, entity) -> None:
        assert entity.event is None


# ── Entity mutation method tests ────────────────────────────────────


class TestCalendarEntityMutations:
    """Tests that entity mutation methods route to PlannerAPI correctly."""

    @pytest.fixture
    def store(self) -> FakeStore:
        return FakeStore()

    @pytest.fixture
    def api(self) -> AsyncMock:
        mock = AsyncMock()
        mock.async_add_shift = AsyncMock()
        mock.async_delete_shift = AsyncMock()
        mock.async_update_shift = AsyncMock()
        return mock

    @pytest.fixture
    def calendar(self) -> PlannerCalendar:
        return PlannerCalendar(id="work_shifts", name="Work Shifts")

    @pytest.fixture
    def entity(self, store, api, calendar) -> CaleeCalendarEntity:
        ent = CaleeCalendarEntity(store, api, calendar)
        ent.async_schedule_update_ha_state = lambda force_refresh=False: None
        return ent

    @pytest.mark.asyncio
    async def test_async_create_event_calls_api(self, entity, api) -> None:
        dtstart = datetime(2026, 4, 10, 8, 0, 0, tzinfo=UTC)
        dtend = datetime(2026, 4, 10, 16, 0, 0, tzinfo=UTC)

        await entity.async_create_event(
            dtstart=dtstart,
            dtend=dtend,
            summary="Day Shift",
            description="Cover for Sarah",
        )

        api.async_add_shift.assert_awaited_once_with(
            calendar_id="work_shifts",
            title="Day Shift",
            start=dtstart.isoformat(),
            end=dtend.isoformat(),
            note="Cover for Sarah",
        )

    @pytest.mark.asyncio
    async def test_async_create_event_with_date_objects(self, entity, api) -> None:
        dtstart = date(2026, 4, 10)
        dtend = date(2026, 4, 11)

        await entity.async_create_event(
            dtstart=dtstart,
            dtend=dtend,
            summary="All Day",
        )

        api.async_add_shift.assert_awaited_once()
        call_kwargs = api.async_add_shift.call_args.kwargs
        assert call_kwargs["start"] == "2026-04-10"
        assert call_kwargs["end"] == "2026-04-11"

    @pytest.mark.asyncio
    async def test_async_delete_event_calls_api(self, entity, api) -> None:
        await entity.async_delete_event(uid="evt_123")

        api.async_delete_shift.assert_awaited_once_with(event_id="evt_123")

    @pytest.mark.asyncio
    async def test_async_update_event_calls_api(self, entity, store, api) -> None:
        # Seed an event so the entity can look up its version.
        ev = PlannerEvent(
            id="evt_456",
            calendar_id="work_shifts",
            title="Old Title",
            start="2026-04-10T08:00:00+00:00",
            end="2026-04-10T16:00:00+00:00",
            version=3,
        )
        store.events["evt_456"] = ev

        new_start = datetime(2026, 4, 10, 9, 0, 0, tzinfo=UTC)
        new_end = datetime(2026, 4, 10, 17, 0, 0, tzinfo=UTC)

        await entity.async_update_event(
            uid="evt_456",
            event={
                "summary": "New Title",
                "description": "Updated note",
                "dtstart": new_start,
                "dtend": new_end,
            },
        )

        api.async_update_shift.assert_awaited_once_with(
            event_id="evt_456",
            version=3,
            title="New Title",
            start=new_start.isoformat(),
            end=new_end.isoformat(),
            note="Updated note",
        )

    @pytest.mark.asyncio
    async def test_async_update_event_missing_uid_logs_warning(
        self, entity, api
    ) -> None:
        """Updating a nonexistent event should not raise."""
        with patch(
            "custom_components.calee.calendar._LOGGER"
        ) as mock_logger:
            await entity.async_update_event(
                uid="nonexistent",
                event={"summary": "Nope"},
            )
            mock_logger.warning.assert_called_once()
        api.async_update_shift.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_async_update_event_partial_fields(
        self, entity, store, api
    ) -> None:
        """Only changed fields should be forwarded; others remain None."""
        ev = PlannerEvent(
            id="evt_789",
            calendar_id="work_shifts",
            title="Original",
            start="2026-04-10T08:00:00+00:00",
            end="2026-04-10T16:00:00+00:00",
            version=1,
        )
        store.events["evt_789"] = ev

        await entity.async_update_event(
            uid="evt_789",
            event={"summary": "Renamed"},
        )

        api.async_update_shift.assert_awaited_once_with(
            event_id="evt_789",
            version=1,
            title="Renamed",
            start=None,
            end=None,
            note=None,
        )
