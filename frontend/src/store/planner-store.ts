/**
 * PlannerStore — reactive data store for the Calee panel.
 *
 * Holds all planner state in memory, provides filtered accessors, and
 * auto-refreshes when the backend fires change notifications via the
 * WebSocket subscription.
 */

import { PlannerConnection } from "./connection.js";
import type {
  HomeAssistant,
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  PlannerList,
  ShiftTemplate,
  TaskPreset,
  PlannerChangeEvent,
  ViewType,
} from "./types.js";

export type StoreListener = () => void;

export class PlannerStore {
  // ── Public reactive state ─────────────────────────────────────────

  calendars: PlannerCalendar[] = [];
  events: PlannerEvent[] = [];
  tasks: PlannerTask[] = [];
  lists: PlannerList[] = [];
  templates: ShiftTemplate[] = [];
  presets: TaskPreset[] = [];

  selectedDate: string = new Date().toISOString().slice(0, 10);
  currentView: ViewType = "month";
  enabledCalendarIds: Set<string> = new Set();

  loading = false;
  error: string | null = null;

  // ── Private ───────────────────────────────────────────────────────

  private _conn: PlannerConnection;
  private _unsub: (() => void) | null = null;
  private _listeners: Set<StoreListener> = new Set();
  private _refreshDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(hass: HomeAssistant) {
    this._conn = new PlannerConnection(hass);
  }

  /** The underlying connection (for one-off mutations from views). */
  get connection(): PlannerConnection {
    return this._conn;
  }

  // ── Hass lifecycle ────────────────────────────────────────────────

  /** Call when the `hass` object changes (HA reconnect). */
  updateHass(hass: HomeAssistant): void {
    this._conn.updateHass(hass);
  }

  /** Property-style setter so callers can write `store.hass = newHass`. */
  set hass(hass: HomeAssistant) {
    this.updateHass(hass);
  }

  // ── Subscription helpers ──────────────────────────────────────────

  /**
   * Register a listener that is called whenever the store data changes.
   * Returns an unsubscribe function.
   */
  addListener(listener: StoreListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const fn of this._listeners) {
      try {
        fn();
      } catch {
        // Swallow listener errors to avoid cascading failures.
      }
    }
  }

  // ── Data loading ──────────────────────────────────────────────────

  /**
   * Initial load — fetch all data and start the real-time subscription.
   */
  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    this._notify();

    try {
      await this._fetchAll();
      await this._subscribe();
    } catch (err: unknown) {
      this.error =
        err instanceof Error ? err.message : "Failed to load planner data";
    } finally {
      this.loading = false;
      this._notify();
    }
  }

  /**
   * Re-fetch all data from the backend (e.g. after receiving a change
   * notification or on user-initiated refresh).
   */
  async refresh(): Promise<void> {
    try {
      await this._fetchAll();
    } catch (err: unknown) {
      this.error =
        err instanceof Error ? err.message : "Failed to refresh planner data";
    }
    this._notify();
  }

  /** Tear down the subscription when the panel is disconnected. */
  async dispose(): Promise<void> {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    if (this._refreshDebounce) {
      clearTimeout(this._refreshDebounce);
      this._refreshDebounce = null;
    }
  }

  // ── Filtered accessors ────────────────────────────────────────────

  /**
   * Return events whose date range overlaps [start, end].
   * Both parameters are ISO 8601 date strings (YYYY-MM-DD).
   */
  getEventsForDateRange(start: string, end: string): PlannerEvent[] {
    const rangeStart = start.slice(0, 10);
    const rangeEnd = end.slice(0, 10);

    return this.events.filter((ev) => {
      // Respect enabled calendar filter.
      if (
        this.enabledCalendarIds.size > 0 &&
        !this.enabledCalendarIds.has(ev.calendar_id)
      ) {
        return false;
      }

      const evStart = ev.start.slice(0, 10);
      const evEnd = ev.end ? ev.end.slice(0, 10) : evStart;

      return evEnd >= rangeStart && evStart <= rangeEnd;
    });
  }

  /**
   * Return tasks filtered for a virtual view.
   *
   * - "today"    — tasks due today (or overdue)
   * - "upcoming" — tasks due after today
   * - undefined  — all active tasks
   */
  getTasksForView(view?: string): PlannerTask[] {
    if (!view) return this.tasks;

    const today = new Date().toISOString().slice(0, 10);

    if (view === "today") {
      return this.tasks.filter(
        (t) => t.due !== null && t.due.slice(0, 10) <= today,
      );
    }
    if (view === "upcoming") {
      return this.tasks.filter(
        (t) => t.due !== null && t.due.slice(0, 10) > today,
      );
    }
    return this.tasks;
  }

  /**
   * Return tasks belonging to a specific list.
   */
  getTasksForList(listId: string): PlannerTask[] {
    return this.tasks.filter((t) => t.list_id === listId);
  }

  // ── View state helpers ────────────────────────────────────────────

  setView(view: ViewType): void {
    this.currentView = view;
    this._notify();
  }

  setSelectedDate(date: string): void {
    this.selectedDate = date;
    this._notify();
  }

  toggleCalendar(calendarId: string): void {
    if (this.enabledCalendarIds.has(calendarId)) {
      this.enabledCalendarIds.delete(calendarId);
    } else {
      this.enabledCalendarIds.add(calendarId);
    }
    this._notify();
  }

  // ── Private helpers ───────────────────────────────────────────────

  /**
   * Return presets loaded by the store.
   */
  getPresets(): TaskPreset[] {
    return this.presets;
  }

  private async _fetchAll(): Promise<void> {
    const [calendars, events, tasks, lists, templates, presets] = await Promise.all([
      this._conn.getCalendars(),
      this._conn.getEvents(),
      this._conn.getTasks({}),
      this._conn.getLists(),
      this._conn.getTemplates(),
      this._conn.getPresets(),
    ]);

    this.calendars = calendars;
    this.events = events;
    this.tasks = tasks;
    this.lists = lists;
    this.templates = templates;
    this.presets = presets;

    // If no calendar filter has been set yet, enable all calendars.
    if (this.enabledCalendarIds.size === 0 && calendars.length > 0) {
      this.enabledCalendarIds = new Set(calendars.map((c) => c.id));
    }
  }

  private async _subscribe(): Promise<void> {
    if (this._unsub) return;

    this._unsub = await this._conn.subscribe(
      (_event: PlannerChangeEvent) => {
        // Debounce rapid-fire changes (e.g. bulk import) into a single
        // refresh cycle to avoid hammering the backend.
        if (this._refreshDebounce) {
          clearTimeout(this._refreshDebounce);
        }
        this._refreshDebounce = setTimeout(() => {
          this._refreshDebounce = null;
          void this.refresh();
        }, 250);
      },
    );
  }
}

// ── Factory ───────────────────────────────────────────────────────────

let _instance: PlannerStore | null = null;

/**
 * Return (or create) the singleton PlannerStore for the given hass
 * connection.  Call `store.updateHass(hass)` on subsequent hass changes.
 */
export function getStore(hass: HomeAssistant): PlannerStore {
  if (!_instance) {
    _instance = new PlannerStore(hass);
  } else {
    _instance.updateHass(hass);
  }
  return _instance;
}
