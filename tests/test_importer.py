"""Tests for the roster import engine (CSV and ICS parsers) and the
full import flow through PlannerAPI.
"""

from __future__ import annotations

import pytest

from custom_components.calee.api import PlannerAPI
from custom_components.calee.importer import (
    ImportResult,
    parse_csv,
    parse_ics,
)

# ── Lightweight HA fakes (same pattern as test_services.py) ──────────


class _FakeBus:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def async_fire(self, event_type: str, data: dict) -> None:
        self.events.append((event_type, data))


class _FakeAuth:
    async def async_get_user(self, user_id: str):
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


# ── Sample data ───────────────────────────────────────────────────────

SAMPLE_CSV_SHIFTS = """\
Date,Start,End,Name,Note
2026-04-07,06:00,14:00,Early,Morning shift
2026-04-08,14:00,22:00,Late,
2026-04-09,22:00,06:00,Night,Overnight shift
"""

SAMPLE_CSV_ISO = """\
start_datetime,end_datetime,title,note
2026-04-07T06:00:00,2026-04-07T14:00:00,Early,Morning shift
2026-04-08T14:00:00,2026-04-08T22:00:00,Late,
"""

SAMPLE_CSV_FULL_ISO_START_END = """\
start,end,title
2026-04-07T06:00:00,2026-04-07T14:00:00,Early
2026-04-08T14:00:00,2026-04-08T22:00:00,Late
"""

SAMPLE_CSV_MALFORMED = """\
foo,bar,baz
1,2,3
"""

SAMPLE_CSV_BAD_DATES = """\
Date,Start,End,Name
not-a-date,06:00,14:00,Early
"""

SAMPLE_ICS = """\
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DTSTART:20260407T060000Z
DTEND:20260407T140000Z
SUMMARY:Early Shift
DESCRIPTION:Morning shift
UID:shift-001@roster_app
END:VEVENT
BEGIN:VEVENT
DTSTART:20260408T140000Z
DTEND:20260408T220000Z
SUMMARY:Late Shift
UID:shift-002@roster_app
END:VEVENT
END:VCALENDAR
"""

SAMPLE_ICS_NO_UID = """\
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260410T080000Z
DTEND:20260410T160000Z
SUMMARY:Unknown UID Shift
END:VEVENT
END:VCALENDAR
"""

SAMPLE_ICS_MALFORMED = """\
BEGIN:VCALENDAR
VERSION:2.0
This is not valid ICS at all
END:VCALENDAR
"""

SAMPLE_ICS_FOLDED = """\
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260407T060000Z
DTEND:20260407T140000Z
SUMMARY:Long summary that is
 folded across lines
UID:shift-fold@test
END:VEVENT
END:VCALENDAR
"""

SAMPLE_ICS_NO_DTEND = """\
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260407T090000Z
SUMMARY:No End Time
UID:shift-noend@test
END:VEVENT
END:VCALENDAR
"""

SAMPLE_ICS_LOCAL_TIME = """\
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;TZID=Australia/Sydney:20260407T060000
DTEND;TZID=Australia/Sydney:20260407T140000
SUMMARY:Local Time Shift
UID:shift-local@test
END:VEVENT
END:VCALENDAR
"""


# ═══════════════════════════════════════════════════════════════════════
#  CSV Parser Tests
# ═══════════════════════════════════════════════════════════════════════


class TestCSVParser:
    def test_parse_roster_app_format(self) -> None:
        """Parse standard Date,Start,End,Name,Note CSV rows."""
        results = parse_csv(SAMPLE_CSV_SHIFTS)
        assert len(results) == 3

        early = results[0]
        assert early["title"] == "Early"
        assert early["start"] == "2026-04-07T06:00:00"
        assert early["end"] == "2026-04-07T14:00:00"
        assert early["note"] == "Morning shift"
        assert early["external_id"]  # non-empty hash

    def test_parse_overnight_shift(self) -> None:
        """Overnight shift (22:00-06:00) should set end to next day."""
        results = parse_csv(SAMPLE_CSV_SHIFTS)
        night = results[2]
        assert night["title"] == "Night"
        assert night["start"] == "2026-04-09T22:00:00"
        assert night["end"] == "2026-04-10T06:00:00"  # next day

    def test_parse_iso_datetime_format(self) -> None:
        """Parse start_datetime,end_datetime,title columns."""
        results = parse_csv(SAMPLE_CSV_ISO)
        assert len(results) == 2
        assert results[0]["title"] == "Early"
        assert results[0]["start"] == "2026-04-07T06:00:00"
        assert results[0]["end"] == "2026-04-07T14:00:00"

    def test_parse_full_iso_start_end(self) -> None:
        """Parse start,end,title with full ISO datetimes (no date column)."""
        results = parse_csv(SAMPLE_CSV_FULL_ISO_START_END)
        assert len(results) == 2
        assert results[0]["title"] == "Early"
        assert results[1]["title"] == "Late"

    def test_deterministic_external_id(self) -> None:
        """Same data should produce the same external_id every time."""
        results1 = parse_csv(SAMPLE_CSV_SHIFTS)
        results2 = parse_csv(SAMPLE_CSV_SHIFTS)

        for r1, r2 in zip(results1, results2, strict=True):
            assert r1["external_id"] == r2["external_id"]

    def test_different_shifts_different_ids(self) -> None:
        """Different shifts must have different external_ids."""
        results = parse_csv(SAMPLE_CSV_SHIFTS)
        ids = [r["external_id"] for r in results]
        assert len(set(ids)) == len(ids)

    def test_malformed_csv_returns_empty(self) -> None:
        """CSV with unrecognised columns should return no results."""
        results = parse_csv(SAMPLE_CSV_MALFORMED)
        assert results == []

    def test_bad_date_skips_row(self) -> None:
        """Invalid date in a row should be skipped without raising."""
        results = parse_csv(SAMPLE_CSV_BAD_DATES)
        assert len(results) == 0

    def test_empty_csv_returns_empty(self) -> None:
        """Empty input should return an empty list."""
        assert parse_csv("") == []

    def test_empty_note_is_empty_string(self) -> None:
        """Missing note field should default to empty string."""
        results = parse_csv(SAMPLE_CSV_SHIFTS)
        late = results[1]
        assert late["note"] == ""


# ═══════════════════════════════════════════════════════════════════════
#  ICS Parser Tests
# ═══════════════════════════════════════════════════════════════════════


class TestICSParser:
    def test_parse_basic_ics(self) -> None:
        """Parse a valid ICS with two VEVENTs."""
        results = parse_ics(SAMPLE_ICS)
        assert len(results) == 2

        early = results[0]
        assert early["title"] == "Early Shift"
        assert early["note"] == "Morning shift"
        assert early["external_id"] == "shift-001@roster_app"
        assert "2026-04-07" in early["start"]
        assert "2026-04-07" in early["end"]

    def test_uid_used_as_external_id(self) -> None:
        """UID from ICS should be used directly as external_id."""
        results = parse_ics(SAMPLE_ICS)
        assert results[0]["external_id"] == "shift-001@roster_app"
        assert results[1]["external_id"] == "shift-002@roster_app"

    def test_missing_uid_generates_hash(self) -> None:
        """VEVENT without UID should generate a hash-based external_id."""
        results = parse_ics(SAMPLE_ICS_NO_UID)
        assert len(results) == 1
        assert results[0]["external_id"]  # non-empty
        assert "@" not in results[0]["external_id"]  # not a UID, it's a hash

    def test_malformed_ics_returns_empty(self) -> None:
        """ICS without any VEVENT blocks should return no results."""
        results = parse_ics(SAMPLE_ICS_MALFORMED)
        assert results == []

    def test_empty_ics_returns_empty(self) -> None:
        """Empty input should return empty list."""
        assert parse_ics("") == []

    def test_folded_lines(self) -> None:
        """RFC 5545 folded lines should be unfolded before parsing."""
        results = parse_ics(SAMPLE_ICS_FOLDED)
        assert len(results) == 1
        assert "folded across lines" in results[0]["title"]
        assert results[0]["external_id"] == "shift-fold@test"

    def test_no_dtend_defaults_to_one_hour(self) -> None:
        """VEVENT without DTEND should default to 1 hour duration."""
        results = parse_ics(SAMPLE_ICS_NO_DTEND)
        assert len(results) == 1
        assert "2026-04-07T09:00:00" in results[0]["start"]
        assert "2026-04-07T10:00:00" in results[0]["end"]

    def test_tzid_parameter(self) -> None:
        """DTSTART with TZID parameter should still parse correctly."""
        results = parse_ics(SAMPLE_ICS_LOCAL_TIME)
        assert len(results) == 1
        assert results[0]["title"] == "Local Time Shift"
        assert results[0]["external_id"] == "shift-local@test"

    def test_deterministic_no_uid(self) -> None:
        """Same ICS without UID should produce same hash every time."""
        r1 = parse_ics(SAMPLE_ICS_NO_UID)
        r2 = parse_ics(SAMPLE_ICS_NO_UID)
        assert r1[0]["external_id"] == r2[0]["external_id"]


# ═══════════════════════════════════════════════════════════════════════
#  ImportResult Tests
# ═══════════════════════════════════════════════════════════════════════


class TestImportResult:
    def test_to_dict(self) -> None:
        result = ImportResult(created=2, updated=1, skipped=3, errors=0)
        d = result.to_dict()
        assert d["created"] == 2
        assert d["updated"] == 1
        assert d["skipped"] == 3
        assert d["errors"] == 0
        assert d["error_details"] == []

    def test_error_details(self) -> None:
        result = ImportResult(errors=1, error_details=["bad row"])
        assert result.to_dict()["error_details"] == ["bad row"]


# ═══════════════════════════════════════════════════════════════════════
#  Full Import Flow Tests (through PlannerAPI)
# ═══════════════════════════════════════════════════════════════════════


class TestImportCSVFlow:
    async def test_import_csv_creates_events(self, api, fake_store) -> None:
        """Importing CSV should create events in the store."""
        result = await api.async_import_csv(
            calendar_id="work_shifts",
            csv_data=SAMPLE_CSV_SHIFTS,
        )

        assert result.created == 3
        assert result.updated == 0
        assert result.skipped == 0
        assert result.errors == 0

        # Events should be in the store.
        active = fake_store.get_active_events(calendar_id="work_shifts")
        assert len(active) == 3

    async def test_import_csv_idempotent(self, api, fake_store) -> None:
        """Importing the same CSV twice should skip on the second run."""
        result1 = await api.async_import_csv(
            calendar_id="work_shifts",
            csv_data=SAMPLE_CSV_SHIFTS,
        )
        assert result1.created == 3

        result2 = await api.async_import_csv(
            calendar_id="work_shifts",
            csv_data=SAMPLE_CSV_SHIFTS,
        )
        assert result2.created == 0
        assert result2.skipped == 3
        assert result2.updated == 0

        # Total events should still be 3.
        active = fake_store.get_active_events(calendar_id="work_shifts")
        assert len(active) == 3

    async def test_import_csv_custom_source(self, api, fake_store) -> None:
        """Custom source label should be stored on events."""
        await api.async_import_csv(
            calendar_id="work_shifts",
            csv_data=SAMPLE_CSV_SHIFTS,
            source="roster_app",
        )

        active = fake_store.get_active_events(calendar_id="work_shifts")
        for event in active:
            assert event.source == "roster_app"

    async def test_import_csv_invalid_calendar_raises(self, api) -> None:
        """Importing to a non-existent calendar should raise."""
        with pytest.raises(Exception, match="not found"):
            await api.async_import_csv(
                calendar_id="nonexistent",
                csv_data=SAMPLE_CSV_SHIFTS,
            )

    async def test_import_csv_empty_data(self, api, fake_store) -> None:
        """Importing empty CSV should return zero counts."""
        result = await api.async_import_csv(
            calendar_id="work_shifts",
            csv_data="",
        )
        assert result.created == 0
        assert result.errors == 0

    async def test_import_csv_records_audit(self, api, fake_store) -> None:
        """Each imported shift should generate an audit entry."""
        fake_store.audit_log.clear()
        await api.async_import_csv(
            calendar_id="work_shifts",
            csv_data=SAMPLE_CSV_SHIFTS,
            user_id="user_abc",
        )

        # Each shift generates one audit entry via upsert_shift.
        create_entries = [
            e for e in fake_store.audit_log
            if e.get("action") and e["action"].value == "create"
        ]
        assert len(create_entries) == 3


class TestImportICSFlow:
    async def test_import_ics_creates_events(self, api, fake_store) -> None:
        """Importing ICS should create events in the store."""
        result = await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS,
        )

        assert result.created == 2
        assert result.errors == 0

        active = fake_store.get_active_events(calendar_id="work_shifts")
        assert len(active) == 2

    async def test_import_ics_idempotent(self, api, fake_store) -> None:
        """Importing the same ICS twice should skip on the second run."""
        result1 = await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS,
        )
        assert result1.created == 2

        result2 = await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS,
        )
        assert result2.created == 0
        assert result2.skipped == 2

        active = fake_store.get_active_events(calendar_id="work_shifts")
        assert len(active) == 2

    async def test_import_ics_uses_uid_as_external_id(self, api, fake_store) -> None:
        """ICS UID should be used as the external_id on the event."""
        await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS,
        )

        event = fake_store.find_event_by_source("ics", "shift-001@roster_app")
        assert event is not None
        assert event.title == "Early Shift"

    async def test_import_ics_invalid_calendar_raises(self, api) -> None:
        """Importing to a non-existent calendar should raise."""
        with pytest.raises(Exception, match="not found"):
            await api.async_import_ics(
                calendar_id="nonexistent",
                ics_data=SAMPLE_ICS,
            )

    async def test_import_ics_malformed_no_crash(self, api, fake_store) -> None:
        """Malformed ICS (no VEVENTs) should not crash, just return zeros."""
        result = await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS_MALFORMED,
        )
        assert result.created == 0
        assert result.errors == 0

    async def test_import_ics_custom_source(self, api, fake_store) -> None:
        """Custom source label should be stored on events."""
        await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS,
            source="roster_app_ics",
        )

        active = fake_store.get_active_events(calendar_id="work_shifts")
        for event in active:
            assert event.source == "roster_app_ics"

    async def test_import_update_changed_data(self, api, fake_store) -> None:
        """Re-importing with changed title should count as update."""
        await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=SAMPLE_ICS,
        )

        # Modify the ICS to change the title.
        modified_ics = SAMPLE_ICS.replace("Early Shift", "Early Shift MODIFIED")
        result = await api.async_import_ics(
            calendar_id="work_shifts",
            ics_data=modified_ics,
        )

        # One event changed (Early), one unchanged (Late).
        assert result.updated == 1
        assert result.skipped == 1

        event = fake_store.find_event_by_source("ics", "shift-001@roster_app")
        assert event is not None
        assert event.title == "Early Shift MODIFIED"
