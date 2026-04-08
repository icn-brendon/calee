"""Constants for the Calee integration."""

from __future__ import annotations

from enum import StrEnum
from typing import Final

DOMAIN: Final = "calee"
STORAGE_KEY: Final = f"{DOMAIN}.storage"
STORAGE_VERSION: Final = 1

# ── Default calendar slugs ──────────────────────────────────────────
DEFAULT_CALENDARS: Final[list[dict[str, str]]] = [
    {"id": "work_shifts", "name": "Work Shifts", "color": "#e57373"},
    {"id": "family_shared", "name": "Family Shared", "color": "#81c784"},
    {"id": "personal", "name": "Personal", "color": "#64b5f6"},
    {"id": "team_shared", "name": "Team / Shared", "color": "#ffb74d"},
]

# ── Default to-do lists (Today/Upcoming are virtual views) ──────────
DEFAULT_LISTS: Final[list[dict[str, str]]] = [
    {"id": "inbox", "name": "Inbox"},
    {"id": "shopping", "name": "Shopping"},
]

# ── Default shift templates ────────────────────────────────────────
DEFAULT_TEMPLATES: Final[list[dict[str, str]]] = [
    {"id": "tpl_early", "name": "Early", "calendar_id": "work_shifts", "start_time": "06:00", "end_time": "14:00", "color": "#ffb74d", "emoji": "\u2600\ufe0f"},
    {"id": "tpl_late", "name": "Late", "calendar_id": "work_shifts", "start_time": "14:00", "end_time": "22:00", "color": "#ce93d8", "emoji": "\U0001f324\ufe0f"},
    {"id": "tpl_night", "name": "Night", "calendar_id": "work_shifts", "start_time": "22:00", "end_time": "06:00", "color": "#90a4ae", "emoji": "\U0001f319"},
    {"id": "tpl_tshift", "name": "T Shift", "calendar_id": "work_shifts", "start_time": "07:00", "end_time": "19:15", "color": "#ff9800", "emoji": "\U0001f504"},
    {"id": "tpl_vshift", "name": "V Shift", "calendar_id": "work_shifts", "start_time": "19:00", "end_time": "07:15", "color": "#1565c0", "emoji": "\U0001f535"},
]

# ── Default routines / bundles ─────────────────────────────────────
DEFAULT_ROUTINES: Final[list[dict]] = [
    {
        "id": "routine_night_prep",
        "name": "Night Shift Prep",
        "emoji": "\U0001f319",
        "description": "Prepare for tonight's night shift",
        "shift_template_id": "tpl_night",
        "tasks": [
            {"title": "Pack dinner", "list_id": "inbox", "due_offset_days": 0},
            {"title": "Set alarm", "list_id": "inbox", "due_offset_days": 0},
        ],
        "shopping_items": [
            {"title": "Energy drinks", "category": "food", "quantity": 2},
            {"title": "Snacks", "category": "food", "quantity": 1},
        ],
    },
    {
        "id": "routine_weekly_groceries",
        "name": "Weekly Groceries",
        "emoji": "\U0001f6d2",
        "description": "Add the weekly grocery staples",
        "tasks": [],
        "shopping_items": [
            {"title": "Milk", "category": "groceries", "quantity": 2, "unit": "L"},
            {"title": "Bread", "category": "groceries", "quantity": 1},
            {"title": "Eggs", "category": "groceries", "quantity": 1, "unit": "dozen"},
            {"title": "Fruit", "category": "groceries", "quantity": 1},
            {"title": "Vegetables", "category": "groceries", "quantity": 1},
        ],
    },
]

# ── Default task presets (fast-add) ────────────────────────────────
DEFAULT_PRESETS: Final[list[dict[str, str]]] = [
    {"id": "preset_milk", "title": "Milk", "list_id": "shopping", "category": "groceries", "icon": "mdi:cup"},
    {"id": "preset_bread", "title": "Bread", "list_id": "shopping", "category": "groceries", "icon": "mdi:bread-slice"},
    {"id": "preset_eggs", "title": "Eggs", "list_id": "shopping", "category": "groceries", "icon": "mdi:egg"},
    {"id": "preset_chicken", "title": "Chicken", "list_id": "shopping", "category": "groceries", "icon": "mdi:food-drumstick"},
    {"id": "preset_fruit", "title": "Fruit", "list_id": "shopping", "category": "groceries", "icon": "mdi:fruit-cherries"},
    {"id": "preset_veggies", "title": "Vegetables", "list_id": "shopping", "category": "groceries", "icon": "mdi:carrot"},
    {"id": "preset_cleaning", "title": "Cleaning supplies", "list_id": "shopping", "category": "household", "icon": "mdi:spray-bottle"},
    {"id": "preset_laundry", "title": "Laundry detergent", "list_id": "shopping", "category": "household", "icon": "mdi:washing-machine"},
]

# ── Virtual task views (frontend-only, filtered by due date) ────────
VIRTUAL_VIEW_TODAY: Final = "today"
VIRTUAL_VIEW_UPCOMING: Final = "upcoming"

# ── Notification defaults ───────────────────────────────────────────
DEFAULT_REMINDER_MINUTES: Final = 60  # 1 hour before shift start
SNOOZE_OPTIONS_MINUTES: Final = [15, 60]

# ── Storage backends ────────────────────────────────────────────────
CONF_STORAGE_BACKEND: Final = "storage_backend"
CONF_DB_HOST: Final = "db_host"
CONF_DB_PORT: Final = "db_port"
CONF_DB_NAME: Final = "db_name"
CONF_DB_USERNAME: Final = "db_username"
CONF_DB_PASSWORD: Final = "db_password"

BACKEND_JSON: Final = "json"
BACKEND_MARIADB: Final = "mariadb"
BACKEND_POSTGRESQL: Final = "postgresql"

DEFAULT_MARIADB_HOST: Final = "core-mariadb"
DEFAULT_MARIADB_PORT: Final = 3306
DEFAULT_POSTGRESQL_PORT: Final = 5432
DEFAULT_DB_NAME: Final = "calee"

# ── Options defaults ────────────────────────────────────────────────
DEFAULT_MAX_EVENT_AGE_DAYS: Final = 365
DEFAULT_CURRENCY: Final = "$"
DEFAULT_BUDGET: Final = 0
DEFAULT_WEEK_START: Final = "monday"
DEFAULT_TIME_FORMAT: Final = "12h"
DEFAULT_STRICT_PRIVACY: Final = False

# ── Notification options defaults ──────────────────────────────────
DEFAULT_NOTIFICATIONS_ENABLED: Final = True
DEFAULT_MORNING_SUMMARY_ENABLED: Final = True
DEFAULT_MORNING_SUMMARY_HOUR: Final = 7
DEFAULT_NOTIFICATION_TARGET: Final = ""  # empty = all notify services
DEFAULT_REMINDER_CALENDARS: Final = ["work_shifts"]

# ── Panel ────────────────────────────────────────────────────────────
PANEL_URL: Final = "/calee"
PANEL_TITLE: Final = "Planner"
PANEL_ICON: Final = "mdi:calendar-account"
PANEL_FRONTEND_PATH: Final = "frontend/dist/planner_panel.js"

# ── Service names ────────────────────────────────────────────────────
SERVICE_ADD_SHIFT: Final = "add_shift"
SERVICE_UPSERT_SHIFT: Final = "upsert_shift"
SERVICE_UPDATE_SHIFT: Final = "update_shift"
SERVICE_DELETE_SHIFT: Final = "delete_shift"
SERVICE_ADD_TASK: Final = "add_task"
SERVICE_COMPLETE_TASK: Final = "complete_task"
SERVICE_UPDATE_TASK: Final = "update_task"
SERVICE_DELETE_TASK: Final = "delete_task"
SERVICE_SNOOZE_REMINDER: Final = "snooze_reminder"
SERVICE_CREATE_TEMPLATE: Final = "create_template"
SERVICE_UPDATE_TEMPLATE: Final = "update_template"
SERVICE_DELETE_TEMPLATE: Final = "delete_template"
SERVICE_ADD_SHIFT_FROM_TEMPLATE: Final = "add_shift_from_template"
SERVICE_IMPORT_CSV: Final = "import_csv"
SERVICE_IMPORT_ICS: Final = "import_ics"
SERVICE_LINK_TASK_TO_EVENT: Final = "link_task_to_event"
SERVICE_UNLINK_TASK_FROM_EVENT: Final = "unlink_task_from_event"
SERVICE_RESTORE_SHIFT: Final = "restore_shift"
SERVICE_RESTORE_TASK: Final = "restore_task"
SERVICE_CREATE_PRESET: Final = "create_preset"
SERVICE_DELETE_PRESET: Final = "delete_preset"
SERVICE_UNCOMPLETE_TASK: Final = "uncomplete_task"
SERVICE_ADD_FROM_PRESET: Final = "add_from_preset"
SERVICE_SET_CALENDAR_PRIVATE: Final = "set_calendar_private"
SERVICE_SET_LIST_PRIVATE: Final = "set_list_private"
SERVICE_CREATE_ROUTINE: Final = "create_routine"
SERVICE_UPDATE_ROUTINE: Final = "update_routine"
SERVICE_DELETE_ROUTINE: Final = "delete_routine"
SERVICE_EXECUTE_ROUTINE: Final = "execute_routine"

# ── Attribute keys ───────────────────────────────────────────────────
ATTR_CALENDAR_ID: Final = "calendar_id"
ATTR_EVENT_ID: Final = "event_id"
ATTR_EXTERNAL_ID: Final = "external_id"
ATTR_SOURCE: Final = "source"
ATTR_TEMPLATE_ID: Final = "template_id"
ATTR_SHIFT_START: Final = "start"
ATTR_SHIFT_END: Final = "end"
ATTR_SHIFT_TITLE: Final = "title"
ATTR_SHIFT_NOTE: Final = "note"
ATTR_TASK_ID: Final = "task_id"
ATTR_LIST_ID: Final = "list_id"
ATTR_SNOOZE_MINUTES: Final = "minutes"
ATTR_VERSION: Final = "version"
ATTR_TEMPLATE_NAME: Final = "name"
ATTR_TEMPLATE_START_TIME: Final = "start_time"
ATTR_TEMPLATE_END_TIME: Final = "end_time"
ATTR_TEMPLATE_COLOR: Final = "color"
ATTR_DATE: Final = "date"
ATTR_IMPORT_DATA: Final = "data"
ATTR_PRESET_ID: Final = "preset_id"
ATTR_PRESET_TITLE: Final = "title"
ATTR_PRESET_CATEGORY: Final = "category"
ATTR_PRESET_ICON: Final = "icon"

# ── WebSocket commands ───────────────────────────────────────────────
WS_TYPE_CALENDARS: Final = f"{DOMAIN}/calendars"
WS_TYPE_EVENTS: Final = f"{DOMAIN}/events"
WS_TYPE_TASKS: Final = f"{DOMAIN}/tasks"
WS_TYPE_LISTS: Final = f"{DOMAIN}/lists"
WS_TYPE_TEMPLATES: Final = f"{DOMAIN}/templates"
WS_TYPE_SUBSCRIBE: Final = f"{DOMAIN}/subscribe"
WS_TYPE_CREATE_TEMPLATE: Final = f"{DOMAIN}/create_template"
WS_TYPE_UPDATE_TEMPLATE: Final = f"{DOMAIN}/update_template"
WS_TYPE_DELETE_TEMPLATE: Final = f"{DOMAIN}/delete_template"
WS_TYPE_ADD_SHIFT_FROM_TEMPLATE: Final = f"{DOMAIN}/add_shift_from_template"
WS_TYPE_CREATE_EVENT: Final = f"{DOMAIN}/create_event"
WS_TYPE_UPDATE_EVENT: Final = f"{DOMAIN}/update_event"
WS_TYPE_DELETE_EVENT: Final = f"{DOMAIN}/delete_event"
WS_TYPE_CREATE_TASK: Final = f"{DOMAIN}/create_task"
WS_TYPE_UPDATE_TASK: Final = f"{DOMAIN}/update_task"
WS_TYPE_DELETE_TASK: Final = f"{DOMAIN}/delete_task"
WS_TYPE_COMPLETE_TASK: Final = f"{DOMAIN}/complete_task"
WS_TYPE_UNCOMPLETE_TASK: Final = f"{DOMAIN}/uncomplete_task"
WS_TYPE_LINK_TASK_TO_EVENT: Final = f"{DOMAIN}/link_task_to_event"
WS_TYPE_UNLINK_TASK_FROM_EVENT: Final = f"{DOMAIN}/unlink_task_from_event"
WS_TYPE_RESTORE_EVENT: Final = f"{DOMAIN}/restore_event"
WS_TYPE_RESTORE_TASK: Final = f"{DOMAIN}/restore_task"
WS_TYPE_REORDER_TASK: Final = f"{DOMAIN}/reorder_task"
WS_TYPE_NOTIFICATION_RULES: Final = f"{DOMAIN}/notification_rules"
WS_TYPE_CREATE_NOTIFICATION_RULE: Final = f"{DOMAIN}/create_notification_rule"
WS_TYPE_UPDATE_NOTIFICATION_RULE: Final = f"{DOMAIN}/update_notification_rule"
WS_TYPE_DELETE_NOTIFICATION_RULE: Final = f"{DOMAIN}/delete_notification_rule"
WS_TYPE_NOTIFY_SERVICES: Final = f"{DOMAIN}/notify_services"
WS_TYPE_PRESETS: Final = f"{DOMAIN}/presets"
WS_TYPE_CREATE_PRESET: Final = f"{DOMAIN}/create_preset"
WS_TYPE_DELETE_PRESET: Final = f"{DOMAIN}/delete_preset"
WS_TYPE_ADD_FROM_PRESET: Final = f"{DOMAIN}/add_from_preset"
WS_TYPE_IMPORT_CSV: Final = f"{DOMAIN}/import_csv"
WS_TYPE_IMPORT_ICS: Final = f"{DOMAIN}/import_ics"
WS_TYPE_DELETED_ITEMS: Final = f"{DOMAIN}/deleted_items"
WS_TYPE_AUDIT_LOG: Final = f"{DOMAIN}/audit_log"
WS_TYPE_GET_SETTINGS: Final = f"{DOMAIN}/get_settings"
WS_TYPE_UPDATE_SETTINGS: Final = f"{DOMAIN}/update_settings"
WS_TYPE_SET_CALENDAR_PRIVATE: Final = f"{DOMAIN}/set_calendar_private"
WS_TYPE_SET_LIST_PRIVATE: Final = f"{DOMAIN}/set_list_private"
WS_TYPE_EXPAND_RECURRING_EVENTS: Final = f"{DOMAIN}/expand_recurring_events"
WS_TYPE_ROUTINES: Final = f"{DOMAIN}/routines"
WS_TYPE_CREATE_ROUTINE: Final = f"{DOMAIN}/create_routine"
WS_TYPE_UPDATE_ROUTINE: Final = f"{DOMAIN}/update_routine"
WS_TYPE_DELETE_ROUTINE: Final = f"{DOMAIN}/delete_routine"
WS_TYPE_EXECUTE_ROUTINE: Final = f"{DOMAIN}/execute_routine"
WS_TYPE_ADD_EVENT_EXCEPTION: Final = f"{DOMAIN}/add_event_exception"
WS_TYPE_EDIT_EVENT_OCCURRENCE: Final = f"{DOMAIN}/edit_event_occurrence"
WS_TYPE_CREATE_CALENDAR: Final = f"{DOMAIN}/create_calendar"
WS_TYPE_UPDATE_CALENDAR: Final = f"{DOMAIN}/update_calendar"
WS_TYPE_DELETE_CALENDAR: Final = f"{DOMAIN}/delete_calendar"
WS_TYPE_CREATE_LIST: Final = f"{DOMAIN}/create_list"
WS_TYPE_UPDATE_LIST: Final = f"{DOMAIN}/update_list"
WS_TYPE_DELETE_LIST: Final = f"{DOMAIN}/delete_list"

# ── Diagnostics redaction ────────────────────────────────────────────
REDACT_KEYS: Final = frozenset(
    {
        "note",
        "notes",
        "title",
        "summary",
        "description",
        "token",
        "access_token",
        "refresh_token",
        "api_key",
        "password",
        "db_password",
        "db_username",
    }
)

# ── Soft delete retention ────────────────────────────────────────────
SOFT_DELETE_RETENTION_DAYS: Final = 30


class PlannerRole(StrEnum):
    """Role a user holds on a calendar or list."""

    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class AuditAction(StrEnum):
    """Auditable write actions."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    RESTORE = "restore"  # undo soft delete
    COMPLETE = "complete"
    UNCOMPLETE = "uncomplete"
    SNOOZE = "snooze"
