# Calee

Calee is a family planner that runs as a custom integration inside Home Assistant. It brings shift planning, shared calendars, task management, and shopping lists into a single unified interface that your whole household can see and use — right from the HA sidebar.

[![HACS Validation](https://github.com/icn-brendon/calee/actions/workflows/hacs.yml/badge.svg)](https://github.com/icn-brendon/calee/actions/workflows/hacs.yml)
[![Tests](https://github.com/icn-brendon/calee/actions/workflows/tests.yml/badge.svg)](https://github.com/icn-brendon/calee/actions/workflows/tests.yml)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buy-me-a-coffee&logoColor=white)](https://buymeacoffee.com/brendons)

## Why Calee?

Families juggle a lot — work shifts, school events, appointments, groceries, and daily tasks. Calee puts all of that in one place inside the smart home system you already use. Add a shift in one tap and your spouse sees it instantly. Share a family calendar so everyone knows what's happening. Manage a shopping list that resets weekly. Track tasks with due dates and recurring reminders. No separate apps, no manual sharing, no syncing between devices.

**Key capabilities:**

- **Shift planning** — Create shifts from templates (Early, Late, Night, custom) with one tap. Overnight shifts handled automatically. Emoji + color coding for each shift type.
- **Family calendar** — Shared calendars for work shifts, family events, and personal appointments. Everyone in the household sees what's happening at a glance.
- **Shared shopping lists** — Categorized shopping with "Always Items" that auto-reset weekly, budget tracking with per-item pricing, quick-add presets with emoji, and custom categories.
- **Task management** — Inbox, Today, and Upcoming views with due dates, recurring rules (daily, weekly, fortnightly, monthly), inline editing, and task-to-event linking.
- **Sidebar panel** — A dedicated page in Home Assistant with week, month, day, year, agenda, tasks, and shopping views. Responsive on desktop, tablet, and mobile.
- **Easy sharing** — Shifts, events, and lists are automatically visible to everyone in the household through the shared planner. No export or sync required.
- **Import rosters** — Import shifts from CSV or ICS files. Idempotent — re-importing won't create duplicates.
- **Optional database** — Start with local storage, upgrade to MariaDB or PostgreSQL when ready. Automatic migration handles the transition.
- **Home Assistant native** — Calendar and to-do entities appear in HA like any other integration. Use them in automations, dashboards, cards, and voice assistants.

## Status

| Feature | Status |
|---|---|
| Calendar entities (shift work, family, shared) | Implemented |
| To-do entities (Inbox, Shopping) | Implemented |
| Shift templates with emoji + one-tap creation | Implemented |
| Sidebar panel (Week/Month/Day/Agenda/Tasks/Shopping) | Implemented |
| Overnight shift handling | Implemented |
| Soft delete with restore | Implemented |
| Optimistic locking | Implemented |
| Role-based access (owner/editor/viewer) | Implemented |
| Audit logging | Implemented |
| CSV/ICS roster import | Implemented |
| Recurring tasks | Implemented |
| Shopping with categories, presets, budget | Implemented |
| Optional MariaDB/PostgreSQL backends | Implemented |
| Easy shift sharing to family/spouse | Implemented |
| Unified settings (synced across devices) | Implemented |
| Actionable notifications (1-hour reminders) | Planned (M4) |
| iOS widget app | Planned (M5) |
| Recurring calendar events/shifts | Partial (backend ready, UI pending) |

## Default calendars and lists

| Calendars       | Lists    |
| --------------- | -------- |
| Work Shifts     | Inbox    |
| Family Shared   | Shopping |
| Personal        |          |
| Team / Shared   |          |

**Today** and **Upcoming** are virtual views in the panel — they filter tasks by due date automatically, so you never have to move tasks between lists.

## Installation

### HACS (recommended)

1. Open HACS in your Home Assistant instance
2. Go to **Integrations** > **Custom Repositories**
3. Add `https://github.com/icn-brendon/calee` as an Integration
4. Install **Calee**
5. Restart Home Assistant
6. Go to **Settings** > **Devices & Services** > **Add Integration** > **Calee**

### Manual

Copy the `custom_components/calee/` folder into your Home Assistant `config/custom_components/` directory and restart.

## Roadmap

### Milestone 0 — Foundation and hardening (complete)
- Integration scaffold, config flow, storage schema, migrations
- Role model (owner / editor / viewer), audit logging
- Diagnostics with redaction, HACS metadata, CI pipeline

### Milestone 1 — Planner backend (complete)
- All calendar + to-do entity platforms fully wired
- 12 service actions including shift templates and idempotent upsert
- WebSocket commands for real-time panel communication
- Overnight shift handling, optimistic locking, soft delete
- CSV/ICS roster import with idempotent upsert
- Optional MariaDB/PostgreSQL storage backends

### Milestone 2 — Planner panel (complete)
- Custom sidebar panel (LitElement)
- Month, week, day, year, agenda, tasks, and shopping views
- Calendar toggles, quick-add FAB, shift template picker
- Current shift progress bar, next shift countdown
- Unified settings synced across devices via backend

### Milestone 3 — Tasks and shopping polish (complete)
- Recurring tasks with automatic reset
- Task-to-event links
- Fast-add input with presets
- Shopping with categories, budget tracking, and presets

### Milestone 4 — Notifications and mobile shortcuts (planned)
- 1-hour pre-shift actionable notifications
- Deep links from notifications into Planner
- Quick-add shift shortcuts via Companion Actions

### Milestone 5 — iOS widget app (planned, separate repo)
- Native iOS app with HA auth
- WidgetKit: small (next shift), medium (weekly), large (configurable)
- Live Activity for active shift
- Deep links back to Planner

## Architecture

```
Home Assistant
  custom_components/calee/
    __init__.py          <- entry point
    config_flow.py       <- setup UI
    api.py               <- business logic coordinator
    store.py             <- .storage persistence
    calendar.py          <- CalendarEntity platform
    todo.py              <- TodoListEntity platform
    websocket_api.py     <- real-time API for the panel
    permissions.py       <- role checks
    panel.py             <- sidebar panel registration
    notify.py            <- notification helpers (M4)
    diagnostics.py       <- redacted diagnostics
    frontend/dist/       <- compiled LitElement panel
```

Services route through `api.py`, which validates input, checks permissions, mutates the store, records an audit entry, fires a bus event (for WebSocket subscribers), and saves.

## Services

| Service | Description |
| --- | --- |
| `calee.add_shift` | Create a new shift event |
| `calee.upsert_shift` | Create or update by external ID (idempotent) |
| `calee.update_shift` | Update a shift (with optimistic locking) |
| `calee.delete_shift` | Soft-delete a shift (30-day recovery) |
| `calee.add_task` | Create a task in a list |
| `calee.update_task` | Update a task (with optimistic locking) |
| `calee.complete_task` | Mark a task as done |
| `calee.delete_task` | Soft-delete a task |
| `calee.snooze_reminder` | Snooze a shift reminder |
| `calee.create_template` | Create a reusable shift template |
| `calee.delete_template` | Delete a shift template |
| `calee.add_shift_from_template` | Quick-add shift from a template |

## Development

```bash
# Install dev dependencies
pip install -r requirements_dev.txt

# Lint
ruff check custom_components/ tests/

# Run tests
pytest tests/ -v

# Type check (requires homeassistant-stubs)
mypy custom_components/calee/
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Open a PR against `main`
4. Ensure CI passes (HACS validation, hassfest, tests, lint)

## License

AGPL-3.0
