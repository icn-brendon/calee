# Importing

Calee supports importing events from CSV and ICS files via service actions or WebSocket commands.

## CSV format

The CSV importer expects a header row followed by data rows. Supported columns:

| Column | Required | Description |
|---|---|---|
| `title` | Yes | Event title |
| `start` | Yes | Start date/time (ISO 8601 or `YYYY-MM-DD HH:MM`) |
| `end` | Yes | End date/time (same format as start) |
| `calendar_id` | No | Target calendar ID (defaults to `work_shifts`) |
| `note` | No | Event note |
| `external_id` | No | External identifier for idempotent upsert |
| `all_day` | No | `true` or `false` (defaults to `false`) |

### Example

```csv
title,start,end,calendar_id,note,external_id
Early Shift,2026-04-07 06:00,2026-04-07 14:00,work_shifts,,roster-001
Late Shift,2026-04-08 14:00,2026-04-08 22:00,work_shifts,,roster-002
```

## ICS format

Standard iCalendar (RFC 5545) files are supported. The importer reads `VEVENT` components and maps:

- `SUMMARY` to `title`
- `DTSTART` / `DTEND` to `start` / `end`
- `DESCRIPTION` to `note`
- `UID` to `external_id`

Recurring events (`RRULE`) are stored as-is on the event and expanded by the frontend.

## Preview and dry-run

The import endpoints accept an optional `preview` flag (when supported by your version). With preview enabled, the importer parses the data and returns the list of events that would be created without actually writing them.

## Idempotency

Imports use the `source` + `external_id` combination for deduplication:

1. If an event with the same `source` and `external_id` exists, it is updated (upserted).
2. If no match is found, a new event is created.
3. Re-importing the same file will not create duplicates.

The `source` field is set automatically:
- CSV imports: `source = "import"`
- ICS imports: `source = "import"`

## Payload limits

- **CSV:** The `data` field accepts the raw CSV string. There is no hard size limit, but very large files (>10,000 rows) may be slow due to in-memory processing.
- **ICS:** Same approach -- the full ICS string is passed in the `data` field.

For very large imports, consider splitting the file and importing in batches.

## Usage

### Service call

```yaml
service: calee.import_csv
data:
  calendar_id: work_shifts
  data: |
    title,start,end
    Early,2026-04-07 06:00,2026-04-07 14:00
```

### WebSocket

```json
{
  "type": "calee/import_csv",
  "calendar_id": "work_shifts",
  "data": "title,start,end\nEarly,2026-04-07 06:00,2026-04-07 14:00"
}
```
