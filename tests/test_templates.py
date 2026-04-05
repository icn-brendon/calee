"""Tests for the shift template system.

Tests template CRUD, shift-from-template creation, overnight handling,
and default template seeding. Uses the FakeStore from conftest and a
lightweight FakeHass to avoid requiring a full Home Assistant instance.
"""

from __future__ import annotations

from datetime import date, datetime

import pytest

from custom_components.calee.api import PlannerAPI

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


# ── Template creation ───────────────────────────────────────────────


class TestCreateTemplate:
    async def test_create_template_round_trip(self, api, fake_store) -> None:
        tpl = await api.async_create_template(
            name="Afternoon",
            calendar_id="work_shifts",
            start_time="12:00",
            end_time="20:00",
            color="#ab47bc",
            note="Short day",
        )

        assert tpl.id in fake_store.templates
        stored = fake_store.templates[tpl.id]
        assert stored.name == "Afternoon"
        assert stored.calendar_id == "work_shifts"
        assert stored.start_time == "12:00"
        assert stored.end_time == "20:00"
        assert stored.color == "#ab47bc"
        assert stored.note == "Short day"

    async def test_create_template_fires_bus_event(self, api, hass) -> None:
        await api.async_create_template(
            name="Test",
            calendar_id="work_shifts",
            start_time="08:00",
            end_time="16:00",
        )

        assert len(hass.bus.events) == 1
        event_type, data = hass.bus.events[0]
        assert event_type == "calee_changed"
        assert data["action"] == "create"
        assert data["resource_type"] == "template"

    async def test_create_template_invalid_calendar_raises(self, api) -> None:
        with pytest.raises(Exception, match="not found"):
            await api.async_create_template(
                name="Bad",
                calendar_id="nonexistent",
                start_time="08:00",
                end_time="16:00",
            )

    async def test_create_template_records_audit(self, api, fake_store) -> None:
        await api.async_create_template(
            name="Audit Test",
            calendar_id="work_shifts",
            start_time="08:00",
            end_time="16:00",
            user_id="user123",
        )

        assert len(fake_store.audit_log) == 1
        entry = fake_store.audit_log[0]
        assert entry["action"].value == "create"
        assert entry["resource_type"] == "template"


# ── Template deletion ───────────────────────────────────────────────


class TestDeleteTemplate:
    async def test_delete_template_removes_from_store(self, api, fake_store) -> None:
        tpl = await api.async_create_template(
            name="Temp",
            calendar_id="work_shifts",
            start_time="08:00",
            end_time="16:00",
        )
        assert tpl.id in fake_store.templates

        await api.async_delete_template(template_id=tpl.id)
        assert tpl.id not in fake_store.templates

    async def test_delete_template_not_found_raises(self, api) -> None:
        with pytest.raises(Exception, match="not found"):
            await api.async_delete_template(template_id="nonexistent")

    async def test_delete_template_fires_bus_event(self, api, hass) -> None:
        tpl = await api.async_create_template(
            name="Temp",
            calendar_id="work_shifts",
            start_time="08:00",
            end_time="16:00",
        )
        hass.bus.events.clear()

        await api.async_delete_template(template_id=tpl.id)

        assert len(hass.bus.events) == 1
        event_type, data = hass.bus.events[0]
        assert event_type == "calee_changed"
        assert data["action"] == "delete"
        assert data["resource_type"] == "template"


# ── Shift from template ────────────────────────────────────────────


class TestAddShiftFromTemplate:
    async def test_creates_correct_event(self, api, fake_store) -> None:
        tpl = await api.async_create_template(
            name="Morning",
            calendar_id="work_shifts",
            start_time="06:00",
            end_time="14:00",
            note="Morning routine",
        )

        event = await api.async_add_shift_from_template(
            template_id=tpl.id,
            shift_date="2026-04-07",
        )

        assert event.id in fake_store.events
        assert event.calendar_id == "work_shifts"
        assert event.title == "Morning"
        assert event.note == "Morning routine"
        assert event.template_id == tpl.id
        assert event.source == "template"

        start = datetime.fromisoformat(event.start)
        end = datetime.fromisoformat(event.end)
        assert start.date() == date(2026, 4, 7)
        assert start.hour == 6
        assert start.minute == 0
        assert end.date() == date(2026, 4, 7)
        assert end.hour == 14
        assert end.minute == 0

    async def test_overnight_template_next_day_end(self, api, fake_store) -> None:
        tpl = await api.async_create_template(
            name="Night",
            calendar_id="work_shifts",
            start_time="22:00",
            end_time="06:00",
        )
        assert tpl.is_overnight

        event = await api.async_add_shift_from_template(
            template_id=tpl.id,
            shift_date="2026-04-07",
        )

        start = datetime.fromisoformat(event.start)
        end = datetime.fromisoformat(event.end)
        assert start.date() == date(2026, 4, 7)
        assert start.hour == 22
        assert end.date() == date(2026, 4, 8)
        assert end.hour == 6

    async def test_shift_from_template_not_found_raises(self, api) -> None:
        with pytest.raises(Exception, match="not found"):
            await api.async_add_shift_from_template(
                template_id="nonexistent",
                shift_date="2026-04-07",
            )

    async def test_shift_from_template_fires_bus_event(self, api, hass) -> None:
        tpl = await api.async_create_template(
            name="Test",
            calendar_id="work_shifts",
            start_time="08:00",
            end_time="16:00",
        )
        hass.bus.events.clear()

        await api.async_add_shift_from_template(
            template_id=tpl.id,
            shift_date="2026-04-07",
        )

        assert len(hass.bus.events) == 1
        event_type, data = hass.bus.events[0]
        assert event_type == "calee_changed"
        assert data["action"] == "create"
        assert data["resource_type"] == "event"


# ── Default template seeding ────────────────────────────────────────


class TestDefaultTemplateSeeds:
    def test_default_templates_seeded(self, fake_store) -> None:
        assert "tpl_early" in fake_store.templates
        assert "tpl_late" in fake_store.templates
        assert "tpl_night" in fake_store.templates

    def test_early_template_times(self, fake_store) -> None:
        tpl = fake_store.templates["tpl_early"]
        assert tpl.name == "Early"
        assert tpl.calendar_id == "work_shifts"
        assert tpl.start_time == "06:00"
        assert tpl.end_time == "14:00"
        assert not tpl.is_overnight

    def test_late_template_times(self, fake_store) -> None:
        tpl = fake_store.templates["tpl_late"]
        assert tpl.name == "Late"
        assert tpl.calendar_id == "work_shifts"
        assert tpl.start_time == "14:00"
        assert tpl.end_time == "22:00"
        assert not tpl.is_overnight

    def test_night_template_is_overnight(self, fake_store) -> None:
        tpl = fake_store.templates["tpl_night"]
        assert tpl.name == "Night"
        assert tpl.calendar_id == "work_shifts"
        assert tpl.start_time == "22:00"
        assert tpl.end_time == "06:00"
        assert tpl.is_overnight

    def test_template_count(self, fake_store) -> None:
        assert len(fake_store.templates) == 5
