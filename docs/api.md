# API Reference

## Service actions

All service actions are registered under the `calee` domain.

| Service | Description |
|---|---|
| `calee.add_shift` | Create a new shift event on a calendar |
| `calee.upsert_shift` | Create or update a shift by external ID (idempotent) |
| `calee.update_shift` | Update a shift event (requires version for optimistic locking) |
| `calee.delete_shift` | Soft-delete a shift event (30-day recovery window) |
| `calee.add_task` | Create a task in a specified list |
| `calee.update_task` | Update a task (requires version) |
| `calee.complete_task` | Mark a task as completed |
| `calee.uncomplete_task` | Mark a completed task as not completed |
| `calee.delete_task` | Soft-delete a task |
| `calee.snooze_reminder` | Snooze a shift reminder by N minutes |
| `calee.create_template` | Create a reusable shift template |
| `calee.update_template` | Update a shift template |
| `calee.delete_template` | Delete a shift template |
| `calee.add_shift_from_template` | Create a shift from a template on a given date |
| `calee.import_csv` | Import events from CSV data |
| `calee.import_ics` | Import events from ICS (iCalendar) data |
| `calee.link_task_to_event` | Link a task to a calendar event |
| `calee.unlink_task_from_event` | Remove a task-to-event link |
| `calee.restore_shift` | Restore a soft-deleted shift |
| `calee.restore_task` | Restore a soft-deleted task |
| `calee.create_preset` | Create a quick-add task preset |
| `calee.delete_preset` | Delete a task preset |
| `calee.add_from_preset` | Create a task from a preset (merges duplicates) |
| `calee.set_calendar_private` | Toggle the privacy flag on a calendar |
| `calee.set_list_private` | Toggle the privacy flag on a list |
| `calee.create_routine` | Create a routine (multi-item bundle) |
| `calee.update_routine` | Update a routine |
| `calee.delete_routine` | Delete a routine |
| `calee.execute_routine` | Execute a routine (creates shift + tasks + shopping items) |

## WebSocket commands

All WebSocket commands use the `calee/` prefix.

### Read commands

| Command | Description |
|---|---|
| `calee/calendars` | List all calendars (filtered by read permissions) |
| `calee/events` | List active events (optional `start`/`end` date filter) |
| `calee/tasks` | List active tasks (optional `list_id` filter) |
| `calee/lists` | List all to-do lists |
| `calee/templates` | List all shift templates |
| `calee/presets` | List all task presets |
| `calee/routines` | List all routines |
| `calee/deleted_items` | List soft-deleted events and tasks |
| `calee/audit_log` | Retrieve audit log entries |
| `calee/get_settings` | Get current settings (week start, currency, budget, etc.) |
| `calee/expand_recurring_events` | Expand recurring events into individual instances for a date range |

### Write commands

| Command | Description |
|---|---|
| `calee/create_event` | Create a new calendar event |
| `calee/update_event` | Update an event (requires version) |
| `calee/delete_event` | Soft-delete an event |
| `calee/restore_event` | Restore a soft-deleted event |
| `calee/create_task` | Create a new task |
| `calee/update_task` | Update a task (requires version) |
| `calee/delete_task` | Soft-delete a task |
| `calee/complete_task` | Mark a task completed |
| `calee/uncomplete_task` | Mark a task not completed |
| `calee/restore_task` | Restore a soft-deleted task |
| `calee/link_task_to_event` | Link a task to an event |
| `calee/unlink_task_from_event` | Remove a task-event link |
| `calee/create_template` | Create a shift template |
| `calee/update_template` | Update a shift template |
| `calee/delete_template` | Delete a shift template |
| `calee/add_shift_from_template` | Create shift from template |
| `calee/create_preset` | Create a task preset |
| `calee/delete_preset` | Delete a task preset |
| `calee/add_from_preset` | Create task from preset |
| `calee/import_csv` | Import events from CSV |
| `calee/import_ics` | Import events from ICS |
| `calee/set_calendar_private` | Set calendar privacy flag |
| `calee/set_list_private` | Set list privacy flag |
| `calee/create_routine` | Create a routine |
| `calee/update_routine` | Update a routine |
| `calee/delete_routine` | Delete a routine |
| `calee/execute_routine` | Execute a routine |
| `calee/add_event_exception` | Add an exception date to a recurring event |
| `calee/edit_event_occurrence` | Replace a single occurrence of a recurring event |
| `calee/create_calendar` | Create a new calendar |
| `calee/update_calendar` | Update a calendar's name, color, or emoji |
| `calee/delete_calendar` | Delete a calendar (hard delete) |
| `calee/create_list` | Create a new to-do list |
| `calee/update_list` | Update a list's name |
| `calee/delete_list` | Delete a list (hard delete) |
| `calee/update_settings` | Update settings (week start, currency, budget, strict privacy, etc.) |

### Subscription

| Command | Description |
|---|---|
| `calee/subscribe` | Subscribe to real-time change notifications (push updates on any mutation) |
