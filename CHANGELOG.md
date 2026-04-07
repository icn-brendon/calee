# Changelog

All notable changes to Calee are documented here.

## 2026.4.5

### Added
- **Smart planner views** -- context-aware groupings: Before next shift, This weekend, Budget watch, Overdue tasks, and Conflicts.
- **Data Center** -- export planner data as JSON, CSV, or ICS; view import history and recent changes.
- **Strict privacy mode** -- opt-in setting that defaults new calendars/lists to private and hides unassigned resources.
- Lock icons in the sidebar for private calendars and lists.
- Privacy toggle in settings dialog.
- Documentation set: storage, security, API reference, importing, and troubleshooting guides.

### Changed
- Settings dialog now includes a Privacy section with strict mode toggle.
- Sidebar now includes a Smart Views section between Routines and More.
- Data Center accessible from the More section in the sidebar.
- `can_read` and `can_write` permission functions accept a `strict` parameter.
- `async_require_write` enforces strict privacy rules for internal (`user_id=None`) calls when enabled.
- New calendars and lists default to `is_private=true` when strict privacy is active.
- WebSocket `get_settings` and `update_settings` commands include `strict_privacy`.
- Options flow includes `strict_privacy` toggle.

## 2026.4.4

### Added
- **Calendar/list manager dialog** -- create, edit, delete calendars and to-do lists from the panel.
- **Recurring event support** -- create events with recurrence rules (RRULE); expand instances in calendar views.
- Edit/delete single occurrence or all occurrences of recurring events.
- Add exception dates to recurring events.
- WebSocket commands for calendar/list CRUD and recurring event management.

### Changed
- Sidebar calendar section shows a Manage button that opens the calendar manager.
- Event dialog supports recurrence rule input.
- Detail drawer shows recurrence info and per-occurrence actions.

## 2026.4.3

### Added
- **Routines** -- one-tap bundles that create shifts, tasks, and shopping items together.
- Default routines: Night Shift Prep, Weekly Groceries.
- Routine manager dialog for creating, editing, and deleting routines.
- Execute routines from sidebar or routine manager.
- WebSocket commands for routine CRUD and execution.
- Privacy flags (`is_private`) on calendars and lists.
- Role-based read filtering in WebSocket calendar/list/event/task endpoints.

### Changed
- Sidebar displays routines section with execute buttons.
- Permission checks use `is_private` flag for resource-level access control.

## 2026.4.2

### Added
- **Shopping view** with categories, budget tracking, per-item pricing, and quantity management.
- **Task presets** for quick-add with emoji icons.
- Duplicate merging for shopping items (same title increments quantity).
- Budget progress bar and spend summary.
- Shopping toast notifications for merged items.
- Year view in the sidebar.
- Detail drawer for desktop (click event/task to see details in side panel).
- Conflict detection across calendars with warning badges.

### Changed
- Tasks view supports recurring tasks with auto-reset.
- Task-to-event linking from tasks view.
- Sidebar shows upcoming events from all calendars.

## 2026.4.1

### Added
- Initial release of Calee as a HACS custom integration.
- Calendar entities for Work Shifts, Family Shared, Personal, and Team/Shared.
- To-do entities for Inbox and Shopping lists.
- Shift templates with one-tap creation (Early, Late, Night, T Shift, V Shift).
- Sidebar panel with Week, Month, Day, Agenda, and Tasks views.
- CSV and ICS roster import with idempotent upsert.
- Soft delete with 30-day recovery.
- Optimistic locking on event and task updates.
- Role-based access control (owner/editor/viewer).
- Audit logging with diagnostics redaction.
- Optional MariaDB and PostgreSQL storage backends.
- Settings synced across devices via backend (week start, time format, currency, budget).
