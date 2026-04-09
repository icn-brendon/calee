# Troubleshooting

## Planner loads slowly

**Symptoms:** The panel spinner stays visible for several seconds, or the UI feels sluggish when switching views.

**Possible causes:**

1. **Large dataset:** If you have thousands of events, the in-memory load and JSON serialisation take longer. Consider switching to MariaDB or PostgreSQL via **Settings > Devices & Services > Calee > Configure**.

2. **Broad date range:** The year view loads all events for 12 months. Other views load a narrower range. If year view is slow, the dataset is large.

3. **Recurring event expansion:** Events with recurrence rules are expanded into virtual instances on every view load. Complex or high-frequency rules (e.g., daily for 10 years) generate many instances.

**Solutions:**
- Reduce `max_event_age_days` in settings to prune older events.
- Switch to a database backend for large installs.
- Avoid creating recurring events with very long or unbounded ranges.

## DB switch started empty

**Symptoms:** After switching from JSON to MariaDB/PostgreSQL (or vice versa), the planner shows no data.

**Cause:** The migration runs during the config entry reload. If the reload was interrupted or the `_pending_migration` flag was lost, data was not copied.

**Solutions:**

1. Check that data still exists in the old backend:
   - **JSON:** Look for `.storage/calee.storage` in your HA config directory.
   - **Database:** Query the `calendars` / `events` / `tasks` tables directly.

2. Switch back to the old backend via the options flow to recover your data.

3. Manually trigger migration by adding `"_pending_migration": "json"` (or `"mariadb"`, `"postgresql"`) to the config entry options and reloading the integration.

## Presets not appearing

**Symptoms:** The quick-add preset buttons are missing from the shopping or tasks view.

**Possible causes:**

1. **No presets defined:** Default presets are only created on first install. If they were deleted, you need to re-create them via the shopping view's "Create preset" option or the `calee.create_preset` service action.

2. **Wrong list_id:** Presets are tied to a specific list. Shopping presets must have `list_id` set to your shopping list's ID (usually `"shopping"`). Task presets must reference a standard list ID.

3. **Filtered out:** The tasks view filters presets to non-shopping lists, and the shopping view filters to shopping lists. If a preset's `list_id` doesn't match, it won't show.

**Solutions:**
- Check your presets via `calee/presets` WebSocket command.
- Create new presets with the correct `list_id`.

## Calendar is hidden

**Symptoms:** A calendar exists but its events don't appear in calendar views.

**Possible causes:**

1. **Toggle off:** The calendar visibility toggle in the sidebar may be unchecked. Click the colored dot next to the calendar name to re-enable it.

2. **Private calendar:** The calendar has `is_private = true` and your user doesn't have an explicit role on it. Ask an admin to assign you a viewer (or higher) role, or have them toggle the calendar's privacy setting.

3. **Strict privacy mode:** When strict privacy is enabled, all calendars without explicit role assignments are hidden from non-admin users. Either assign roles or disable strict mode in settings.

4. **No events in range:** The calendar exists but has no events in the currently visible date range. Try switching to the year view or navigating to dates where events exist.

## Tasks not showing in Today/Upcoming

**Symptoms:** Tasks exist but don't appear in the Today or Upcoming virtual views.

**Cause:** These views filter by due date. Tasks without a `due` date set won't appear.

**Solution:** Edit the task and set a due date. Tasks with due dates on or before today appear in Today; tasks with future due dates appear in Upcoming.

## Notifications not working

**Symptoms:** Shift reminders or morning summaries are not being sent.

**Checks:**

1. Open the Calee panel → Settings (gear icon) and verify `Default event reminders` is on.
2. Check that `Reminder calendars` includes the calendar IDs you want reminders for (e.g. `work_shifts`).
3. If targeting a specific device, set `Notification destination` to a valid `notify` service (e.g. `mobile_app_phone`). Leave empty to use all available services.
4. For morning summaries, ensure `Morning summary` is on and the hour is set.
5. Check Home Assistant logs for `calee` entries. Detailed notifier messages, including send/skip decisions, may only appear after enabling debug logging for Calee.

**Note:** Notification rules can also be set per-calendar, per-template, or per-event. Check the notification rules in the panel settings to ensure they are enabled and not overriding the global defaults.

## HACS shows a blank icon for Calee

**Symptoms:** The Calee icon appears correctly in Home Assistant's **Settings → Integrations** page but shows as blank in the HACS dashboard.

**Cause:** This is an upstream HACS issue, not a Calee bug. Calee ships local brand assets under `custom_components/calee/brand/` which Home Assistant 2026.3+ reads correctly. HACS currently uses an older icon resolution path that does not fall back to local brand images for installed custom integrations.

**Workaround:**
1. Try HACS → Calee → **Redownload** to refresh cached assets.
2. Hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R).
3. If the icon still doesn't appear in HACS, this is expected until HACS adds local brand image support.

## Import creates duplicates

**Symptoms:** Re-importing a CSV/ICS file creates duplicate events.

**Cause:** Idempotent upsert relies on `external_id`. If your import data doesn't include unique external IDs, each import creates new events.

**Solution:** Ensure your CSV includes an `external_id` column with stable, unique values for each event. For ICS files, the `UID` field serves this purpose.
