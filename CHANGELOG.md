# Changelog

All notable changes to Calee are documented here.

## 2026.4.16

### Added
- **3-day narrow week view** -- iPhone/mobile shows yesterday, today, tomorrow instead of 7 days; full week on tablet/desktop.
- **HACS icon troubleshooting** -- documented upstream HACS blank icon issue with workaround.

### Changed
- Notification settings removed from HA config options flow -- the in-panel settings dialog is now the single source of truth.
- Options flow preserves notification keys when saving general settings (no more silent reset).
- Calendar-page prev/next navigates by 3 days on mobile, 7 on desktop.
- Week-view CSS min-width uses actual day count instead of hardcoded 7.
- Documentation updated: notifications status "Planned" → "Implemented", troubleshooting labels match panel UI, debug logging guidance.

### Fixed
- Shell/calendar-page/month-view flex chain missing `min-width: 0` / `min-height: 0` causing iOS clipping.
- Month-view added `-webkit-overflow-scrolling: touch` for iOS momentum scroll.

## 2026.4.15

### Added
- **Live event progress** on Home page -- shows elapsed time and progress bar for current shift.

## 2026.4.14

### Added
- **Event notification overrides** -- per-event notification rules with enable/disable toggle in the event dialog.

## 2026.4.13

### Fixed
- **Mobile week panning** -- touch-action, -webkit-overflow-scrolling, and overscroll-behavior hardening for iOS/Android.

## 2026.4.12

### Added
- Preset icons rendered on the Home page for quick-add.

## 2026.4.11

### Changed
- Home overview refreshed with cleaner layout.
- Notification settings integrated into panel settings dialog.
- Brand lockup updated with C mark assets.

## 2026.4.10

### Changed
- **WebSocket API split** -- monolithic `websocket_api.py` (2,315 lines) split into `ws/` package with 4 focused modules: `ws_read.py`, `ws_events.py`, `ws_tasks.py`, `ws_admin.py`.
- **Per-entity subscription refresh** -- changes to events only reload events, task changes only reload tasks, etc. Eliminates ~60-70% of unnecessary WS calls.
- Shell skips duplicate subscription when PlannerStore is active.
- Calendar/list delete cascades reload to child events/tasks.

## 2026.4.9

### Added
- **Notification rules** -- per-event, per-template, per-calendar notification rules with cascade resolution (event > template > calendar > global).
- **Device picker** -- `calee/notify_services` WS command lists available HA notify services.
- NotificationRule model with scope, reminder_minutes, notify_services, custom title/message.
- Full CRUD: `calee/notification_rules`, `calee/create_notification_rule`, `calee/update_notification_rule`, `calee/delete_notification_rule`.
- Uniqueness enforced: one rule per (scope, scope_id).
- Permission checks via calendar ownership on all rule mutations.
- Rules filtered by `can_read` in strict privacy mode.
- SqlPlannerStore support with `calee_notification_rules` DB table.

## 2026.4.8

### Changed
- **Task view split** -- `tasks-view.ts` (1,315 → 446 lines) split into focused components: `task-item`, `task-quick-add`, `task-edit-sheet`, `undo-snackbar`.
- **Sort & group toolbar** -- tasks-page with sort (Manual/Due/Title/Newest) and group (None/List/Due date/Category) controls.
- **Task edit sheet** -- bottom sheet on mobile, side panel on desktop replacing inline editing.
- **Undo snackbar** -- 5-second undo bar on task delete with restore action.
- **Drag reorder** -- position-based ordering with `calee/reorder_task` WS command; scoped to same list with optimistic locking.
- Manual sort deterministic across lists (list_id + position).
- Cross-list reorder rejected with explicit error.
- Only changed positions persisted (avoids unnecessary version conflicts).

## 2026.4.7

### Changed
- **Shell cleanup** -- monolithic `calee-panel.ts` (3,685 lines) split into `calee-shell.ts` + page components.
- **Home view** -- new landing page with next shift hero, 3-day timeline, due tasks, shopping shortcuts.
- **Bottom navigation** -- mobile-only Home | Calendar | +Add | Tasks | Shopping.
- **Left rail** -- desktop 56px rail with calendar toggles, routines, settings.
- **Detail drawer** -- event/task detail panel for desktop.
- Calendar page with internal Day/Week/Month/Agenda segmented control.

## 2026.4.6

### Changed
- **Backend hardening** -- SQL store write-through cache, pool arg fixes for SQLite, `_ensure_new_columns` for ALTER TABLE migrations.
- **Tablet layout** -- responsive breakpoints for tablet-sized screens.
- **Full test coverage** -- 297+ tests covering store, API, sensors, config flow, permissions, models.

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
- Internal automation calls (`user_id=None`) bypass strict checks with a warning logged for audit visibility.
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
