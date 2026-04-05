"""Recurrence rule parsing and next-due-date calculation for recurring tasks."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum


class RecurrenceType(StrEnum):
    """Supported recurrence patterns."""

    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    WEEKDAYS = "weekdays"
    EVERY_N_DAYS = "every_n_days"


@dataclass(frozen=True)
class RecurrencePattern:
    """Parsed representation of a recurrence rule."""

    type: RecurrenceType
    interval_days: int | None = None  # only set for EVERY_N_DAYS


# Pre-compiled regex for "every_N_days:7" style rules.
_EVERY_N_RE = re.compile(r"^every_(\d+|n)_days:?(\d+)?$")


def parse_recurrence(rule: str) -> RecurrencePattern:
    """Parse a human-readable recurrence rule string into a RecurrencePattern.

    Supported formats:
        "daily"
        "weekly"
        "biweekly"
        "monthly"
        "weekdays"
        "every_N_days:7"   (N is ignored, the number after ':' is the interval)
        "every_7_days"     (the number embedded in the name is the interval)

    Raises ValueError for unrecognised rules.
    """
    normalised = rule.strip().lower()

    if normalised == "daily":
        return RecurrencePattern(type=RecurrenceType.DAILY)
    if normalised == "weekly":
        return RecurrencePattern(type=RecurrenceType.WEEKLY)
    if normalised == "biweekly":
        return RecurrencePattern(type=RecurrenceType.BIWEEKLY)
    if normalised == "monthly":
        return RecurrencePattern(type=RecurrenceType.MONTHLY)
    if normalised == "weekdays":
        return RecurrencePattern(type=RecurrenceType.WEEKDAYS)

    # "every_N_days:7" or "every_7_days"
    match = _EVERY_N_RE.match(normalised)
    if match:
        # Prefer the value after the colon if present; fall back to embedded number.
        if match.group(2):
            interval = int(match.group(2))
        elif match.group(1).isdigit():
            interval = int(match.group(1))
        else:
            raise ValueError(f"Unrecognised recurrence rule: {rule!r}")
        if interval < 1:
            raise ValueError(f"Interval must be >= 1, got {interval}")
        return RecurrencePattern(type=RecurrenceType.EVERY_N_DAYS, interval_days=interval)

    raise ValueError(f"Unrecognised recurrence rule: {rule!r}")


def next_due_date(current_due: str, pattern: RecurrencePattern) -> str:
    """Calculate the next due date from *current_due* given *pattern*.

    *current_due* is an ISO 8601 date string (``YYYY-MM-DD``) or datetime.
    Returns a date-only ISO string (``YYYY-MM-DD``).
    """
    # Parse — accept both date-only and full datetime strings.
    dt = datetime.fromisoformat(current_due)
    d = dt.date()

    if pattern.type == RecurrenceType.DAILY:
        d += timedelta(days=1)

    elif pattern.type == RecurrenceType.WEEKLY:
        d += timedelta(weeks=1)

    elif pattern.type == RecurrenceType.BIWEEKLY:
        d += timedelta(weeks=2)

    elif pattern.type == RecurrenceType.MONTHLY:
        # Advance by one calendar month, clamping day to month length.
        month = d.month + 1
        year = d.year
        if month > 12:
            month = 1
            year += 1
        # Clamp day to the last valid day of the target month.
        import calendar

        max_day = calendar.monthrange(year, month)[1]
        day = min(d.day, max_day)
        d = d.replace(year=year, month=month, day=day)

    elif pattern.type == RecurrenceType.WEEKDAYS:
        # Next weekday (Mon-Fri).  Advance at least one day.
        d += timedelta(days=1)
        while d.weekday() >= 5:  # 5=Sat, 6=Sun
            d += timedelta(days=1)

    elif pattern.type == RecurrenceType.EVERY_N_DAYS:
        assert pattern.interval_days is not None
        d += timedelta(days=pattern.interval_days)

    return d.isoformat()
