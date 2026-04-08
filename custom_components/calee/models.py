"""Data models for the Calee integration."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from .const import AuditAction, PlannerRole


def _new_id() -> str:
    """Generate a full 32-char hex UUID4."""
    return uuid.uuid4().hex


def _utc_now_iso() -> str:
    """Return current UTC time as an ISO 8601 string."""
    return datetime.now(UTC).isoformat()


# ── Calendar & Event ─────────────────────────────────────────────────


@dataclass
class PlannerCalendar:
    """A planner calendar (shifts, family events, etc.)."""

    id: str = field(default_factory=_new_id)
    name: str = ""
    color: str = "#64b5f6"
    emoji: str = ""
    timezone: str = ""  # IANA timezone, defaults to HA configured tz
    is_private: bool = False  # If True, only users with explicit roles can see/edit
    created_at: str = field(default_factory=_utc_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "emoji": self.emoji,
            "timezone": self.timezone,
            "is_private": self.is_private,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PlannerCalendar:
        return cls(
            id=data["id"],
            name=data["name"],
            color=data.get("color", "#64b5f6"),
            emoji=data.get("emoji", ""),
            timezone=data.get("timezone", ""),
            is_private=data.get("is_private", False),
            created_at=data.get("created_at", ""),
        )


@dataclass
class PlannerEvent:
    """A calendar event (shift, appointment, etc.)."""

    id: str = field(default_factory=_new_id)
    calendar_id: str = ""
    title: str = ""
    start: str = ""  # ISO 8601
    end: str = ""  # ISO 8601
    all_day: bool = False
    note: str = ""
    template_id: str | None = None
    source: str = "manual"  # manual | import | automation
    external_id: str | None = None  # for idempotent imports
    recurrence_rule: str | None = None  # RFC 5545 RRULE — stubbed for future
    exceptions: list[str] = field(default_factory=list)  # ISO date strings where recurrence is skipped
    created_at: str = field(default_factory=_utc_now_iso)
    updated_at: str = field(default_factory=_utc_now_iso)
    version: int = 1  # optimistic locking — callers must pass expected version on update
    deleted_at: str | None = None  # soft delete — ISO 8601 timestamp or None
    snooze_until: str | None = None  # ISO 8601 datetime — reminder suppressed until this time

    @property
    def is_overnight(self) -> bool:
        """Return True if the event spans midnight."""
        if not self.start or not self.end:
            return False
        try:
            s = datetime.fromisoformat(self.start)
            e = datetime.fromisoformat(self.end)
            return s.date() != e.date()
        except (ValueError, TypeError):
            return False

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "calendar_id": self.calendar_id,
            "title": self.title,
            "start": self.start,
            "end": self.end,
            "all_day": self.all_day,
            "note": self.note,
            "template_id": self.template_id,
            "source": self.source,
            "external_id": self.external_id,
            "recurrence_rule": self.recurrence_rule,
            "exceptions": self.exceptions,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "version": self.version,
            "deleted_at": self.deleted_at,
            "snooze_until": self.snooze_until,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PlannerEvent:
        return cls(
            id=data["id"],
            calendar_id=data["calendar_id"],
            title=data.get("title", ""),
            start=data.get("start", ""),
            end=data.get("end", ""),
            all_day=data.get("all_day", False),
            note=data.get("note", ""),
            template_id=data.get("template_id"),
            source=data.get("source", "manual"),
            external_id=data.get("external_id"),
            recurrence_rule=data.get("recurrence_rule"),
            exceptions=data.get("exceptions", []),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            version=data.get("version", 1),
            deleted_at=data.get("deleted_at"),
            snooze_until=data.get("snooze_until"),
        )


# ── Shift Templates ─────────────────────────────────────────────────


@dataclass
class ShiftTemplate:
    """A reusable shift definition for quick-add."""

    id: str = field(default_factory=_new_id)
    name: str = ""
    calendar_id: str = ""
    start_time: str = ""  # HH:MM
    end_time: str = ""  # HH:MM (may be next day if end < start)
    color: str = "#64b5f6"
    note: str = ""
    emoji: str = ""

    @property
    def is_overnight(self) -> bool:
        return bool(self.start_time and self.end_time and self.end_time < self.start_time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "calendar_id": self.calendar_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "color": self.color,
            "note": self.note,
            "emoji": self.emoji,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ShiftTemplate:
        return cls(
            id=data["id"],
            name=data["name"],
            calendar_id=data.get("calendar_id", ""),
            start_time=data.get("start_time", ""),
            end_time=data.get("end_time", ""),
            color=data.get("color", "#64b5f6"),
            note=data.get("note", ""),
            emoji=data.get("emoji", ""),
        )


# ── Tasks / To-do ───────────────────────────────────────────────────


@dataclass
class PlannerTask:
    """A to-do item within a list."""

    id: str = field(default_factory=_new_id)
    list_id: str = ""
    title: str = ""
    note: str = ""
    completed: bool = False
    due: str | None = None  # ISO 8601 date or datetime
    related_event_id: str | None = None  # optional link to a calendar event
    recurrence_rule: str | None = None
    category: str = ""  # grouping category (e.g. "food", "household")
    is_recurring: bool = False  # "always item" — auto-resets when completed
    recur_reset_hour: int = 0  # hour of day (0-23) to auto-uncomplete
    quantity: float = 1.0  # number of units (e.g. 2x Milk)
    unit: str = ""  # e.g. "L", "kg", "pcs", "pack"
    price: float | None = None  # optional price for shopping items
    position: int = 0  # sort order within the list
    created_at: str = field(default_factory=_utc_now_iso)
    updated_at: str = field(default_factory=_utc_now_iso)
    version: int = 1  # optimistic locking
    deleted_at: str | None = None  # soft delete

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "list_id": self.list_id,
            "title": self.title,
            "note": self.note,
            "completed": self.completed,
            "due": self.due,
            "related_event_id": self.related_event_id,
            "recurrence_rule": self.recurrence_rule,
            "category": self.category,
            "is_recurring": self.is_recurring,
            "recur_reset_hour": self.recur_reset_hour,
            "quantity": self.quantity,
            "unit": self.unit,
            "price": self.price,
            "position": self.position,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "version": self.version,
            "deleted_at": self.deleted_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PlannerTask:
        return cls(
            id=data["id"],
            list_id=data["list_id"],
            title=data.get("title", ""),
            note=data.get("note", ""),
            completed=data.get("completed", False),
            due=data.get("due"),
            related_event_id=data.get("related_event_id"),
            recurrence_rule=data.get("recurrence_rule"),
            category=data.get("category", ""),
            is_recurring=data.get("is_recurring", False),
            recur_reset_hour=data.get("recur_reset_hour", 0),
            quantity=data.get("quantity", 1.0),
            unit=data.get("unit", ""),
            price=data.get("price"),
            position=data.get("position", 0),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            version=data.get("version", 1),
            deleted_at=data.get("deleted_at"),
        )


@dataclass
class PlannerList:
    """A to-do list (Inbox, Shopping, or user-created)."""

    id: str = field(default_factory=_new_id)
    name: str = ""
    list_type: str = "standard"  # standard | shopping
    is_private: bool = False  # If True, only users with explicit roles can see/edit
    created_at: str = field(default_factory=_utc_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "list_type": self.list_type,
            "is_private": self.is_private,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PlannerList:
        return cls(
            id=data["id"],
            name=data["name"],
            list_type=data.get("list_type", "standard"),
            is_private=data.get("is_private", False),
            created_at=data.get("created_at", ""),
        )


# ── Task Presets ────────────────────────────────────────────────────


@dataclass
class TaskPreset:
    """A quick-add preset for one-tap task creation."""

    id: str = field(default_factory=_new_id)
    title: str = ""
    list_id: str = ""  # which list this preset adds to
    note: str = ""
    category: str = ""  # e.g. "groceries", "household", "errand"
    icon: str = ""  # mdi icon name

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "list_id": self.list_id,
            "note": self.note,
            "category": self.category,
            "icon": self.icon,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TaskPreset:
        return cls(
            id=data["id"],
            title=data.get("title", ""),
            list_id=data.get("list_id", ""),
            note=data.get("note", ""),
            category=data.get("category", ""),
            icon=data.get("icon", ""),
        )


# ── Permissions ──────────────────────────────────────────────────────


@dataclass
class RoleAssignment:
    """Maps a Home Assistant user to a role on a specific resource."""

    user_id: str = ""
    resource_type: str = ""  # calendar | list
    resource_id: str = ""
    role: PlannerRole = PlannerRole.VIEWER

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "role": self.role.value,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RoleAssignment:
        return cls(
            user_id=data["user_id"],
            resource_type=data["resource_type"],
            resource_id=data["resource_id"],
            role=PlannerRole(data["role"]),
        )


# ── Audit Log ────────────────────────────────────────────────────────


@dataclass
class AuditEntry:
    """Immutable record of a write action in the planner."""

    id: str = field(default_factory=_new_id)
    timestamp: str = field(default_factory=_utc_now_iso)
    user_id: str = ""
    action: AuditAction = AuditAction.CREATE
    resource_type: str = ""  # event | task | calendar | list
    resource_id: str = ""
    detail: str = ""  # human-readable summary, redacted in diagnostics

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "action": self.action.value,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "detail": self.detail,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AuditEntry:
        return cls(
            id=data["id"],
            timestamp=data.get("timestamp", ""),
            user_id=data.get("user_id", ""),
            action=AuditAction(data["action"]),
            resource_type=data.get("resource_type", ""),
            resource_id=data.get("resource_id", ""),
            detail=data.get("detail", ""),
        )


# ── Routines / Bundles ──────────────────────────────────────────────


@dataclass
class Routine:
    """A one-tap action that creates multiple items at once.

    A routine can optionally create a shift from a template, add to-do
    tasks, and add shopping items --- all in a single action.
    """

    id: str = field(default_factory=_new_id)
    name: str = ""
    emoji: str = ""
    description: str = ""
    # What this routine creates:
    shift_template_id: str | None = None  # optional: create a shift from this template
    tasks: list[dict] = field(default_factory=list)
    # [{"title": "Pack lunch", "list_id": "inbox", "due_offset_days": 0}]
    shopping_items: list[dict] = field(default_factory=list)
    # [{"title": "Energy bars", "category": "food", "quantity": 2}]
    created_at: str = field(default_factory=_utc_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "emoji": self.emoji,
            "description": self.description,
            "shift_template_id": self.shift_template_id,
            "tasks": self.tasks,
            "shopping_items": self.shopping_items,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Routine:
        return cls(
            id=data["id"],
            name=data.get("name", ""),
            emoji=data.get("emoji", ""),
            description=data.get("description", ""),
            shift_template_id=data.get("shift_template_id"),
            tasks=data.get("tasks", []),
            shopping_items=data.get("shopping_items", []),
            created_at=data.get("created_at") or _utc_now_iso(),
        )


# ── Notification Rules ────────────────────────────────────────────────


@dataclass
class NotificationRule:
    """A notification rule that can be attached to a calendar, template, or event.

    Rules cascade: event overrides template overrides calendar overrides global.
    The ``scope`` field determines the level:
      - "calendar" → applies to all events in ``scope_id`` calendar
      - "template" → applies to all events created from ``scope_id`` template
      - "event"    → applies to a single event with id ``scope_id``
    """

    id: str = field(default_factory=_new_id)
    scope: str = "calendar"  # calendar | template | event
    scope_id: str = ""  # calendar_id, template_id, or event_id
    enabled: bool = True
    reminder_minutes: int = 60  # minutes before start
    notify_services: list[str] = field(default_factory=list)
    # e.g. ["notify.mobile_app_brendon", "notify.mobile_app_partner"]
    # empty list = use the integration/global notification defaults
    include_actions: bool = True  # include Open/Snooze buttons in notification
    custom_title: str = ""  # override notification title; empty = default
    custom_message: str = ""  # override message; empty = default
    created_at: str = field(default_factory=_utc_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "scope": self.scope,
            "scope_id": self.scope_id,
            "enabled": self.enabled,
            "reminder_minutes": self.reminder_minutes,
            "notify_services": self.notify_services,
            "include_actions": self.include_actions,
            "custom_title": self.custom_title,
            "custom_message": self.custom_message,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> NotificationRule:
        return cls(
            id=data["id"],
            scope=data.get("scope", "calendar"),
            scope_id=data.get("scope_id", ""),
            enabled=data.get("enabled", True),
            reminder_minutes=data.get("reminder_minutes", 60),
            notify_services=data.get("notify_services", []),
            include_actions=data.get("include_actions", True),
            custom_title=data.get("custom_title", ""),
            custom_message=data.get("custom_message", ""),
            created_at=data.get("created_at") or _utc_now_iso(),
        )
