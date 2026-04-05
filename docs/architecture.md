# Architecture

Calee is a Home Assistant custom integration that provides a family planner. It follows the standard HA integration pattern with additional layers for storage abstraction and a custom frontend panel.

## Component Layout

```
custom_components/calee/
  __init__.py          <- Entry point, setup, migration orchestration
  config_flow.py       <- Config and options flow UI (backend selection, DB credentials)
  api.py               <- Business logic coordinator (validates, mutates, audits, fires events)
  store.py             <- Local JSON storage (.storage persistence)
  db/
    base.py            <- Abstract store interface
    schema.py          <- SQLAlchemy table definitions
    sql_store.py       <- MariaDB / PostgreSQL store implementation
    migration.py       <- Database schema migrations
  calendar.py          <- CalendarEntity platform (shifts, family events)
  todo.py              <- TodoListEntity platform (Inbox, Shopping)
  websocket_api.py     <- Real-time WebSocket API for the frontend panel
  permissions.py       <- Role-based access checks (owner / editor / viewer)
  models.py            <- Data models (events, tasks, templates, presets)
  recurrence.py        <- Recurring task processing (daily, weekly, fortnightly, monthly)
  importer.py          <- CSV and ICS roster import with idempotent upsert
  panel.py             <- Sidebar panel registration
  notify.py            <- Notification helpers (planned)
  diagnostics.py       <- Redacted diagnostics for troubleshooting
  frontend/dist/       <- Compiled LitElement panel (Vite build output)
```

## Request Flow

All mutations flow through a single path:

1. **Entry point** — A service call, WebSocket command, or entity method receives the request
2. **api.py** — Validates input, checks permissions against the user's role
3. **store** — Persists the change (JSON file or SQL database, depending on configuration)
4. **Audit log** — Records who did what and when
5. **Bus event** — Fires a Home Assistant event so WebSocket subscribers (the panel) get real-time updates

## Storage Backends

Calee supports three storage backends, selectable during setup or via the options flow:

| Backend    | Driver         | Use Case                           |
|------------|----------------|------------------------------------|
| Local JSON | `.storage` API | Default, zero configuration        |
| MariaDB    | aiomysql       | Large households, HA OS add-on     |
| PostgreSQL | asyncpg        | External database, advanced setups |

The store interface is shared across backends. Switching backends triggers an automatic data migration (see [Database Migration Guide](database-migration.md)).

## Frontend Panel

The sidebar panel is a LitElement web component built with Vite and served as a static JS file. It communicates with the backend exclusively through WebSocket commands, providing views for month, week, day, year, agenda, tasks, and shopping.

## Entity Platforms

- **Calendar** — One `CalendarEntity` per calendar (Work Shifts, Family Shared, Personal, Team / Shared). Standard HA calendar card compatible.
- **To-do** — One `TodoListEntity` per list (Inbox, Shopping). Appears in the HA to-do panel and supports automations.
