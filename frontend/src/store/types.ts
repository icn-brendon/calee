/**
 * TypeScript interfaces for the Calee data model.
 *
 * These mirror the Python dataclasses in
 * custom_components/calee/models.py and match the JSON shapes
 * returned by the WebSocket API.
 */

// ── Calendar ──────────────────────────────────────────────────────────

export interface PlannerCalendar {
  id: string;
  name: string;
  color: string;
  timezone: string;
  created_at: string;
}

// ── Event ─────────────────────────────────────────────────────────────

export interface PlannerEvent {
  id: string;
  calendar_id: string;
  title: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  all_day: boolean;
  note: string;
  template_id: string | null;
  source: string;
  external_id: string | null;
  recurrence_rule: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Task ──────────────────────────────────────────────────────────────

export interface PlannerTask {
  id: string;
  list_id: string;
  title: string;
  note: string;
  completed: boolean;
  due: string | null;
  related_event_id: string | null;
  recurrence_rule: string | null;
  category: string;
  is_recurring: boolean;
  recur_reset_hour: number;
  price: number | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── List ──────────────────────────────────────────────────────────────

export interface PlannerList {
  id: string;
  name: string;
  list_type: "standard" | "shopping";
  created_at: string;
}

// ── Shift Template ────────────────────────────────────────────────────

export interface ShiftTemplate {
  id: string;
  name: string;
  calendar_id: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  color: string;
  note: string;
  emoji: string;
}

// ── Task Preset ──────────────────────────────────────────────────────

export interface TaskPreset {
  id: string;
  title: string;
  list_id: string;
  note: string;
  category: string;
  icon: string;
}

// ── Audit Entry ──────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  action: string; // create | update | delete | restore | complete | uncomplete | snooze
  resource_type: string; // event | task | calendar | list
  resource_id: string;
  detail: string;
}

// ── Deleted item (event or task with item_type tag) ──────────────────

export interface DeletedItem {
  id: string;
  title: string;
  deleted_at: string;
  item_type: "event" | "task";
  // event fields
  calendar_id?: string;
  // task fields
  list_id?: string;
}

// ── View types ────────────────────────────────────────────────────────

export type ViewType =
  | "month"
  | "week"
  | "day"
  | "agenda"
  | "tasks"
  | "shopping"
  | "year";

// ── Subscription event payload ────────────────────────────────────────

export interface PlannerChangeEvent {
  action: string;
  resource_type: string;
  resource_id: string;
}

// ── Home Assistant types (minimal surface used by the panel) ──────────

export interface HomeAssistant {
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  connection: {
    subscribeMessage: (
      callback: (msg: PlannerChangeEvent) => void,
      params: Record<string, unknown>,
    ) => Promise<() => void>;
  };
  language: string;
  locale: {
    language: string;
    number_format: string;
  };
}
