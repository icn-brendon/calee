"""SQLAlchemy-based async store for the Calee integration.

Implements a **write-through cache**: every write updates both an
in-memory dict *and* the database immediately.  Synchronous reads
(required by ``@callback``-decorated WebSocket handlers) are served
entirely from the in-memory cache.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta

import sqlalchemy as sa
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from ..const import (
    DEFAULT_CALENDARS,
    DEFAULT_LISTS,
    DEFAULT_ROUTINES,
    DEFAULT_TEMPLATES,
    SOFT_DELETE_RETENTION_DAYS,
    AuditAction,
)
from ..models import (
    AuditEntry,
    PlannerCalendar,
    PlannerEvent,
    PlannerList,
    PlannerTask,
    RoleAssignment,
    Routine,
    ShiftTemplate,
)
from .base import AbstractPlannerStore
from .schema import (
    audit_log as audit_log_table,
)
from .schema import (
    calendars as calendars_table,
)
from .schema import (
    events as events_table,
)
from .schema import (
    lists as lists_table,
)
from .schema import (
    metadata,
)
from .schema import (
    roles as roles_table,
)
from .schema import (
    routines as routines_table,
)
from .schema import (
    tasks as tasks_table,
)
from .schema import (
    templates as templates_table,
)

_LOGGER = logging.getLogger(__name__)

# Maximum audit entries kept in memory.
_MAX_AUDIT_ENTRIES = 500

# Maximum age (in days) for audit entries before they are pruned.
_MAX_AUDIT_AGE_DAYS = 90

# Maximum audit rows retained in the database regardless of age.
_MAX_AUDIT_ROWS = 10_000

# ── ISO string <-> native datetime helpers ─────────────────────────────
# The model layer uses ISO 8601 strings throughout; the SQL layer now
# stores native ``DateTime(timezone=True)`` columns.  These two helpers
# bridge the gap in the read/write paths.


def _iso_to_dt(iso_str: str | None) -> datetime | None:
    """Convert an ISO 8601 string to a timezone-aware datetime, or None."""
    if not iso_str:
        return None
    dt = datetime.fromisoformat(iso_str)
    # Ensure timezone-aware; treat naive strings as UTC.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


def _dt_to_iso(dt_val: datetime | None) -> str | None:
    """Convert a native datetime to an ISO 8601 string, or None."""
    if dt_val is None:
        return None
    return dt_val.isoformat()


def _parse_json_list(raw: str | None) -> list[dict]:
    """Parse a JSON text column into a list of dicts, with a safe fallback."""
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


class SqlPlannerStore(AbstractPlannerStore):
    """Write-through cached store backed by MariaDB or PostgreSQL."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._engine: sa.ext.asyncio.AsyncEngine | None = None
        self._session_factory: sessionmaker | None = None

        # In-memory cache — mirrors DB state.
        self.calendars: dict[str, PlannerCalendar] = {}
        self.events: dict[str, PlannerEvent] = {}
        self.templates: dict[str, ShiftTemplate] = {}
        self.lists: dict[str, PlannerList] = {}
        self.tasks: dict[str, PlannerTask] = {}
        self.routines: dict[str, Routine] = {}
        self.roles: list[RoleAssignment] = []
        self.audit_log: list[AuditEntry] = []

    # ── Lifecycle ───────────────────────────────────────────────────────

    async def async_load(self) -> None:
        """Create the engine, ensure tables exist, and load data into memory."""
        self._engine = create_async_engine(
            self._url,
            pool_size=5,
            max_overflow=2,
        )
        self._session_factory = sessionmaker(
            self._engine, class_=AsyncSession, expire_on_commit=False
        )

        # Create tables if they don't exist.
        async with self._engine.begin() as conn:
            await conn.run_sync(metadata.create_all)

        # Ensure new columns exist on tables that may predate the latest schema.
        await self._ensure_new_columns()

        # Load all rows into the in-memory cache.
        await self._load_all_from_db()

        # Prune expired soft-deletes and old audit entries on startup.
        await self.async_prune()

        # Seed defaults if tables are empty (first run).
        if not self.calendars:
            _LOGGER.info("SQL store first run — seeding default calendars, lists, and templates")
            await self._seed_defaults()

        # Seed default routines for existing installs that upgraded.
        if not self.routines:
            _LOGGER.info("No routines found — seeding defaults")
            await self._seed_default_routines()

    async def async_save(self) -> None:
        """No-op: all writes are persisted immediately in the write-through model."""

    async def async_close(self) -> None:
        """Dispose the async engine and release connection pool resources."""
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None

    # ── Schema migration helpers ─────────────────────────────────────────

    async def _ensure_new_columns(self) -> None:
        """Add columns that may be missing on databases created before the latest schema.

        Each ALTER TABLE is wrapped in try/except so that columns that
        already exist are silently skipped.
        """
        _new_columns: list[tuple[str, str, str]] = [
            # (table_name, column_name, column_sql_type_with_default)
            ("calee_tasks", "category", "VARCHAR(64) DEFAULT ''"),
            ("calee_tasks", "is_recurring", "BOOLEAN DEFAULT FALSE"),
            ("calee_tasks", "recur_reset_hour", "INTEGER DEFAULT 0"),
            ("calee_tasks", "quantity", "FLOAT DEFAULT 1.0"),
            ("calee_tasks", "unit", "VARCHAR(16) DEFAULT ''"),
            ("calee_tasks", "price", "FLOAT"),
            ("calee_tasks", "position", "INTEGER DEFAULT 0"),
        ]

        async with self._engine.begin() as conn:
            for table_name, col_name, col_type in _new_columns:
                try:
                    await conn.execute(
                        sa.text(
                            f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                        )
                    )
                    _LOGGER.info(
                        "Added missing column %s.%s", table_name, col_name
                    )
                except Exception:
                    # Column already exists — expected on up-to-date installs.
                    pass

    # ── Pruning ────────────────────────────────────────────────────────

    async def async_prune(self) -> None:
        """Prune expired soft-deleted items and old audit entries."""
        await self._prune_expired_soft_deletes()
        await self._prune_old_audit_entries()

    async def _prune_expired_soft_deletes(self) -> None:
        """Delete events/tasks where deleted_at is older than the retention window."""
        cutoff = datetime.now(UTC) - timedelta(days=SOFT_DELETE_RETENTION_DAYS)

        pruned_events = 0
        pruned_tasks = 0

        async with self._session_factory() as session, session.begin():
            # Delete expired soft-deleted events from DB.
            result = await session.execute(
                events_table.delete().where(
                    events_table.c.deleted_at.isnot(None),
                    events_table.c.deleted_at < cutoff,
                )
            )
            pruned_events = result.rowcount

            # Delete expired soft-deleted tasks from DB.
            result = await session.execute(
                tasks_table.delete().where(
                    tasks_table.c.deleted_at.isnot(None),
                    tasks_table.c.deleted_at < cutoff,
                )
            )
            pruned_tasks = result.rowcount

        # Remove from in-memory cache.
        cutoff_iso = cutoff.isoformat()
        expired_event_ids = [
            eid
            for eid, e in self.events.items()
            if e.deleted_at is not None and e.deleted_at < cutoff_iso
        ]
        for eid in expired_event_ids:
            del self.events[eid]

        expired_task_ids = [
            tid
            for tid, t in self.tasks.items()
            if t.deleted_at is not None and t.deleted_at < cutoff_iso
        ]
        for tid in expired_task_ids:
            del self.tasks[tid]

        if pruned_events or pruned_tasks:
            _LOGGER.debug(
                "Pruned %d expired events and %d expired tasks from SQL store",
                pruned_events,
                pruned_tasks,
            )

    async def _prune_old_audit_entries(self) -> None:
        """Delete audit entries older than _MAX_AUDIT_AGE_DAYS and cap total rows."""
        cutoff = datetime.now(UTC) - timedelta(days=_MAX_AUDIT_AGE_DAYS)
        pruned = 0

        async with self._session_factory() as session, session.begin():
            # Delete entries older than the age limit.
            result = await session.execute(
                audit_log_table.delete().where(
                    audit_log_table.c.timestamp < cutoff,
                )
            )
            pruned = result.rowcount

            # Cap at _MAX_AUDIT_ROWS by deleting the oldest excess rows.
            count_result = await session.execute(
                sa.select(sa.func.count()).select_from(audit_log_table)
            )
            total = count_result.scalar() or 0

            if total > _MAX_AUDIT_ROWS:
                excess = total - _MAX_AUDIT_ROWS
                # Find the timestamp of the Nth oldest row to use as cutoff.
                oldest = await session.execute(
                    sa.select(audit_log_table.c.id)
                    .order_by(audit_log_table.c.timestamp.asc())
                    .limit(excess)
                )
                excess_ids = [row.id for row in oldest]
                if excess_ids:
                    await session.execute(
                        audit_log_table.delete().where(
                            audit_log_table.c.id.in_(excess_ids)
                        )
                    )
                    pruned += len(excess_ids)

        # Prune in-memory cache by age.
        cutoff_iso = cutoff.isoformat()
        self.audit_log = [
            entry
            for entry in self.audit_log
            if entry.timestamp >= cutoff_iso
        ]
        # Also cap in-memory to _MAX_AUDIT_ENTRIES.
        if len(self.audit_log) > _MAX_AUDIT_ENTRIES:
            self.audit_log = self.audit_log[-_MAX_AUDIT_ENTRIES:]

        if pruned:
            _LOGGER.debug("Pruned %d old audit entries from SQL store", pruned)

    # ── Calendars ───────────────────────────────────────────────────────

    def get_calendars(self) -> dict[str, PlannerCalendar]:
        return dict(self.calendars)

    def get_calendar(self, calendar_id: str) -> PlannerCalendar | None:
        return self.calendars.get(calendar_id)

    async def async_put_calendar(self, calendar: PlannerCalendar) -> None:
        self.calendars[calendar.id] = calendar
        await self._upsert(calendars_table, calendar.to_dict())

    async def async_put_list(self, planner_list: PlannerList) -> None:
        self.lists[planner_list.id] = planner_list
        await self._upsert(lists_table, planner_list.to_dict())

    # ── Events ──────────────────────────────────────────────────────────

    def get_event(self, event_id: str) -> PlannerEvent | None:
        return self.events.get(event_id)

    def get_active_events(self, calendar_id: str | None = None) -> list[PlannerEvent]:
        result = [e for e in self.events.values() if e.deleted_at is None]
        if calendar_id:
            result = [e for e in result if e.calendar_id == calendar_id]
        return result

    async def async_put_event(self, event: PlannerEvent) -> None:
        self.events[event.id] = event
        await self._upsert(events_table, _event_to_sql(event))

    async def async_remove_event(self, event_id: str) -> None:
        self.events.pop(event_id, None)
        await self._delete_by_pk(events_table, event_id)

    def find_event_by_source(
        self, source: str, external_id: str
    ) -> PlannerEvent | None:
        for event in self.events.values():
            if event.source == source and event.external_id == external_id:
                return event
        return None

    # ── Soft delete / restore ───────────────────────────────────────────

    def soft_delete_event(self, event_id: str) -> PlannerEvent | None:
        event = self.events.get(event_id)
        if event and event.deleted_at is None:
            event.deleted_at = datetime.now(UTC).isoformat()
            event.version += 1
        return event

    def restore_event(self, event_id: str) -> PlannerEvent | None:
        event = self.events.get(event_id)
        if event and event.deleted_at is not None:
            event.deleted_at = None
            event.version += 1
        return event

    def soft_delete_task(self, task_id: str) -> PlannerTask | None:
        task = self.tasks.get(task_id)
        if task and task.deleted_at is None:
            task.deleted_at = datetime.now(UTC).isoformat()
            task.version += 1
        return task

    def restore_task(self, task_id: str) -> PlannerTask | None:
        task = self.tasks.get(task_id)
        if task and task.deleted_at is not None:
            task.deleted_at = None
            task.version += 1
        return task

    # ── Templates ───────────────────────────────────────────────────────

    def get_templates(self) -> dict[str, ShiftTemplate]:
        return dict(self.templates)

    def get_template(self, template_id: str) -> ShiftTemplate | None:
        return self.templates.get(template_id)

    async def async_put_template(self, template: ShiftTemplate) -> None:
        self.templates[template.id] = template
        await self._upsert(templates_table, template.to_dict())

    async def async_remove_template(self, template_id: str) -> None:
        self.templates.pop(template_id, None)
        await self._delete_by_pk(templates_table, template_id)

    # ── Lists ───────────────────────────────────────────────────────────

    def get_lists(self) -> dict[str, PlannerList]:
        return dict(self.lists)

    def get_list(self, list_id: str) -> PlannerList | None:
        return self.lists.get(list_id)

    # ── Tasks ───────────────────────────────────────────────────────────

    def get_task(self, task_id: str) -> PlannerTask | None:
        return self.tasks.get(task_id)

    def get_active_tasks(self, list_id: str | None = None) -> list[PlannerTask]:
        result = [t for t in self.tasks.values() if t.deleted_at is None]
        if list_id:
            result = [t for t in result if t.list_id == list_id]
        return result

    async def async_put_task(self, task: PlannerTask) -> None:
        self.tasks[task.id] = task
        await self._upsert(tasks_table, _task_to_sql(task))

    # ── Routines ───────────────────────────────────────────────────────

    def get_routines(self) -> dict[str, Routine]:
        return dict(self.routines)

    def get_routine(self, routine_id: str) -> Routine | None:
        return self.routines.get(routine_id)

    async def async_put_routine(self, routine: Routine) -> None:
        self.routines[routine.id] = routine
        await self._upsert(routines_table, _routine_to_sql(routine))

    async def async_remove_routine(self, routine_id: str) -> None:
        self.routines.pop(routine_id, None)
        await self._delete_by_pk(routines_table, routine_id)

    # ── Roles ───────────────────────────────────────────────────────────

    def get_roles(self) -> list[RoleAssignment]:
        return list(self.roles)

    # ── Audit ───────────────────────────────────────────────────────────

    def record_audit(
        self,
        user_id: str,
        action: AuditAction,
        resource_type: str,
        resource_id: str,
        detail: str = "",
    ) -> None:
        entry = AuditEntry(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
        )
        self.audit_log.append(entry)
        if len(self.audit_log) > _MAX_AUDIT_ENTRIES:
            self.audit_log = self.audit_log[-_MAX_AUDIT_ENTRIES:]
        # Persist asynchronously — the caller can await async_save() after
        # if strict durability is needed, but for audit this fire-and-forget
        # insert is acceptable since we also hold the entry in memory.
        # We schedule a background task so the sync caller is not blocked.
        if self._engine is not None:
            import asyncio

            _task = asyncio.ensure_future(self._insert_audit_entry(entry))  # noqa: RUF006

    def get_audit_log(self, limit: int = 500) -> list[AuditEntry]:
        return self.audit_log[-limit:]

    # ── Deleted items ──────────────────────────────────────────────────

    def get_deleted_events(self, limit: int = 50) -> list[PlannerEvent]:
        """Return soft-deleted events, most recently deleted first."""
        deleted = [e for e in self.events.values() if e.deleted_at is not None]
        deleted.sort(key=lambda e: e.deleted_at or "", reverse=True)
        return deleted[:limit]

    def get_deleted_tasks(self, limit: int = 50) -> list[PlannerTask]:
        """Return soft-deleted tasks, most recently deleted first."""
        deleted = [t for t in self.tasks.values() if t.deleted_at is not None]
        deleted.sort(key=lambda t: t.deleted_at or "", reverse=True)
        return deleted[:limit]

    # ── Internal: database operations ───────────────────────────────────

    async def _insert_audit_entry(self, entry: AuditEntry) -> None:
        """Insert a single audit entry into the database."""
        try:
            values = entry.to_dict()
            values["timestamp"] = _iso_to_dt(values["timestamp"])
            async with self._session_factory() as session, session.begin():
                await session.execute(
                    audit_log_table.insert().values(**values)
                )
        except Exception:
            _LOGGER.exception("Failed to persist audit entry %s", entry.id)

    async def _upsert(self, table: sa.Table, values: dict) -> None:
        """Insert or update a row using dialect-aware upsert."""
        async with self._session_factory() as session, session.begin():
            dialect_name = self._engine.dialect.name

            if dialect_name == "postgresql":
                stmt = pg_insert(table).values(**values)
                pk_cols = [c.name for c in table.primary_key.columns]
                update_cols = {
                    c.name: getattr(stmt.excluded, c.name)
                    for c in table.columns
                    if c.name not in pk_cols
                }
                if update_cols:
                    stmt = stmt.on_conflict_do_update(
                        index_elements=pk_cols,
                        set_=update_cols,
                    )
                else:
                    stmt = stmt.on_conflict_do_nothing()
                await session.execute(stmt)

            elif dialect_name in ("mysql", "mariadb"):
                stmt = mysql_insert(table).values(**values)
                pk_cols = [c.name for c in table.primary_key.columns]
                update_cols = {
                    c.name: getattr(stmt.inserted, c.name)
                    for c in table.columns
                    if c.name not in pk_cols
                }
                if update_cols:
                    stmt = stmt.on_duplicate_key_update(**update_cols)
                await session.execute(stmt)

            else:
                # SQLite or generic fallback: delete + insert
                pk_cols = [c for c in table.primary_key.columns]
                pk_values = {c.name: values[c.name] for c in pk_cols}
                where = sa.and_(
                    *(c == pk_values[c.name] for c in pk_cols)
                )
                await session.execute(table.delete().where(where))
                await session.execute(table.insert().values(**values))

    async def _upsert_role(self, values: dict) -> None:
        """Insert or update a role assignment (composite key)."""
        async with self._session_factory() as session, session.begin():
            dialect_name = self._engine.dialect.name

            if dialect_name == "postgresql":
                stmt = pg_insert(roles_table).values(**values)
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_calee_role",
                    set_={"role": stmt.excluded.role},
                )
                await session.execute(stmt)

            elif dialect_name in ("mysql", "mariadb"):
                stmt = mysql_insert(roles_table).values(**values)
                stmt = stmt.on_duplicate_key_update(
                    role=stmt.inserted.role,
                )
                await session.execute(stmt)

            else:
                where = sa.and_(
                    roles_table.c.user_id == values["user_id"],
                    roles_table.c.resource_type == values["resource_type"],
                    roles_table.c.resource_id == values["resource_id"],
                )
                await session.execute(roles_table.delete().where(where))
                await session.execute(
                    roles_table.insert().values(**values)
                )

    async def _delete_by_pk(self, table: sa.Table, pk_value: str) -> None:
        """Delete a single row by its primary key."""
        pk_col = next(iter(table.primary_key.columns))
        async with self._session_factory() as session, session.begin():
            await session.execute(
                table.delete().where(pk_col == pk_value)
            )

    # ── Internal: bulk load from DB into memory ─────────────────────────

    async def _load_all_from_db(self) -> None:
        """Read every table into the in-memory cache."""
        async with self._session_factory() as session:
            # Calendars
            result = await session.execute(sa.select(calendars_table))
            self.calendars = {
                row.id: PlannerCalendar(
                    id=row.id,
                    name=row.name,
                    color=row.color or "#64b5f6",
                    timezone=row.timezone or "",
                    is_private=bool(getattr(row, "is_private", False)),
                    created_at=row.created_at or "",
                )
                for row in result
            }

            # Events — convert native datetime columns to ISO strings.
            result = await session.execute(sa.select(events_table))
            self.events = {
                row.id: PlannerEvent(
                    id=row.id,
                    calendar_id=row.calendar_id,
                    title=row.title or "",
                    start=_dt_to_iso(row.start) or "",
                    end=_dt_to_iso(row.end) or "",
                    all_day=bool(row.all_day),
                    note=row.note or "",
                    template_id=row.template_id,
                    source=row.source or "manual",
                    external_id=row.external_id,
                    recurrence_rule=row.recurrence_rule,
                    created_at=_dt_to_iso(row.created_at) or "",
                    updated_at=_dt_to_iso(row.updated_at) or "",
                    version=row.version or 1,
                    deleted_at=_dt_to_iso(row.deleted_at),
                )
                for row in result
            }

            # Templates
            result = await session.execute(sa.select(templates_table))
            self.templates = {
                row.id: ShiftTemplate(
                    id=row.id,
                    name=row.name or "",
                    calendar_id=row.calendar_id or "",
                    start_time=row.start_time or "",
                    end_time=row.end_time or "",
                    color=row.color or "#64b5f6",
                    note=row.note or "",
                )
                for row in result
            }

            # Lists
            result = await session.execute(sa.select(lists_table))
            self.lists = {
                row.id: PlannerList(
                    id=row.id,
                    name=row.name or "",
                    list_type=row.list_type or "standard",
                    is_private=bool(getattr(row, "is_private", False)),
                    created_at=row.created_at or "",
                )
                for row in result
            }

            # Tasks — convert native datetime columns to ISO strings.
            result = await session.execute(sa.select(tasks_table))
            self.tasks = {
                row.id: PlannerTask(
                    id=row.id,
                    list_id=row.list_id,
                    title=row.title or "",
                    note=row.note or "",
                    completed=bool(row.completed),
                    due=_dt_to_iso(row.due),
                    related_event_id=row.related_event_id,
                    recurrence_rule=row.recurrence_rule,
                    category=getattr(row, "category", "") or "",
                    is_recurring=bool(getattr(row, "is_recurring", False)),
                    recur_reset_hour=getattr(row, "recur_reset_hour", 0) or 0,
                    price=getattr(row, "price", None),
                    position=getattr(row, "position", 0) or 0,
                    created_at=_dt_to_iso(row.created_at) or "",
                    updated_at=_dt_to_iso(row.updated_at) or "",
                    version=row.version or 1,
                    deleted_at=_dt_to_iso(row.deleted_at),
                )
                for row in result
            }

            # Routines
            result = await session.execute(sa.select(routines_table))
            self.routines = {
                row.id: Routine(
                    id=row.id,
                    name=row.name or "",
                    emoji=row.emoji or "",
                    description=row.description or "",
                    shift_template_id=row.shift_template_id,
                    tasks=_parse_json_list(row.tasks),
                    shopping_items=_parse_json_list(row.shopping_items),
                    created_at=row.created_at or "",
                )
                for row in result
            }

            # Roles
            result = await session.execute(sa.select(roles_table))
            self.roles = [
                RoleAssignment(
                    user_id=row.user_id,
                    resource_type=row.resource_type,
                    resource_id=row.resource_id,
                    role=row.role,
                )
                for row in result
            ]

            # Audit log (most recent first, capped) — convert timestamp.
            result = await session.execute(
                sa.select(audit_log_table)
                .order_by(audit_log_table.c.timestamp.asc())
                .limit(_MAX_AUDIT_ENTRIES)
            )
            self.audit_log = [
                AuditEntry(
                    id=row.id,
                    timestamp=_dt_to_iso(row.timestamp) or "",
                    user_id=row.user_id or "",
                    action=AuditAction(row.action),
                    resource_type=row.resource_type or "",
                    resource_id=row.resource_id or "",
                    detail=row.detail or "",
                )
                for row in result
            ]

        _LOGGER.debug(
            "Loaded from DB: %d calendars, %d events, %d templates, "
            "%d lists, %d tasks, %d routines, %d roles, %d audit entries",
            len(self.calendars),
            len(self.events),
            len(self.templates),
            len(self.lists),
            len(self.tasks),
            len(self.routines),
            len(self.roles),
            len(self.audit_log),
        )

    # ── Internal: seed defaults ─────────────────────────────────────────

    async def _seed_defaults(self) -> None:
        """Create default calendars, lists, and shift templates on first run."""
        now = datetime.now(UTC).isoformat()

        for cal_def in DEFAULT_CALENDARS:
            cal = PlannerCalendar(
                id=cal_def["id"],
                name=cal_def["name"],
                color=cal_def.get("color", "#64b5f6"),
                is_private=False,
                created_at=now,
            )
            self.calendars[cal.id] = cal
            await self._upsert(calendars_table, cal.to_dict())

        for list_def in DEFAULT_LISTS:
            lst = PlannerList(
                id=list_def["id"],
                name=list_def["name"],
                list_type="shopping" if list_def["id"] == "shopping" else "standard",
                is_private=False,
                created_at=now,
            )
            self.lists[lst.id] = lst
            await self._upsert(lists_table, lst.to_dict())

        for tpl_def in DEFAULT_TEMPLATES:
            tpl = ShiftTemplate(
                id=tpl_def["id"],
                name=tpl_def["name"],
                calendar_id=tpl_def.get("calendar_id", ""),
                start_time=tpl_def.get("start_time", ""),
                end_time=tpl_def.get("end_time", ""),
                color=tpl_def.get("color", "#64b5f6"),
                emoji=tpl_def.get("emoji", ""),
            )
            self.templates[tpl.id] = tpl
            await self._upsert(templates_table, tpl.to_dict())

        _LOGGER.info(
            "Seeded %d calendars, %d lists, %d templates",
            len(self.calendars),
            len(self.lists),
            len(self.templates),
        )

    async def _seed_default_routines(self) -> None:
        """Create default routines (used on first run or upgrade)."""
        for routine_def in DEFAULT_ROUTINES:
            routine = Routine.from_dict(routine_def)
            self.routines[routine.id] = routine
            await self._upsert(routines_table, _routine_to_sql(routine))
        _LOGGER.info("Seeded %d default routines", len(self.routines))


# ── Model-to-SQL row converters ────────────────────────────────────────
# These convert ISO-string datetime fields to native datetime objects
# for writing to the SQL layer, while leaving all other fields unchanged.


def _event_to_sql(event: PlannerEvent) -> dict:
    """Convert a PlannerEvent to a SQL-ready dict with native datetimes."""
    d = event.to_dict()
    d["start"] = _iso_to_dt(d["start"])
    d["end"] = _iso_to_dt(d["end"])
    d["created_at"] = _iso_to_dt(d["created_at"])
    d["updated_at"] = _iso_to_dt(d["updated_at"])
    d["deleted_at"] = _iso_to_dt(d.get("deleted_at"))
    return d


def _task_to_sql(task: PlannerTask) -> dict:
    """Convert a PlannerTask to a SQL-ready dict with native datetimes."""
    d = task.to_dict()
    d["due"] = _iso_to_dt(d.get("due"))
    d["created_at"] = _iso_to_dt(d["created_at"])
    d["updated_at"] = _iso_to_dt(d["updated_at"])
    d["deleted_at"] = _iso_to_dt(d.get("deleted_at"))
    return d


def _routine_to_sql(routine: Routine) -> dict:
    """Convert a Routine to a SQL-ready dict with JSON-encoded list fields."""
    d = routine.to_dict()
    d["tasks"] = json.dumps(d.get("tasks", []))
    d["shopping_items"] = json.dumps(d.get("shopping_items", []))
    return d
