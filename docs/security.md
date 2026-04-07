# Security

## Role model

Calee uses a three-tier role hierarchy: **owner > editor > viewer**.

| Role | Read | Write (create/update/delete) | Manage roles |
|---|---|---|---|
| Owner | Yes | Yes | Yes |
| Editor | Yes | Yes | No |
| Viewer | Yes | No | No |

Roles are assigned per resource (calendar or list). A user can hold different roles on different resources.

**Home Assistant admin users bypass all role checks.**

## Family-friendly defaults

When **no roles are configured** at all (the expected path for most families):

- Everyone can read and write everything.
- No restrictions apply.

Once **any role assignment exists**, the system switches to deny-by-default for writes:

- A user must hold an explicit editor or owner role to write.
- Reads remain open by default (unless the resource is private or strict mode is on).

## Private resources

Calendars and lists can be marked `is_private = true`. When private:

- Read access requires an explicit role on that resource, regardless of global role configuration.
- Write access requires an explicit editor or owner role.

Privacy can be toggled via the `calee.set_calendar_private` / `calee.set_list_private` service actions, the calendar manager dialog, or the WebSocket API.

## Strict privacy mode

An opt-in setting (`strict_privacy`) that changes default behaviour:

| Behaviour | Default mode | Strict mode |
|---|---|---|
| New calendars/lists | `is_private = false` | `is_private = true` |
| Unassigned resources (no roles) | Visible to all | Hidden from non-admin users |
| Internal calls (`user_id = None`) | Allowed | Denied unless `allow_internal_writes` is set |

Enable strict mode in **Settings > Privacy > Strict privacy mode**.

## user_id = None behaviour

Internal automation calls (e.g., service calls from HA automations without a user context) set `user_id = None`.

- **Default mode:** These calls pass permission checks unconditionally.
- **Strict mode:** These calls are denied unless the config option `allow_internal_writes` is explicitly set to `true`.

## Diagnostics redaction

When generating diagnostics (via **Settings > Devices & Services > Calee > Download diagnostics**), the following keys are redacted:

`note`, `notes`, `title`, `summary`, `description`, `token`, `access_token`, `refresh_token`, `api_key`, `password`, `db_password`, `db_username`

Audit log detail strings are also redacted in diagnostics output.
