"""SQLAlchemy Core table definitions for the Calee integration.

All table names are prefixed with ``calee_`` to avoid collisions with
other Home Assistant integrations or recorder tables.
"""

from __future__ import annotations

import sqlalchemy as sa

metadata = sa.MetaData()

# ── Calendars ───────────────────────────────────────────────────────────

calendars = sa.Table(
    "calee_calendars",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column("name", sa.String(255), nullable=False),
    sa.Column("color", sa.String(7), default="#64b5f6"),
    sa.Column("timezone", sa.String(64), default=""),
    sa.Column("is_private", sa.Boolean, default=False),
    sa.Column("created_at", sa.String(32), nullable=False),
)

# ── Events ──────────────────────────────────────────────────────────────

events = sa.Table(
    "calee_events",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column(
        "calendar_id",
        sa.String(32),
        sa.ForeignKey("calee_calendars.id"),
        nullable=False,
    ),
    sa.Column("title", sa.Text, default=""),
    sa.Column("start", sa.DateTime(timezone=True)),
    sa.Column("end", sa.DateTime(timezone=True)),
    sa.Column("all_day", sa.Boolean, default=False),
    sa.Column("note", sa.Text, default=""),
    sa.Column("template_id", sa.String(32), nullable=True),
    sa.Column("source", sa.String(32), default="manual"),
    sa.Column("external_id", sa.String(255), nullable=True),
    sa.Column("recurrence_rule", sa.Text, nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("version", sa.Integer, default=1),
    sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    sa.Index("ix_calee_events_calendar", "calendar_id"),
    sa.Index("ix_calee_events_source", "source", "external_id"),
    sa.Index("ix_calee_events_deleted", "deleted_at"),
    sa.UniqueConstraint("source", "external_id", name="uq_calee_event_source"),
)

# ── Shift Templates ────────────────────────────────────────────────────

templates = sa.Table(
    "calee_templates",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column("name", sa.String(255), nullable=False, default=""),
    sa.Column("calendar_id", sa.String(32), default=""),
    sa.Column("start_time", sa.String(5), default=""),
    sa.Column("end_time", sa.String(5), default=""),
    sa.Column("color", sa.String(7), default="#64b5f6"),
    sa.Column("note", sa.Text, default=""),
    sa.Column("emoji", sa.String(16), default=""),
)

# ── To-do Lists ─────────────────────────────────────────────────────────

lists = sa.Table(
    "calee_lists",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column("name", sa.String(255), nullable=False, default=""),
    sa.Column("list_type", sa.String(32), default="standard"),
    sa.Column("is_private", sa.Boolean, default=False),
    sa.Column("created_at", sa.String(32), nullable=False),
)

# ── Tasks ───────────────────────────────────────────────────────────────

tasks = sa.Table(
    "calee_tasks",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column(
        "list_id",
        sa.String(32),
        sa.ForeignKey("calee_lists.id"),
        nullable=False,
    ),
    sa.Column("title", sa.Text, default=""),
    sa.Column("note", sa.Text, default=""),
    sa.Column("completed", sa.Boolean, default=False),
    sa.Column("due", sa.DateTime(timezone=True), nullable=True),
    sa.Column("related_event_id", sa.String(32), nullable=True),
    sa.Column("recurrence_rule", sa.Text, nullable=True),
    sa.Column("category", sa.String(64), default=""),
    sa.Column("is_recurring", sa.Boolean, default=False),
    sa.Column("recur_reset_hour", sa.Integer, default=0),
    sa.Column("price", sa.Float, nullable=True),
    sa.Column("position", sa.Integer, default=0),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("version", sa.Integer, default=1),
    sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    sa.Index("ix_calee_tasks_list", "list_id"),
    sa.Index("ix_calee_tasks_deleted", "deleted_at"),
)

# ── Role Assignments ────────────────────────────────────────────────────

roles = sa.Table(
    "calee_roles",
    metadata,
    sa.Column("user_id", sa.String(64), nullable=False),
    sa.Column("resource_type", sa.String(32), nullable=False),
    sa.Column("resource_id", sa.String(32), nullable=False),
    sa.Column("role", sa.String(16), nullable=False),
    sa.UniqueConstraint(
        "user_id", "resource_type", "resource_id", name="uq_calee_role"
    ),
)

# ── Audit Log ───────────────────────────────────────────────────────────

audit_log = sa.Table(
    "calee_audit_log",
    metadata,
    sa.Column("id", sa.String(32), primary_key=True),
    sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    sa.Column("user_id", sa.String(64), default=""),
    sa.Column("action", sa.String(32), nullable=False),
    sa.Column("resource_type", sa.String(32), default=""),
    sa.Column("resource_id", sa.String(32), default=""),
    sa.Column("detail", sa.Text, default=""),
    sa.Index("ix_calee_audit_log_timestamp", "timestamp"),
)
