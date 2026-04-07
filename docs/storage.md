# Storage

Calee supports three storage backends: local JSON (default), MariaDB, and PostgreSQL. You choose the backend during initial setup or switch later via **Settings > Devices & Services > Calee > Configure**.

## Backends

### JSON (default)

Data is stored in `.storage/calee.storage` using Home Assistant's built-in `Store` helper. The entire dataset lives in memory and is serialised to disk on every write.

**Pros:** Zero dependencies, works on any HA install, instant setup.
**Cons:** Entire dataset is held in RAM; not suited for installations with tens of thousands of events.

### MariaDB

Uses the `aiomysql` async driver via SQLAlchemy. The default host is `core-mariadb` (the official HA add-on), port 3306.

**Pros:** Handles large datasets, shared across HA instances if needed.
**Cons:** Requires a running MariaDB instance and credentials.

### PostgreSQL

Uses the `asyncpg` driver via SQLAlchemy. Default port 5432.

**Pros:** Strong concurrency, handles complex queries efficiently.
**Cons:** Requires a running PostgreSQL instance.

## Memory model

Regardless of backend, Calee loads active data into memory on startup. The in-memory store is the source of truth during runtime; it is persisted to the backend on every mutation.

- **Calendars, lists, templates, presets, routines:** Always in memory.
- **Events and tasks:** Active (non-deleted) items in memory. Soft-deleted items are retained for 30 days before hard deletion on save.
- **Audit log:** Capped at 500 entries and 90 days. Older entries are pruned on save.

## Retention

| Data type | Retention |
|---|---|
| Active events | Configurable via `max_event_age_days` (default 365) |
| Soft-deleted events/tasks | 30 days (`SOFT_DELETE_RETENTION_DAYS`) |
| Audit log entries | 90 days or 500 entries, whichever is smaller |

## Backups

- **JSON:** Back up `.storage/calee.storage` (included in HA snapshot backups automatically).
- **MariaDB/PostgreSQL:** Use standard database backup tools (`mysqldump`, `pg_dump`).
- **Export:** Use the Data Center in the panel to export a JSON backup at any time.

## Migration

When switching backends via the options flow:

1. Calee detects the `_pending_migration` flag on config entry reload.
2. It loads all data from the old backend into memory.
3. It writes the full dataset to the new backend.
4. Both backends remain intact; the old one is not wiped.

**Limitations:**
- Migration is a full copy, not incremental.
- If the new backend already has data, it will be overwritten.
- Migration runs synchronously during the integration reload; large datasets may take a few seconds.
- The integration must be reloaded (or HA restarted) after switching backends.
