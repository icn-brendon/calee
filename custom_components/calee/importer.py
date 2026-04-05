"""Roster import engine for CSV and ICS files.

Parses shift data from CSV exports and ICS calendar
files, returning normalised shift dicts ready for ``PlannerAPI.async_upsert_shift``.

Only Python stdlib modules are used — no external dependencies.
"""

from __future__ import annotations

import csv
import hashlib
import io
import logging
import re
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

_LOGGER = logging.getLogger(__name__)

# ── Import result ───────────────────────────────────────────────────────


@dataclass
class ImportResult:
    """Counts returned after an import operation."""

    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: int = 0
    error_details: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "created": self.created,
            "updated": self.updated,
            "skipped": self.skipped,
            "errors": self.errors,
            "error_details": self.error_details,
        }


# ── CSV parser ──────────────────────────────────────────────────────────

# Normalised header aliases — maps various column names to our internal keys.
_CSV_ALIASES: dict[str, str] = {
    # date
    "date": "date",
    "shift_date": "date",
    "day": "date",
    # start
    "start": "start",
    "start_time": "start",
    "start_datetime": "start_datetime",
    "begin": "start",
    # end
    "end": "end",
    "end_time": "end",
    "end_datetime": "end_datetime",
    "finish": "end",
    # title
    "title": "title",
    "name": "title",
    "shift": "title",
    "shift_name": "title",
    "summary": "title",
    # note
    "note": "note",
    "notes": "note",
    "description": "note",
    "comment": "note",
    # category
    "category": "category",
    "type": "category",
}


def _normalise_header(header: str) -> str:
    """Lower-case, strip whitespace, replace spaces/hyphens with underscores."""
    return re.sub(r"[\s\-]+", "_", header.strip().lower())


def _detect_columns(headers: list[str]) -> dict[str, str]:
    """Map raw CSV headers to internal field names using aliases.

    Returns a dict of ``{raw_header: internal_name}``.
    """
    mapping: dict[str, str] = {}
    for raw in headers:
        key = _normalise_header(raw)
        if key in _CSV_ALIASES:
            mapping[raw] = _CSV_ALIASES[key]
    return mapping


def _make_csv_external_id(date_str: str, start: str, end: str, title: str) -> str:
    """Generate a deterministic external_id from shift fields."""
    payload = f"{date_str}|{start}|{end}|{title}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def _parse_time(time_str: str) -> str:
    """Parse a time string like '06:00' or '6:00' into 'HH:MM'."""
    time_str = time_str.strip()
    parts = time_str.split(":")
    if len(parts) >= 2:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    return time_str


def parse_csv(csv_data: str) -> list[dict[str, str]]:
    """Parse CSV text into a list of shift dicts.

    Each returned dict has keys: ``title``, ``start``, ``end``, ``note``,
    ``external_id``.  Start/end are ISO 8601 datetime strings.

    Supports:
    - ``date,start_time,end_time,title`` format
    - ``start_datetime,end_datetime,title`` format (ISO 8601)
    - common shift app: ``Date,Start,End,Name,Note``
    """
    reader = csv.DictReader(io.StringIO(csv_data.strip()))
    if reader.fieldnames is None:
        return []

    col_map = _detect_columns(list(reader.fieldnames))

    # Build a reverse lookup: internal_name -> raw_header
    reverse: dict[str, str] = {}
    for raw, internal in col_map.items():
        reverse.setdefault(internal, raw)

    results: list[dict[str, str]] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 is header
        try:
            title = row.get(reverse.get("title", ""), "").strip()
            note = row.get(reverse.get("note", ""), "").strip()

            # --- Format A: separate date + start_time + end_time ---
            if "date" in reverse and "start" in reverse and "end" in reverse:
                date_str = row[reverse["date"]].strip()
                start_time = _parse_time(row[reverse["start"]])
                end_time = _parse_time(row[reverse["end"]])

                # Parse date
                parsed_date = date.fromisoformat(date_str)

                # Build start datetime
                start_dt = datetime.combine(
                    parsed_date,
                    datetime.strptime(start_time, "%H:%M").time(),
                )

                # Build end datetime — handle overnight shifts
                end_t = datetime.strptime(end_time, "%H:%M").time()
                end_date = parsed_date + timedelta(days=1) if end_time <= start_time else parsed_date
                end_dt = datetime.combine(end_date, end_t)

                external_id = _make_csv_external_id(
                    date_str, start_time, end_time, title
                )

                results.append(
                    {
                        "title": title,
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "note": note,
                        "external_id": external_id,
                    }
                )

            # --- Format B: start_datetime + end_datetime (full ISO 8601) ---
            elif "start_datetime" in reverse and "end_datetime" in reverse:
                start_raw = row[reverse["start_datetime"]].strip()
                end_raw = row[reverse["end_datetime"]].strip()

                start_dt = datetime.fromisoformat(start_raw)
                end_dt = datetime.fromisoformat(end_raw)

                external_id = _make_csv_external_id(
                    start_dt.date().isoformat(),
                    start_dt.time().isoformat(),
                    end_dt.time().isoformat(),
                    title,
                )

                results.append(
                    {
                        "title": title,
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "note": note,
                        "external_id": external_id,
                    }
                )

            # --- Format C: just start + end as full datetimes (no date col) ---
            elif "start" in reverse and "end" in reverse and "date" not in reverse:
                start_raw = row[reverse["start"]].strip()
                end_raw = row[reverse["end"]].strip()

                start_dt = datetime.fromisoformat(start_raw)
                end_dt = datetime.fromisoformat(end_raw)

                external_id = _make_csv_external_id(
                    start_dt.date().isoformat(),
                    start_dt.time().isoformat(),
                    end_dt.time().isoformat(),
                    title,
                )

                results.append(
                    {
                        "title": title,
                        "start": start_dt.isoformat(),
                        "end": end_dt.isoformat(),
                        "note": note,
                        "external_id": external_id,
                    }
                )

            else:
                _LOGGER.warning(
                    "CSV row %d: unable to determine date/time columns", row_num
                )

        except (ValueError, KeyError, TypeError) as exc:
            _LOGGER.warning("CSV row %d: parse error: %s", row_num, exc)
            continue

    return results


# ── ICS parser ──────────────────────────────────────────────────────────

# Regex patterns for ICS property extraction.
_ICS_UNFOLD = re.compile(r"\r?\n[ \t]")  # RFC 5545 line unfolding


def _unfold_ics(text: str) -> str:
    """Unfold long lines per RFC 5545 section 3.1."""
    return _ICS_UNFOLD.sub("", text)


def _extract_ics_property(lines: list[str], name: str) -> str | None:
    """Extract the value of a named ICS property from a list of content lines."""
    prefix = name.upper()
    for line in lines:
        # Property may have parameters: DTSTART;TZID=...:value
        if line.startswith(prefix + ":") or line.startswith(prefix + ";"):
            # Value is everything after the first ':'
            idx = line.index(":")
            return line[idx + 1 :].strip()
    return None


def _parse_ics_datetime(value: str) -> datetime:
    """Parse an ICS datetime value into a Python datetime.

    Handles:
    - ``20260407T060000Z`` (UTC)
    - ``20260407T060000`` (local / naive)
    - ``20260407`` (all-day date)
    """
    value = value.strip()

    # Full datetime with UTC suffix
    if value.endswith("Z"):
        value = value[:-1]
        if len(value) == 15:  # YYYYMMDDTHHMMSS
            return datetime.strptime(value, "%Y%m%dT%H%M%S").replace(
                tzinfo=UTC
            )

    # Full datetime without Z
    if "T" in value and len(value) >= 15:
        return datetime.strptime(value[:15], "%Y%m%dT%H%M%S")

    # Date only
    if len(value) == 8:
        return datetime.strptime(value, "%Y%m%d")

    raise ValueError(f"Cannot parse ICS datetime: {value!r}")


def parse_ics(ics_data: str) -> list[dict[str, str]]:
    """Parse an ICS (iCalendar) string into a list of shift dicts.

    Each returned dict has keys: ``title``, ``start``, ``end``, ``note``,
    ``external_id``.  Start/end are ISO 8601 datetime strings.

    Uses the VEVENT UID as ``external_id`` for idempotent imports.
    """
    unfolded = _unfold_ics(ics_data)
    results: list[dict[str, str]] = []

    # Split into VEVENT blocks.
    parts = re.split(r"BEGIN:VEVENT\b", unfolded)

    for block in parts[1:]:  # skip everything before first VEVENT
        end_idx = block.find("END:VEVENT")
        if end_idx == -1:
            continue
        event_text = block[:end_idx]
        lines = [ln.strip() for ln in event_text.splitlines() if ln.strip()]

        try:
            dtstart_raw = _extract_ics_property(lines, "DTSTART")
            dtend_raw = _extract_ics_property(lines, "DTEND")
            summary = _extract_ics_property(lines, "SUMMARY") or ""
            description = _extract_ics_property(lines, "DESCRIPTION") or ""
            uid = _extract_ics_property(lines, "UID") or ""

            if not dtstart_raw:
                _LOGGER.warning("ICS VEVENT missing DTSTART, skipping")
                continue

            start_dt = _parse_ics_datetime(dtstart_raw)

            end_dt = _parse_ics_datetime(dtend_raw) if dtend_raw else start_dt + timedelta(hours=1)

            # Use UID as external_id; fall back to hash if empty.
            if uid:
                external_id = uid
            else:
                external_id = _make_csv_external_id(
                    start_dt.date().isoformat(),
                    start_dt.time().isoformat(),
                    end_dt.time().isoformat(),
                    summary,
                )

            results.append(
                {
                    "title": summary,
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat(),
                    "note": description,
                    "external_id": external_id,
                }
            )

        except (ValueError, TypeError) as exc:
            _LOGGER.warning("ICS VEVENT parse error: %s", exc)
            continue

    return results
