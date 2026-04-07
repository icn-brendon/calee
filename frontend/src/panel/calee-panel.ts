/**
 * Calee — Main Panel Component
 *
 * Entry point registered as <calee-panel> custom element.
 * Receives hass, narrow, and panel properties from Home Assistant.
 *
 * Implements:
 *  - Sidebar navigation with calendar toggles and list links
 *  - Header with date navigation and view switcher
 *  - Hash-based routing (#/month/2026-04-06, #/week/..., etc.)
 *  - Responsive layout (sidebar collapses to drawer on narrow screens)
 *  - FAB for quick-add actions
 */

import { LitElement, html, css, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerStore } from "../store/planner-store";
import type {
  Conflict,
  PlannerEvent,
  PlannerCalendar,
  PlannerTask,
  Routine,
  ShiftTemplate,
  TaskPreset,
  ViewType,
} from "../store/types.js";

// ── Side-effect imports: register all custom elements ─────────────────
import "../views/month-view.js";
import "../views/week-view.js";
import "../views/day-view.js";
import "../views/year-view.js";
import "../views/agenda-view.js";
import "../views/tasks-view.js";
import "../views/shopping-view.js";
import "../views/smart-views.js";
import "../cards/next-shift.js";
import "../dialogs/event-dialog.js";
import "../dialogs/template-picker.js";
import "../dialogs/template-manager.js";
import "../dialogs/settings-dialog.js";
import "../dialogs/deleted-items.js";
import "../dialogs/activity-feed.js";
import "../dialogs/routine-manager.js";
import "../dialogs/calendar-manager.js";
import "../dialogs/data-center.js";

// ── Types ──────────────────────────────────────────────────────────

interface CalendarToggle {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

interface PlannerListEntry {
  id: string;
  name: string;
  list_type: string;
  is_private?: boolean;
}

// Views that carry a date parameter in the hash
const DATE_VIEWS: ViewType[] = ["month", "week", "day", "year"];
const ALL_VIEWS: ViewType[] = ["month", "week", "day", "agenda", "tasks", "shopping", "year", "smart"];

// Views shown in the header tab bar (day is drill-down only; year accessed via sidebar)
const TAB_VIEWS: ViewType[] = ["week", "month", "agenda", "tasks", "shopping"];

// ── Helpers ────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseHash(): { view: ViewType; date: string } {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  const view = ALL_VIEWS.includes(parts[0] as ViewType)
    ? (parts[0] as ViewType)
    : 'week';
  const date = parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])
    ? parts[1]
    : todayISO();
  return { view, date };
}

function buildHash(view: ViewType, date: string): string {
  if (DATE_VIEWS.includes(view)) {
    return `#/${view}/${date}`;
  }
  return `#/${view}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(view: ViewType, dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long" };

  if (view === "year") {
    return String(d.getFullYear());
  }
  if (view === "day") {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "week") {
    const start = new Date(d);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }
  // month
  return d.toLocaleDateString(undefined, opts);
}

function dateStep(view: ViewType): number {
  if (view === "day") return 1;
  if (view === "week") return 7;
  return 0; // month and year handled separately
}

function stepYear(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + delta);
  return d.toISOString().slice(0, 10);
}

function stepMonth(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 10);
}

// ── Component ──────────────────────────────────────────────────────

@customElement("calee-panel")
export class CaleePanel extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Boolean, reflect: true }) narrow = false;

  /** Guard against adoptedStyleSheets polyfill crashes in older browsers. */
  override createRenderRoot(): HTMLElement | ShadowRoot {
    try {
      return super.createRenderRoot();
    } catch {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      return this.shadowRoot!;
    }
  }
  @property({ attribute: false }) panel: any;

  @state() private _currentView: ViewType = "week";
  @state() private _currentDate: string = todayISO();
  @state() private _drawerOpen = false;
  @state() private _sidebarCollapsed = false;
  @state() private _calendars: CalendarToggle[] = [];
  @state() private _lists: PlannerListEntry[] = [];
  @state() private _loading = true;
  @state() private _showAddDialog = false;

  // ── Data state ──────────────────────────────────────────────────────
  @state() private _events: PlannerEvent[] = [];
  @state() private _tasks: PlannerTask[] = [];
  @state() private _templates: ShiftTemplate[] = [];
  @state() private _presets: TaskPreset[] = [];
  @state() private _routines: Routine[] = [];
  @state() private _rawCalendars: PlannerCalendar[] = [];

  // ── Settings (loaded from backend) ─────────────────────────────────
  @state() private _settingsWeekStart: "monday" | "sunday" = "monday";
  @state() private _settingsTimeFormat: "12h" | "24h" = "12h";
  @state() private _settingsCurrency = "$";
  @state() private _settingsBudget = 0;

  // ── Detail drawer state (desktop right panel) ───────────────────────
  @state() private _detailDrawerOpen = false;
  @state() private _detailItem: PlannerEvent | PlannerTask | null = null;
  @state() private _detailItemType: "event" | "task" | null = null;
  // ── Recurring action dialog ─────────────────────────────────────────
  @state() private _showRecurringActionDialog = false;
  @state() private _recurringActionEvent: PlannerEvent | null = null;
  // ── Calendar manager dialog ─────────────────────────────────────────
  @state() private _showCalendarManager = false;
  // ── Conflicts ───────────────────────────────────────────────────────
  @state() private _conflicts: import("../store/types.js").Conflict[] = [];
  // ── Dialog state ────────────────────────────────────────────────────
  @state() private _editEvent: PlannerEvent | null = null;
  @state() private _showEventDialog = false;
  @state() private _eventDialogDefaults: { date?: string; time?: string; calendar_id?: string } = {};
  @state() private _showTemplatePicker = false;
  @state() private _templatePickerDate = "";
  @state() private _templatePickerTime = "";
  @state() private _showTemplateManager = false;
  @state() private _showSettings = false;
  @state() private _showDeletedItems = false;
  @state() private _showActivityFeed = false;
  @state() private _showRoutineManager = false;
  @state() private _showDataCenter = false;
  @state() private _smartSubTab: "before-shift" | "weekend" | "budget" | "overdue" | "conflicts" = "before-shift";
  @state() private _settingsStrictPrivacy = false;
  @state() private _shoppingToast = "";

  private _store?: PlannerStore;
  private _hashHandler = this._onHashChange.bind(this);
  private _keyHandler = this._handleKeydown.bind(this);
  private _unsubscribe?: () => void;

  /** Track whether tasks have been loaded for the current session. */
  private _tasksLoaded = false;

  // ── Lifecycle ────────────────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("hashchange", this._hashHandler);
    window.addEventListener("keydown", this._keyHandler);
    this._applyHash();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this._hashHandler);
    window.removeEventListener("keydown", this._keyHandler);
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
  }

  async firstUpdated(_changedProps: PropertyValues): Promise<void> {
    try {
      // Load user settings from backend
      await this._loadSettings();

      // Dynamically import the store (lazy, avoids circular deps in tests)
      try {
        const mod = await import("../store/planner-store");
        this._store = new mod.PlannerStore(this.hass);
        await this._store.load();
        this._syncFromStore();
      } catch {
        // Store not available yet — use WS fallback
        await this._loadViaWebSocket();
      }

      // Subscribe to real-time change notifications
      this._subscribeToChanges();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Calee] Failed to initialise panel:", err);
    } finally {
      // Always stop showing the loading spinner
      this._loading = false;
    }
  }

  updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass") && this._store) {
      this._store.hass = this.hass;
    }
    // Reload events when the view or date changes
    if (changedProps.has("_currentView") || changedProps.has("_currentDate")) {
      if (!this._loading) {
        this._loadEvents();
        // Lazy-load tasks when navigating to any view (needed for task badges and shopping)
        if (!this._tasksLoaded) {
          this._loadTasks();
        }
      }
    }
  }

  // ── Hash Routing ─────────────────────────────────────────────────

  private _applyHash(): void {
    const { view, date } = parseHash();
    this._currentView = view;
    this._currentDate = date;
    // Set default hash if empty
    if (!window.location.hash) {
      window.location.hash = buildHash(this._currentView, this._currentDate);
    }
  }

  private _onHashChange(): void {
    this._applyHash();
  }

  private _navigate(view: ViewType, date?: string): void {
    const d = date ?? this._currentDate;
    window.location.hash = buildHash(view, d);
  }

  // ── Date Navigation ──────────────────────────────────────────────

  private _onPrev(): void {
    const view = this._currentView;
    if (!DATE_VIEWS.includes(view)) return;
    const step = dateStep(view);
    let newDate: string;
    if (view === "year") {
      newDate = stepYear(this._currentDate, -1);
    } else if (step > 0) {
      newDate = addDays(this._currentDate, -step);
    } else {
      newDate = stepMonth(this._currentDate, -1);
    }
    this._navigate(view, newDate);
  }

  private _onNext(): void {
    const view = this._currentView;
    if (!DATE_VIEWS.includes(view)) return;
    const step = dateStep(view);
    let newDate: string;
    if (view === "year") {
      newDate = stepYear(this._currentDate, 1);
    } else if (step > 0) {
      newDate = addDays(this._currentDate, step);
    } else {
      newDate = stepMonth(this._currentDate, 1);
    }
    this._navigate(view, newDate);
  }

  private _onToday(): void {
    this._navigate(this._currentView, todayISO());
  }

  // ── Data Loading ─────────────────────────────────────────────────

  private _syncFromStore(): void {
    if (!this._store) return;
    const store = this._store as any;
    this._rawCalendars = store.calendars ?? [];
    this._calendars = this._rawCalendars.map((c: PlannerCalendar) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      visible: true,
    }));
    this._lists = store.lists ?? [];
    this._events = store.events ?? [];
    this._tasks = store.tasks ?? [];
    this._templates = store.templates ?? [];
    this._presets = store.presets ?? [];
    this._routines = store.routines ?? [];
    this._tasksLoaded = true;
  }

  private async _loadViaWebSocket(): Promise<void> {
    if (!this.hass) return;
    try {
      const [calendars, lists, templates, presets, routines] = await Promise.all([
        this.hass.callWS({ type: "calee/calendars" }),
        this.hass.callWS({ type: "calee/lists" }),
        this.hass.callWS({ type: "calee/templates" }),
        this.hass.callWS({ type: "calee/presets" }).catch(() => []),
        this.hass.callWS({ type: "calee/routines" }).catch(() => []),
      ]);
      this._rawCalendars = calendars ?? [];
      this._calendars = this._rawCalendars.map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color ?? "#64b5f6",
        visible: true,
      }));
      this._lists = lists ?? [];
      this._templates = templates ?? [];
      this._presets = presets ?? [];
      this._routines = (routines as Routine[]) ?? [];

      // Load tasks — needed for task badges on calendar views and task/shopping views.
      await this._loadTasks();
    } catch {
      // Integration may not be loaded yet
      this._rawCalendars = [];
      this._calendars = [];
      this._lists = [];
      this._tasks = [];
      this._templates = [];
      this._presets = [];
      this._routines = [];
    }

    // Load events for the current date range
    await this._loadEvents();
  }

  /** Load events for the visible date range based on the current view.
   *  Uses the expand_recurring_events endpoint to include virtual recurring instances. */
  private async _loadEvents(): Promise<void> {
    if (!this.hass) return;

    const { start, end } = this._getViewRange();
    try {
      this._events = (await this.hass.callWS({
        type: "calee/expand_recurring_events",
        start,
        end,
      })) ?? [];
    } catch {
      // Fallback to raw events if expansion not available
      try {
        this._events = (await this.hass.callWS({
          type: "calee/events",
          start,
          end,
        })) ?? [];
      } catch {
        // Silently handle — events may not be available yet
      }
    }
    // Detect conflicts after loading events.
    this._conflicts = this._detectConflicts(this._events);
  }

  /** Scan loaded events for overlapping timed events across different calendars. */
  private _detectConflicts(events: PlannerEvent[]): Conflict[] {
    const timed = events
      .filter((e) => !e.deleted_at && !e.all_day && e.start && e.end)
      .sort((a, b) => a.start.localeCompare(b.start));

    const conflicts: Conflict[] = [];
    for (let i = 0; i < timed.length; i++) {
      for (let j = i + 1; j < timed.length; j++) {
        const a = timed[i];
        const b = timed[j];
        // b starts after a ends — no more overlaps possible for a.
        if (b.start >= a.end) break;
        // Overlap exists and different calendars.
        if (a.calendar_id !== b.calendar_id) {
          conflicts.push({ eventA: a, eventB: b });
        }
      }
    }
    return conflicts;
  }

  /** Recompute conflicts from the current in-memory events list. */
  private _recomputeConflicts(): void {
    this._conflicts = this._detectConflicts(this._events);
  }

  /**
   * Lazy-load tasks via WebSocket.
   * Called when switching to tasks or shopping view for the first time,
   * or on refresh. Avoids loading all tasks on every startup.
   */
  private async _loadTasks(): Promise<void> {
    if (!this.hass) return;
    try {
      this._tasks = (await this.hass.callWS({
        type: "calee/tasks",
      })) ?? [];
      this._tasksLoaded = true;
    } catch {
      // Silently handle — tasks may not be available yet
    }
  }

  /** Calculate the date range for the current view. */
  private _getViewRange(): { start: string; end: string } {
    const d = new Date(this._currentDate + "T00:00:00");

    switch (this._currentView) {
      case "day": {
        return {
          start: this._currentDate,
          end: this._currentDate,
        };
      }
      case "month": {
        // Fetch the full month plus overlap for leading/trailing days
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const start = new Date(first);
        start.setDate(start.getDate() - 7);
        const end = new Date(last);
        end.setDate(end.getDate() + 7);
        return {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        };
      }
      case "week": {
        const dow = d.getDay();
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const start = new Date(d);
        start.setDate(start.getDate() + mondayOffset);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        };
      }
      case "year": {
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const yearEnd = new Date(d.getFullYear(), 11, 31);
        return {
          start: yearStart.toISOString().slice(0, 10),
          end: yearEnd.toISOString().slice(0, 10),
        };
      }
      case "agenda": {
        // Next 14 days
        const end = new Date(d);
        end.setDate(end.getDate() + 14);
        return {
          start: this._currentDate,
          end: end.toISOString().slice(0, 10),
        };
      }
      default: {
        // tasks / shopping — load a broad range
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const end = new Date();
        end.setDate(end.getDate() + 90);
        return {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        };
      }
    }
  }

  /** Subscribe to real-time planner change notifications. */
  private async _subscribeToChanges(): Promise<void> {
    if (!this.hass?.connection) return;
    try {
      this._unsubscribe = await this.hass.connection.subscribeMessage(
        (_event: any) => {
          // Debounce rapid-fire changes into a single refresh
          this._refreshAll();
        },
        { type: "calee/subscribe" },
      );
    } catch {
      // Subscription may not be available
    }
  }

  private _refreshDebounce: ReturnType<typeof setTimeout> | null = null;

  /** Debounced full data refresh triggered by subscription events. */
  private _refreshAll(): void {
    if (this._refreshDebounce) {
      clearTimeout(this._refreshDebounce);
    }
    this._refreshDebounce = setTimeout(async () => {
      this._refreshDebounce = null;
      if (this._store) {
        await this._store.refresh();
        this._syncFromStore();
      } else {
        await this._loadViaWebSocket();
      }
      // Re-fetch tasks if currently viewing them (handles mutation refreshes)
      if (
        !this._store &&
        (this._currentView === "tasks" || this._currentView === "shopping")
      ) {
        await this._loadTasks();
      }
    }, 250);
  }

  // ── Calendar Toggle ──────────────────────────────────────────────

  private _toggleCalendar(id: string): void {
    this._calendars = this._calendars.map((c) =>
      c.id === id ? { ...c, visible: !c.visible } : c
    );
  }

  // ── Drawer ───────────────────────────────────────────────────────

  private _toggleDrawer(): void {
    this._drawerOpen = !this._drawerOpen;
  }

  private _closeDrawer(): void {
    this._drawerOpen = false;
  }

  // ── Keyboard shortcuts (desktop) ────────────────────────────────

  private _isEditableKeyboardTarget(e: KeyboardEvent): boolean {
    const isEditableElement = (value: EventTarget | null | undefined): boolean => {
      if (!(value instanceof HTMLElement)) return false;
      const tag = value.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || value.isContentEditable;
    };
    if (e.composedPath().some((target) => isEditableElement(target))) return true;
    let active: Element | null = document.activeElement;
    while (active && active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return isEditableElement(active);
  }

  private _handleKeydown(e: KeyboardEvent): void {
    // Skip if on narrow/mobile — keyboard shortcuts are desktop only
    if (this.narrow) return;

    // Skip if typing in an input, textarea, select, or contenteditable
    if (this._isEditableKeyboardTarget(e)) return;

    // Skip if any dialog or overlay is open
    if (
      this._showEventDialog ||
      this._showTemplatePicker ||
      this._showTemplateManager ||
      this._showSettings ||
      this._showDeletedItems ||
      this._showActivityFeed ||
      this._showRoutineManager ||
      this._showAddDialog ||
      this._showRecurringActionDialog ||
      this._showCalendarManager ||
      this._showDataCenter
    ) {
      // Only handle Escape to close the dialog
      if (e.key === "Escape") {
        this._onDialogClose();
        this._showDeletedItems = false;
        this._showActivityFeed = false;
        this._showAddDialog = false;
        this._showRecurringActionDialog = false;
        this._showCalendarManager = false;
        this._showDataCenter = false;
      }
      return;
    }

    // Skip if modifier keys are held (except Shift for arrow keys)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case "n":
        e.preventDefault();
        this._onSidebarAdd();
        break;
      case "t":
        e.preventDefault();
        this._onToday();
        break;
      case "w":
        e.preventDefault();
        this._navigate("week");
        break;
      case "m":
        e.preventDefault();
        this._navigate("month");
        break;
      case "a":
        e.preventDefault();
        this._navigate("agenda");
        break;
      case "1":
        e.preventDefault();
        this._navigate("tasks");
        break;
      case "2":
        e.preventDefault();
        this._navigate("shopping");
        break;
      case "ArrowLeft":
        e.preventDefault();
        this._onPrev();
        break;
      case "ArrowRight":
        e.preventDefault();
        this._onNext();
        break;
      case "Escape":
        // Close drawer if open
        if (this._drawerOpen) {
          this._closeDrawer();
        }
        if (this._detailDrawerOpen) {
          this._closeDetailDrawer();
        }
        break;
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  static styles = css`
    /* ── Host ───────────────────────────────────────────────── */

    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      color: var(--primary-text-color, #212121);
      background: var(--primary-background-color, #fafafa);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
      --sidebar-width: 260px;
    }

    /* ── Header — compact 44px bar with tabs ────────────────── */

    .header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 12px;
      height: 44px;
      min-height: 44px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      z-index: 4;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex-shrink: 0;
    }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      font-size: 18px;
      line-height: 1;
      transition: background 0.15s, color 0.15s;
      min-width: 32px;
      min-height: 32px;
      align-items: center;
      justify-content: center;
    }

    .hamburger:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    :host([narrow]) .hamburger {
      display: flex;
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      color: var(--primary-text-color, #212121);
      letter-spacing: 0.2px;
    }

    /* ── View tabs — inline in header ──────────────────────── */

    .header-tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 12px;
    }

    .view-tab {
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      text-transform: capitalize;
      letter-spacing: 0.1px;
      transition: color 0.15s, background 0.15s;
      white-space: nowrap;
      line-height: 1;
    }

    .view-tab:hover {
      color: var(--primary-text-color, #212121);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .view-tab[active] {
      color: var(--primary-text-color, #212121);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      font-weight: 600;
    }

    /* ── Settings cog ──────────────────────────────────────── */

    .settings-cog {
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 4px;
    }

    .settings-cog:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .settings-cog svg {
      width: 18px;
      height: 18px;
    }

    /* ── Date nav — right side of header ───────────────────── */

    .header-date-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .date-nav-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 16px;
      line-height: 1;
      transition: background 0.15s, color 0.15s;
      min-width: 28px;
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .date-nav-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .today-btn {
      background: transparent;
      border: 1px solid var(--divider-color, #e0e0e0);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.15s, border-color 0.15s;
      line-height: 1;
    }

    .today-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-color: var(--secondary-text-color, #727272);
    }

    .date-label {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color, #212121);
    }

    /* ── Body (sidebar + main) ──────────────────────────────── */

    .body {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* ── Sidebar — clean clean ──────────────────────── */

    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--sidebar-background-color, var(--card-background-color, #fff));
      border-right: 1px solid var(--divider-color, #e0e0e0);
      overflow-y: auto;
      padding: 8px 0;
      z-index: 3;
      transition: width 0.2s ease, min-width 0.2s ease, transform 0.25s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .sidebar.collapsed {
      width: 48px;
      min-width: 48px;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .sidebar.collapsed .sidebar-add-btn,
    .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .nav-item-muted span,
    .sidebar.collapsed .section-label,
    .sidebar.collapsed .cal-toggle-name,
    .sidebar.collapsed .sidebar-upcoming,
    .sidebar.collapsed .sidebar-cards {
      display: none;
    }

    .sidebar.collapsed .nav-item,
    .sidebar.collapsed .nav-item-muted {
      justify-content: center;
      padding: 8px 0;
    }

    .sidebar-collapse-btn {
      position: absolute;
      top: 8px;
      right: -12px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--secondary-text-color, #666);
      z-index: 5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: background 0.15s;
    }

    .sidebar-collapse-btn:hover {
      background: var(--primary-background-color, #f5f5f5);
    }

    :host([narrow]) .sidebar-collapse-btn {
      display: none;
    }

    :host([narrow]) .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      transform: translateX(-100%);
      box-shadow: none;
    }

    :host([narrow]) .sidebar.open {
      transform: translateX(0);
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.12);
    }

    .sidebar-backdrop {
      display: none;
    }

    :host([narrow]) .sidebar-backdrop {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 2;
    }

    :host([narrow]) .sidebar-backdrop.visible {
      display: block;
    }

    /* ── Sidebar: Add button (clean) ────────────────── */

    .sidebar-add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      margin: 4px 12px 8px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-color, #03a9f4);
      transition: background 0.15s;
      font-family: inherit;
      line-height: 1;
    }

    .sidebar-add-btn:hover {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .sidebar-add-btn svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* ── Sidebar: Navigation items ──────────────────────────── */

    .sidebar-nav {
      padding: 0 8px;
      margin-bottom: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 12px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
      line-height: 1.3;
    }

    .nav-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .nav-item[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }

    .nav-item svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item[active] svg {
      color: var(--primary-color, #03a9f4);
    }

    .nav-item-muted {
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item-muted svg {
      width: 18px;
      height: 18px;
    }

    /* Calendar icon with date number */
    .nav-calendar-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-calendar-icon svg {
      width: 20px;
      height: 20px;
    }

    .nav-calendar-icon .date-num {
      position: absolute;
      bottom: 1px;
      left: 0;
      right: 0;
      font-size: 8px;
      font-weight: 700;
      text-align: center;
      line-height: 1;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item[active] .nav-calendar-icon .date-num {
      color: var(--primary-color, #03a9f4);
    }

    /* ── Sidebar: Section headers ──────────────────────────── */

    .sidebar-section {
      padding: 0 8px;
      margin-bottom: 4px;
    }

    .sidebar-heading {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      padding: 16px 12px 6px;
      margin: 0;
    }

    /* ── Sidebar: Calendar toggles ─────────────────────────── */

    .calendar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
      font-size: 14px;
    }

    .calendar-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .calendar-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--cal-color, #64b5f6);
      flex-shrink: 0;
      transition: opacity 0.15s;
    }

    .calendar-dot.hidden {
      opacity: 0.25;
    }

    .calendar-name {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Sidebar: List items ───────────────────────────────── */

    .list-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 6px;
      text-decoration: none;
      color: var(--primary-text-color, #212121);
      font-size: 14px;
      font-weight: 400;
      transition: background 0.15s;
    }

    .list-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .list-item[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }

    .list-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--secondary-text-color, #727272);
    }

    .list-item[active] svg {
      color: var(--primary-color, #03a9f4);
    }

    /* ── Sidebar: Shift cards ──────────────────────────────── */

    .sidebar-cards {
      padding: 4px 8px 0;
      margin-top: auto;
    }

    /* ── Sidebar: Upcoming events ─────────────────────────── */

    .sidebar-upcoming {
      padding: 4px 8px 8px;
    }

    .sidebar-upcoming .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      padding: 8px 8px 6px;
    }

    .upcoming-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 13px;
    }

    .upcoming-item .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .upcoming-item .upcoming-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--primary-text-color, #212121);
      font-weight: 400;
    }

    .upcoming-item .upcoming-time {
      font-size: 11px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── Main View ──────────────────────────────────────────── */

    .main {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: var(--card-background-color, #fff);
    }

    .view-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 14px;
      color: var(--secondary-text-color, #727272);
      text-align: center;
      padding: 32px;
    }

    .view-placeholder .inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .view-placeholder .label {
      font-size: 18px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }

    .view-placeholder .sub {
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
      font-weight: 400;
    }

    /* ── Loading ─────────────────────────────────────────────── */

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
      font-weight: 400;
    }

    /* ── Mobile bottom nav bar ──────────────────────────────── */

    .bottom-nav {
      display: none;
    }

    :host([narrow]) .bottom-nav {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 52px;
      min-height: 52px;
      background: var(--card-background-color, #fff);
      border-top: 1px solid var(--divider-color, #e0e0e0);
      z-index: 4;
      padding: 0 4px;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px 8px;
      min-width: 44px;
      min-height: 44px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      font-size: 10px;
      font-weight: 500;
      font-family: inherit;
      transition: color 0.15s;
      border-radius: 8px;
    }

    .bottom-nav-item[active] {
      color: var(--primary-color, #03a9f4);
    }

    .bottom-nav-item svg {
      width: 22px;
      height: 22px;
    }

    /* ── Narrow / responsive overrides ──────────────────────── */

    :host([narrow]) .header-tabs {
      display: none;
    }

    :host([narrow]) .header {
      padding: 0 8px;
      gap: 2px;
    }

    :host([narrow]) .date-label {
      font-size: 11px;
      max-width: 110px;
    }

    :host([narrow]) .title {
      font-size: 14px;
    }

    :host([narrow]) .today-btn {
      padding: 2px 8px;
      font-size: 11px;
    }

    :host([narrow]) .date-nav-btn {
      min-width: 24px;
      min-height: 24px;
      padding: 2px 4px;
      font-size: 14px;
    }

    :host([narrow]) .settings-cog {
      padding: 4px;
    }

    :host([narrow]) .settings-cog svg {
      width: 16px;
      height: 16px;
    }

    :host([narrow]) .header-date-nav {
      gap: 2px;
    }

    @media (max-width: 480px) {
      .header-date-nav .date-label {
        max-width: 100px;
      }
    }

    /* ── Dialog — lighter, softer ────────────────────────────── */

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .dialog-card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      padding: 28px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .dialog-card h2 {
      margin: 0 0 20px;
      font-size: 18px;
      font-weight: 500;
    }

    .dialog-card label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.2px;
      color: var(--secondary-text-color, #727272);
    }

    .dialog-card input,
    .dialog-card select,
    .dialog-card textarea {
      padding: 10px 12px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
      outline: none;
    }

    .dialog-card input:focus,
    .dialog-card select:focus,
    .dialog-card textarea:focus {
      border-color: var(--primary-color, #03a9f4);
      background: var(--card-background-color, #fff);
    }

    .dialog-card input::placeholder,
    .dialog-card textarea::placeholder {
      color: var(--secondary-text-color, #727272);
      opacity: 0.6;
    }

    .dialog-card .row {
      display: flex;
      gap: 12px;
    }

    .dialog-card .flex {
      flex: 1;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
    }

    .btn-cancel {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s;
    }

    .btn-cancel:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .btn-save {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.15s;
    }

    .btn-save:hover {
      opacity: 0.9;
    }

    /* ── Detail Drawer (desktop right panel) ──────────────── */

    .detail-drawer {
      width: 360px;
      min-width: 360px;
      background: var(--card-background-color, #fff);
      border-left: 1px solid var(--divider-color, #e0e0e0);
      overflow-y: auto;
      padding: 20px;
      transition: width 0.2s ease, min-width 0.2s ease;
      z-index: 3;
    }

    .detail-drawer.closed {
      width: 0;
      min-width: 0;
      padding: 0;
      overflow: hidden;
      border-left-width: 0;
    }

    :host([narrow]) .detail-drawer {
      display: none;
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .drawer-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .drawer-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 18px;
      line-height: 1;
      color: var(--secondary-text-color, #757575);
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .drawer-close-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .drawer-field {
      margin-bottom: 14px;
    }

    .drawer-field-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 4px;
    }

    .drawer-field-value {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      line-height: 1.4;
    }

    .drawer-field-value.muted {
      color: var(--secondary-text-color, #757575);
      font-style: italic;
    }

    .drawer-actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .drawer-btn {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }

    .drawer-btn-edit {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }
    .drawer-btn-edit:hover {
      filter: brightness(1.1);
    }

    .drawer-btn-delete {
      background: transparent;
      color: var(--error-color, #f44336);
      border: 1px solid var(--error-color, #f44336);
    }
    .drawer-btn-delete:hover {
      background: color-mix(in srgb, var(--error-color, #f44336) 10%, transparent);
    }

    .drawer-edit-input {
      width: 100%;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .drawer-edit-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .drawer-edit-textarea {
      width: 100%;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
      resize: vertical;
      min-height: 60px;
      transition: border-color 0.15s;
    }
    .drawer-edit-textarea:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .drawer-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--secondary-text-color, #757575);
    }
  `;


  // ── Computed helpers ──────────────────────────────────────────────

  /** Map of calendar ID to PlannerCalendar for passing to view components. */
  private get _calendarMap(): Map<string, PlannerCalendar> {
    const map = new Map<string, PlannerCalendar>();
    for (const c of this._rawCalendars) {
      map.set(c.id, c);
    }
    return map;
  }

  /** Set of enabled (visible) calendar IDs. */
  private get _enabledIds(): Set<string> {
    return new Set(
      this._calendars.filter((c) => c.visible).map((c) => c.id),
    );
  }

  /** Only work shifts — used for next-shift sidebar card. */
  private get _workEvents(): PlannerEvent[] {
    return this._events.filter((e) => e.calendar_id === "work_shifts");
  }

  /** The next upcoming work shift (starts in the future). */
  private get _nextShift(): PlannerEvent | null {
    const now = Date.now();
    const upcoming = this._workEvents
      .filter((e) => {
        if (e.deleted_at || e.all_day) return false;
        return new Date(e.start).getTime() > now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return upcoming[0] ?? null;
  }

  /** Next 5 events across ALL calendars for the upcoming sidebar section. */
  private get _upcomingEvents(): PlannerEvent[] {
    const now = Date.now();
    return this._events
      .filter((e) => {
        if (e.deleted_at) return false;
        return new Date(e.start).getTime() > now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }

  /** Tasks for the shopping list. */
  private get _shoppingTasks(): PlannerTask[] {
    const shoppingList = this._lists.find((l) => l.list_type === "shopping");
    if (!shoppingList) return this._tasks.filter((t) => t.list_id === "shopping");
    return this._tasks.filter((t) => t.list_id === shoppingList.id);
  }

  /** Tasks for standard task lists. */
  private get _standardTasks(): PlannerTask[] {
    const shoppingIds = new Set(
      this._lists.filter((l) => l.list_type === "shopping").map((l) => l.id),
    );
    return this._tasks.filter((t) => !shoppingIds.has(t.list_id));
  }

  render() {
    return html`
      ${this._renderHeader()}
      <div class="body">
        ${this._renderSidebarBackdrop()}
        ${this._renderSidebar()}
        <div class="main"
          @event-click=${this._onEventClick}
          @cell-click=${this._onCellClick}
          @task-click=${this._onTaskClick}
          @task-complete=${this._onTaskComplete}
          @task-uncomplete=${this._onTaskUncomplete}
          @task-delete=${this._onTaskDelete}
          @task-quick-add=${this._onTaskQuickAdd}
          @task-update=${this._onTaskUpdate}
          @task-price-update=${this._onTaskPriceUpdate}
          @task-quantity-update=${this._onTaskQuantityUpdate}
          @task-unit-update=${this._onTaskUnitUpdate}
          @routine-execute=${this._onRoutineExecute}
          @preset-add=${this._onPresetAdd}
          @preset-create=${this._onPresetCreate}
          @preset-delete=${this._onPresetDelete}
          @event-select=${this._onEventSelect}
        >
          ${this._loading
            ? html`<div class="loading">Loading...</div>`
            : this._renderView()}
        </div>
        ${this._renderDetailDrawer()}
      </div>
      ${this._renderBottomNav()}
      ${this._showAddDialog ? this._renderAddDialog() : nothing}
      <calee-event-dialog
        .event=${this._editEvent}
        .calendars=${this._rawCalendars}
        .defaults=${this._eventDialogDefaults}
        ?open=${this._showEventDialog}
        @event-save=${this._onEventSave}
        @event-delete=${this._onEventDelete}
        @dialog-close=${this._onDialogClose}
      ></calee-event-dialog>
      <calee-template-picker
        .templates=${this._templates}
        .selectedDate=${this._templatePickerDate || this._currentDate}
        .selectedTime=${this._templatePickerTime}
        ?open=${this._showTemplatePicker}
        @template-select=${this._onTemplateSelect}
        @custom-event=${this._onCustomEvent}
        @quick-add-task=${this._onQuickAddTask}
        @quick-add-shopping=${this._onQuickAddShopping}
        @manage-templates=${this._onManageTemplates}
        @dialog-close=${this._onDialogClose}
      ></calee-template-picker>
      <calee-template-manager
        .templates=${this._templates}
        .calendars=${this._rawCalendars}
        .hass=${this.hass}
        ?open=${this._showTemplateManager}
        @template-created=${this._onTemplateChanged}
        @template-deleted=${this._onTemplateChanged}
        @dialog-close=${this._onManagerClose}
      ></calee-template-manager>
      <calee-settings-dialog
        .hass=${this.hass}
        ?open=${this._showSettings}
        @settings-changed=${this._onSettingsChanged}
        @dialog-close=${this._onSettingsClose}
      ></calee-settings-dialog>
      <calee-deleted-items
        .hass=${this.hass}
        .calendars=${this._rawCalendars}
        .lists=${this._lists}
        ?open=${this._showDeletedItems}
        @dialog-close=${this._onDeletedItemsClose}
      ></calee-deleted-items>
      <calee-activity-feed
        .hass=${this.hass}
        ?open=${this._showActivityFeed}
        @dialog-close=${this._onActivityFeedClose}
      ></calee-activity-feed>
      <calee-routine-manager
        .hass=${this.hass}
        .routines=${this._routines}
        .templates=${this._templates}
        ?open=${this._showRoutineManager}
        @routine-changed=${this._onRoutineChanged}
        @dialog-close=${this._onRoutineManagerClose}
      ></calee-routine-manager>
      <calee-calendar-manager
        .hass=${this.hass}
        .calendars=${this._rawCalendars}
        .lists=${this._lists}
        ?open=${this._showCalendarManager}
        @calendar-changed=${this._onCalendarManagerChanged}
        @dialog-close=${this._onCalendarManagerClose}
      ></calee-calendar-manager>
      <calee-data-center
        .hass=${this.hass}
        .events=${this._events}
        .tasks=${this._tasks}
        .calendars=${this._rawCalendars}
        .lists=${this._lists}
        .templates=${this._templates}
        .routines=${this._routines}
        ?open=${this._showDataCenter}
        @dialog-close=${this._onDataCenterClose}
      ></calee-data-center>
      ${this._showRecurringActionDialog ? this._renderRecurringActionDialog() : nothing}
    `;
  }

  // ── Header ───────────────────────────────────────────────────────

  private _renderHeader() {
    const showDateNav = DATE_VIEWS.includes(this._currentView);
    return html`
      <div class="header">
        <div class="header-left">
          <button
            class="hamburger"
            @click=${this._toggleDrawer}
            aria-label="Toggle sidebar"
          >&#9776;</button>
          <span class="title">Calee</span>
        </div>

        <div class="header-tabs">
          ${TAB_VIEWS.map(
            (v) => html`
              <button
                class="view-tab"
                ?active=${this._currentView === v}
                @click=${() => this._navigate(v)}
              >${v}</button>
            `
          )}
        </div>

        ${showDateNav ? html`
          <div class="header-date-nav">
            <button class="date-nav-btn" @click=${this._onPrev} aria-label="Previous">&lsaquo;</button>
            <button class="today-btn" @click=${this._onToday}>Today</button>
            <button class="date-nav-btn" @click=${this._onNext} aria-label="Next">&rsaquo;</button>
            <span class="date-label">${formatDateLabel(this._currentView, this._currentDate)}</span>
          </div>
        ` : html`<div class="header-date-nav"></div>`}

        <button class="settings-cog" @click=${this._openSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
          </svg>
        </button>
      </div>
    `;
  }

  // ── Sidebar ──────────────────────────────────────────────────────

  private _renderSidebarBackdrop() {
    return html`
      <div
        class="sidebar-backdrop ${this._drawerOpen ? "visible" : ""}"
        @click=${this._closeDrawer}
      ></div>
    `;
  }

  private _renderSidebar() {
    return html`
      <div class="sidebar ${this._drawerOpen ? "open" : ""} ${this._sidebarCollapsed ? "collapsed" : ""}">
        <button
          class="sidebar-collapse-btn"
          @click=${() => { this._sidebarCollapsed = !this._sidebarCollapsed; }}
          title="${this._sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
          aria-label="${this._sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}"
          aria-expanded="${(!this._sidebarCollapsed).toString()}"
          aria-pressed="${this._sidebarCollapsed.toString()}"
        >
          ${this._sidebarCollapsed ? "\u25B6" : "\u25C0"}
        </button>
        <!-- Add button -->
        <button class="sidebar-add-btn" @click=${this._onSidebarAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add event
        </button>

        <!-- Navigation -->
        <div class="sidebar-nav">
          <button
            class="nav-item"
            ?active=${this._currentView === "tasks"}
            @click=${() => this._navigate("tasks")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"></path>
            </svg>
            Inbox
          </button>

          <button
            class="nav-item"
            ?active=${this._currentView === "day"}
            @click=${() => this._navigate("day", todayISO())}
          >
            <div class="nav-calendar-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span class="date-num">${new Date().getDate()}</span>
            </div>
            Today
          </button>

          <button
            class="nav-item"
            ?active=${this._currentView === "agenda"}
            @click=${() => this._navigate("agenda")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="8" y1="14" x2="16" y2="14"></line>
              <line x1="8" y1="18" x2="12" y2="18"></line>
            </svg>
            Upcoming
          </button>
        </div>

        <!-- Calendars -->
        <div class="sidebar-section">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 12px 6px;">
            <h3 class="sidebar-heading" style="padding:0;margin:0;">Calendars</h3>
            <button
              style="all:unset;font-size:11px;color:var(--primary-color,#03a9f4);cursor:pointer;font-weight:500;"
              @click=${() => { this._showCalendarManager = true; }}
            >Manage</button>
          </div>
          ${this._calendars.length === 0
            ? html`<div style="font-size:13px;color:var(--secondary-text-color,#999);padding:6px 12px;">No calendars loaded</div>`
            : this._calendars.map(
                (cal) => html`
                  <div
                    class="calendar-item"
                    @click=${() => this._toggleCalendar(cal.id)}
                  >
                    <div
                      class="calendar-dot ${cal.visible ? "" : "hidden"}"
                      style="--cal-color: ${cal.color}"
                    ></div>
                    <span class="calendar-name">${cal.name}</span>
                    ${this._rawCalendars.find((rc) => rc.id === cal.id)?.is_private
                      ? html`<svg viewBox="0 0 24 24" fill="none" stroke="var(--secondary-text-color,#999)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;margin-left:auto;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>`
                      : nothing}
                  </div>
                `
              )}
        </div>

        <!-- Lists -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Lists</h3>
          ${this._lists.length === 0
            ? html`<div style="font-size:13px;color:var(--secondary-text-color,#999);padding:6px 12px;">No lists loaded</div>`
            : this._lists.map(
                (lst) => html`
                  <div
                    class="list-item"
                    ?active=${this._currentView === "tasks" && lst.list_type === "standard"
                      || this._currentView === "shopping" && lst.list_type === "shopping"}
                    @click=${() =>
                      this._navigate(
                        lst.list_type === "shopping" ? "shopping" : "tasks"
                      )}
                  >
                    ${lst.list_type === "shopping"
                      ? html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="9" cy="21" r="1"></circle>
                          <circle cx="20" cy="21" r="1"></circle>
                          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"></path>
                        </svg>`
                      : html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>`
                    }
                    <span>${lst.name}</span>
                    ${lst.is_private
                      ? html`<svg viewBox="0 0 24 24" fill="none" stroke="var(--secondary-text-color,#999)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;margin-left:auto;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>`
                      : nothing}
                  </div>
                `
              )}
        </div>

        <!-- Routines -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Routines</h3>
          ${this._routines.map(
            (r) => html`
              <button
                class="nav-item nav-item-muted"
                @click=${() => this._executeRoutine(r.id)}
                title="${r.description || `Run ${r.name}`}"
              >
                <span style="font-size:18px;width:20px;text-align:center;flex-shrink:0;">${r.emoji || "\u26A1"}</span>
                <span>${r.name}</span>
              </button>
            `,
          )}
          <button
            class="nav-item nav-item-muted"
            @click=${() => { this._showRoutineManager = true; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path>
            </svg>
            Manage routines
          </button>
        </div>

        <!-- Smart Views -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Smart Views</h3>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "smart" && this._smartSubTab === "before-shift"}
            @click=${() => { this._smartSubTab = "before-shift"; this._navigate("smart"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Before next shift</span>
          </button>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "smart" && this._smartSubTab === "weekend"}
            @click=${() => { this._smartSubTab = "weekend"; this._navigate("smart"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
            <span>This weekend</span>
          </button>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "smart" && this._smartSubTab === "budget"}
            @click=${() => { this._smartSubTab = "budget"; this._navigate("smart"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
            </svg>
            <span>Budget watch</span>
          </button>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "smart" && this._smartSubTab === "overdue"}
            @click=${() => { this._smartSubTab = "overdue"; this._navigate("smart"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Overdue</span>
          </button>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "smart" && this._smartSubTab === "conflicts"}
            @click=${() => { this._smartSubTab = "conflicts"; this._navigate("smart"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>Conflicts${this._conflicts.length > 0 ? ` (${this._conflicts.length})` : ""}</span>
          </button>
        </div>

        <!-- More: Year, Recently Deleted, Activity & Data Center -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">More</h3>
          <button
            class="nav-item nav-item-muted"
            ?active=${this._currentView === "year"}
            @click=${() => this._navigate("year", todayISO())}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="3" y1="16" x2="21" y2="16"></line>
              <line x1="9" y1="4" x2="9" y2="22"></line>
              <line x1="15" y1="4" x2="15" y2="22"></line>
            </svg>
            Year
          </button>
          <button
            class="nav-item nav-item-muted"
            @click=${this._openDeletedItems}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            Recently Deleted
          </button>
          <button
            class="nav-item nav-item-muted"
            @click=${this._openActivityFeed}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Activity
          </button>
          <button
            class="nav-item nav-item-muted"
            @click=${() => { this._showDataCenter = true; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            Data Center
          </button>
        </div>

        <!-- Conflicts -->
        ${this._conflicts.length > 0 ? html`
          <div class="sidebar-section">
            <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning-color,#ff9800)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0;">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span style="font-size:13px;color:var(--warning-color,#ff9800);font-weight:500;">${this._conflicts.length} conflict${this._conflicts.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        ` : nothing}

        <!-- Shift cards -->
        <div class="sidebar-cards">
          <calee-next-shift
            .nextShift=${this._nextShift}
          ></calee-next-shift>
        </div>

        <!-- Upcoming events (all calendars) -->
        ${this._upcomingEvents.length > 0 ? html`
          <div class="sidebar-upcoming">
            <div class="section-label">Upcoming</div>
            ${this._upcomingEvents.map((ev) => {
              const cal = this._calendarMap.get(ev.calendar_id);
              const calColor = cal?.color ?? "#64b5f6";
              const t = new Date(ev.start);
              const timeStr = t.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              });
              const now = new Date();
              const isToday =
                t.getFullYear() === now.getFullYear() &&
                t.getMonth() === now.getMonth() &&
                t.getDate() === now.getDate();
              const tom = new Date(now);
              tom.setDate(tom.getDate() + 1);
              const isTomorrow =
                t.getFullYear() === tom.getFullYear() &&
                t.getMonth() === tom.getMonth() &&
                t.getDate() === tom.getDate();
              const dayLabel = isToday
                ? ""
                : isTomorrow
                  ? "Tmrw "
                  : `${t.toLocaleDateString(undefined, { weekday: "short" })} `;
              return html`
                <div class="upcoming-item">
                  <span class="dot" style="background: ${calColor}"></span>
                  <span class="upcoming-title">${ev.title}</span>
                  <span class="upcoming-time">${dayLabel}${timeStr}</span>
                </div>
              `;
            })}
          </div>
        ` : nothing}
      </div>
    `;
  }

  // ── Detail Drawer (desktop) ──────────────────────────────────────

  private _renderDetailDrawer() {
    const open = this._detailDrawerOpen && this._detailItem && !this.narrow;
    return html`
      <div class="detail-drawer ${open ? "" : "closed"}">
        ${open ? this._renderDetailDrawerContent() : nothing}
      </div>
    `;
  }

  private _renderDetailDrawerContent() {
    if (!this._detailItem) return nothing;

    if (this._detailItemType === "event") {
      return this._renderEventDetail(this._detailItem as PlannerEvent);
    }
    return this._renderTaskDetail(this._detailItem as PlannerTask);
  }

  private _renderEventDetail(event: PlannerEvent) {
    const cal = this._calendarMap.get(event.calendar_id);
    const start = new Date(event.start);
    const end = new Date(event.end);

    // Check if this event has any conflicts.
    const eventConflicts = this._conflicts.filter(
      (c) => c.eventA.id === event.id || c.eventB.id === event.id,
    );
    const conflictNames = eventConflicts.map((c) => {
      const other = c.eventA.id === event.id ? c.eventB : c.eventA;
      return other.title;
    });
    const dateOpts: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
    };

    // Find linked tasks for this event
    const linkedTasks = this._tasks.filter(
      (t) => t.related_event_id === event.id && !t.deleted_at,
    );

    return html`
      <div class="drawer-header">
        <h3>Event</h3>
        <button class="drawer-close-btn" @click=${this._closeDetailDrawer} aria-label="Close">&times;</button>
      </div>

      ${conflictNames.length > 0 ? html`
        <div style="background:color-mix(in srgb,var(--warning-color,#ff9800) 12%,transparent);border:1px solid var(--warning-color,#ff9800);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--primary-text-color,#212121);">
          <strong style="color:var(--warning-color,#ff9800);">Conflict:</strong> Overlaps with ${conflictNames.join(", ")}
        </div>
      ` : nothing}

      <div class="drawer-field">
        <div class="drawer-field-label">Title</div>
        <div class="drawer-field-value">${event.title}</div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">Calendar</div>
        <div class="drawer-field-value">
          ${cal ? html`<span style="display:inline-flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${cal.color};display:inline-block;"></span>
            ${cal.name}
          </span>` : html`<span class="muted">Unknown</span>`}
        </div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">Start</div>
        <div class="drawer-field-value">
          ${event.all_day
            ? start.toLocaleDateString(undefined, dateOpts)
            : html`${start.toLocaleDateString(undefined, dateOpts)} at ${start.toLocaleTimeString(undefined, timeOpts)}`}
        </div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">End</div>
        <div class="drawer-field-value">
          ${event.all_day
            ? end.toLocaleDateString(undefined, dateOpts)
            : html`${end.toLocaleDateString(undefined, dateOpts)} at ${end.toLocaleTimeString(undefined, timeOpts)}`}
        </div>
      </div>

      ${event.recurrence_rule ? html`
        <div class="drawer-field">
          <div class="drawer-field-label">Recurrence</div>
          <div class="drawer-field-value">
            <span class="drawer-badge">${event.recurrence_rule}</span>
          </div>
        </div>
      ` : nothing}

      <div class="drawer-field">
        <div class="drawer-field-label">Note</div>
        <div class="drawer-field-value ${event.note ? "" : "muted"}">
          ${event.note || "No note"}
        </div>
      </div>

      ${linkedTasks.length > 0 ? html`
        <div class="drawer-field">
          <div class="drawer-field-label">Linked Tasks</div>
          ${linkedTasks.map(
            (t) => html`<div class="drawer-field-value" style="margin-bottom:4px;">
              ${t.completed ? html`<s>${t.title}</s>` : t.title}
            </div>`,
          )}
        </div>
      ` : nothing}

      ${event.is_recurring_instance ? html`
        <div class="drawer-actions" style="flex-wrap:wrap;">
          <button class="drawer-btn drawer-btn-edit" @click=${() => this._onEditThisOccurrence(event)}>Edit this occurrence</button>
          <button class="drawer-btn drawer-btn-edit" style="background:var(--secondary-text-color,#727272);" @click=${() => this._onEditAllOccurrences(event)}>Edit all</button>
          <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDeleteThisOccurrence(event)}>Delete this occurrence</button>
          <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDeleteAllOccurrences(event)}>Delete all</button>
        </div>
      ` : html`
        <div class="drawer-actions">
          <button class="drawer-btn drawer-btn-edit" @click=${() => this._onDrawerEditEvent(event)}>Edit</button>
          <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDrawerDeleteEvent(event)}>Delete</button>
        </div>
      `}
    `;
  }

  private _renderTaskDetail(task: PlannerTask) {
    const list = this._lists.find((l) => l.id === task.list_id);
    // Find linked event for this task
    const linkedEvent = task.related_event_id
      ? this._events.find((e) => e.id === task.related_event_id)
      : null;

    return html`
      <div class="drawer-header">
        <h3>Task</h3>
        <button class="drawer-close-btn" @click=${this._closeDetailDrawer} aria-label="Close">&times;</button>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">Title</div>
        <div class="drawer-field-value">${task.completed ? html`<s>${task.title}</s>` : task.title}</div>
      </div>

      <div class="drawer-field">
        <div class="drawer-field-label">List</div>
        <div class="drawer-field-value">${list?.name ?? task.list_id}</div>
      </div>

      ${task.due ? html`
        <div class="drawer-field">
          <div class="drawer-field-label">Due Date</div>
          <div class="drawer-field-value">
            ${new Date(task.due + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      ` : nothing}

      ${task.recurrence_rule ? html`
        <div class="drawer-field">
          <div class="drawer-field-label">Recurrence</div>
          <div class="drawer-field-value">
            <span class="drawer-badge">${task.recurrence_rule}</span>
          </div>
        </div>
      ` : nothing}

      <div class="drawer-field">
        <div class="drawer-field-label">Note</div>
        <div class="drawer-field-value ${task.note ? "" : "muted"}">
          ${task.note || "No note"}
        </div>
      </div>

      ${linkedEvent ? html`
        <div class="drawer-field">
          <div class="drawer-field-label">Linked Event</div>
          <div class="drawer-field-value">${linkedEvent.title}</div>
        </div>
      ` : nothing}

      <div class="drawer-actions">
        <button class="drawer-btn drawer-btn-edit" @click=${() => this._onDrawerEditTask(task)}>Open in Tasks</button>
        <button class="drawer-btn drawer-btn-delete" @click=${() => this._onDrawerDeleteTask(task)}>Delete</button>
      </div>
    `;
  }

  private _openDetailDrawer(item: PlannerEvent | PlannerTask, type: "event" | "task"): void {
    this._detailItem = item;
    this._detailItemType = type;
    this._detailDrawerOpen = true;
  }

  private _closeDetailDrawer(): void {
    this._detailDrawerOpen = false;
    this._detailItem = null;
    this._detailItemType = null;
  }

  private _onDrawerEditEvent(event: PlannerEvent): void {
    this._closeDetailDrawer();
    this._editEvent = event;
    this._showEventDialog = true;
  }

  private async _onDrawerDeleteEvent(event: PlannerEvent): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/delete_event",
        event_id: event.id,
      });
      this._events = this._events.filter((ev) => ev.id !== event.id);
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }

  private _onDrawerEditTask(task: PlannerTask): void {
    this._closeDetailDrawer();
    window.location.hash = `#/tasks/${task.id}`;
  }

  private async _onDrawerDeleteTask(task: PlannerTask): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/delete_task",
        task_id: task.id,
      });
      this._tasks = this._tasks.filter((t) => t.id !== task.id);
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  // ── Recurring event actions ────────────────────────────────────────

  /** Extract the occurrence date from a recurring instance ID like "{parentId}_{YYYY-MM-DD}". */
  private _getOccurrenceDate(event: PlannerEvent): string {
    const parentId = event.parent_event_id;
    if (parentId && event.id.startsWith(parentId + "_")) {
      return event.id.slice(parentId.length + 1);
    }
    // Fallback: extract from the event start.
    return event.start.slice(0, 10);
  }

  /** Edit this occurrence: create standalone event and add exception to parent. */
  private async _onEditThisOccurrence(event: PlannerEvent): Promise<void> {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    const occDate = this._getOccurrenceDate(event);
    this._closeDetailDrawer();

    // Open the event dialog with the occurrence data pre-filled for editing.
    // The save will create a standalone event via edit_event_occurrence.
    const standalone: PlannerEvent = {
      ...event,
      id: "", // No ID yet — will be created
      recurrence_rule: null,
      exceptions: [],
    };
    // Store reference to parent for the save handler.
    (standalone as any)._occurrenceParentId = parentId;
    (standalone as any)._occurrenceDate = occDate;
    this._editEvent = standalone;
    this._showEventDialog = true;
  }

  /** Edit all occurrences: open the parent event for editing. */
  private _onEditAllOccurrences(event: PlannerEvent): void {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    // Find the parent in raw events (it may not be in expanded list).
    // We'll load it fresh.
    this._closeDetailDrawer();
    this._loadParentAndEdit(parentId);
  }

  private async _loadParentAndEdit(parentId: string): Promise<void> {
    // The parent event might not be in the current expanded events list.
    // Try to find it, or reload all events first.
    try {
      const allEvents = (await this.hass.callWS({
        type: "calee/events",
      })) as PlannerEvent[];
      const parent = allEvents.find((e) => e.id === parentId);
      if (parent) {
        this._editEvent = parent;
        this._showEventDialog = true;
      }
    } catch {
      console.error("Failed to load parent event");
    }
  }

  /** Delete this occurrence: add exception to parent without creating replacement. */
  private async _onDeleteThisOccurrence(event: PlannerEvent): Promise<void> {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    const occDate = this._getOccurrenceDate(event);
    try {
      await this.hass.callWS({
        type: "calee/add_event_exception",
        event_id: parentId,
        date: occDate,
      });
      // Remove the virtual instance from local state.
      this._events = this._events.filter((ev) => ev.id !== event.id);
      this._recomputeConflicts();
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete occurrence:", err);
    }
  }

  /** Delete all occurrences: soft-delete the parent event. */
  private async _onDeleteAllOccurrences(event: PlannerEvent): Promise<void> {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    try {
      await this.hass.callWS({
        type: "calee/delete_event",
        event_id: parentId,
      });
      // Remove all instances from local state.
      this._events = this._events.filter(
        (ev) => ev.id !== parentId && !(ev.parent_event_id === parentId),
      );
      this._recomputeConflicts();
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete all occurrences:", err);
    }
  }

  // ── View Area ────────────────────────────────────────────────────

  private _renderView() {
    const selectedDate = new Date(this._currentDate + "T00:00:00");
    const calendarMap = this._calendarMap;
    const enabledIds = this._enabledIds;

    switch (this._currentView) {
      case "month":
        return html`<calee-month-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
          .templates=${this._templates}
          .tasks=${this._tasks}
          .conflicts=${this._conflicts}
          .weekStartsMonday=${this._settingsWeekStart === "monday"}
          ?narrow=${this.narrow}
        ></calee-month-view>`;

      case "week":
        return html`<calee-week-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
          .templates=${this._templates}
          .tasks=${this._tasks}
          .weekStartsMonday=${this._settingsWeekStart === "monday"}
          ?narrow=${this.narrow}
        ></calee-week-view>`;

      case "day":
        return html`<calee-day-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
        ></calee-day-view>`;

      case "year":
        return html`<calee-year-view
          .events=${this._events}
          .calendars=${calendarMap}
          .enabledCalendarIds=${enabledIds}
          .selectedDate=${selectedDate}
          @day-click=${this._onYearDayClick}
        ></calee-year-view>`;

      case "agenda":
        return html`<calee-agenda-view
          .events=${this._events}
          .calendars=${calendarMap}
        ></calee-agenda-view>`;

      case "tasks":
        return html`<calee-tasks-view
          .tasks=${this._standardTasks}
          .lists=${this._lists.filter((l) => l.list_type !== "shopping")}
          .presets=${this._presets.filter((p) => p.list_id !== "shopping")}
          ?narrow=${this.narrow}
        ></calee-tasks-view>`;

      case "shopping": {
        const shoppingList = this._lists.find((l) => l.list_type === "shopping");
        return html`<calee-shopping-view
          .tasks=${this._shoppingTasks}
          .presets=${this._presets.filter((p) => {
            return shoppingList ? p.list_id === shoppingList.id : p.list_id === "shopping";
          })}
          .listId=${shoppingList?.id ?? "shopping"}
          .currency=${this._settingsCurrency}
          .budget=${this._settingsBudget}
          .toastMessage=${this._shoppingToast}
          @toast-shown=${() => { this._shoppingToast = ""; }}
        ></calee-shopping-view>`;
      }

      case "smart":
        return html`<calee-smart-views
          .events=${this._events}
          .tasks=${this._tasks}
          .lists=${this._lists}
          .conflicts=${this._conflicts}
          .calendars=${calendarMap}
          .currency=${this._settingsCurrency}
          .budget=${this._settingsBudget}
          .activeTab=${this._smartSubTab}
          ?narrow=${this.narrow}
        ></calee-smart-views>`;

      default:
        return html`<div class="view-placeholder">
          <div class="inner">
            <div class="label">Unknown view</div>
          </div>
        </div>`;
    }
  }

  // ── Bottom Nav (mobile) ──────────────────────────────────────────

  private _renderBottomNav() {
    const views: { key: ViewType; label: string; icon: string }[] = [
      { key: "week", label: "Week", icon: "M3 4h18v18H3zM3 10h18M3 16h18M8 2v4M16 2v4" },
      { key: "month", label: "Month", icon: "M3 4h18v18H3zM3 10h18M9 4v18M15 4v18" },
      { key: "agenda", label: "Agenda", icon: "M3 4h18v18H3zM3 10h18M8 2v4M16 2v4M8 14h8M8 18h4" },
      { key: "tasks", label: "Tasks", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
      { key: "shopping", label: "Shop", icon: "M9 21a1 1 0 100-2 1 1 0 000 2zM20 21a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" },
    ];

    return html`
      <nav class="bottom-nav">
        ${views.map((v) => html`
          <button
            class="bottom-nav-item"
            ?active=${this._currentView === v.key}
            @click=${() => this._navigate(v.key)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="${v.icon}"></path>
            </svg>
            ${v.label}
          </button>
        `)}
      </nav>
    `;
  }

  // ── Sidebar Add ─────────────────────────────────────────────────

  private _onSidebarAdd(): void {
    this._templatePickerDate = this._currentDate;
    this._templatePickerTime = "";
    this._showTemplatePicker = true;
  }

  // ── View Event Handlers ──────────────────────────────────────────

  /** Handle event-click from calendar views — open detail drawer (desktop) or edit dialog (mobile). */
  private _onEventClick(e: CustomEvent<{ eventId: string }>): void {
    const { eventId } = e.detail;
    const event = this._events.find((ev) => ev.id === eventId);
    if (event) {
      if (this.narrow) {
        // For recurring instances on mobile, show recurring action dialog
        if (event.is_recurring_instance) {
          this._recurringActionEvent = event;
          this._showRecurringActionDialog = true;
        } else {
          this._editEvent = event;
          this._showEventDialog = true;
        }
      } else {
        this._openDetailDrawer(event, "event");
      }
    }
  }

  /** Handle event-select from agenda view — open detail drawer (desktop) or edit dialog (mobile). */
  private _onEventSelect(e: CustomEvent<{ event: PlannerEvent }>): void {
    if (this.narrow) {
      this._editEvent = e.detail.event;
      this._showEventDialog = true;
    } else {
      this._openDetailDrawer(e.detail.event, "event");
    }
  }

  /** Handle task-click from tasks view — open detail drawer (desktop) or inline edit (mobile). */
  private _onTaskClick(e: CustomEvent<{ task: PlannerTask }>): void {
    if (!this.narrow) {
      this._openDetailDrawer(e.detail.task, "task");
    }
    // On mobile, the tasks-view handles inline editing itself
  }

  /** Handle cell-click from calendar views — open the template picker for quick shift creation. */
  private _onCellClick(e: CustomEvent<{ date: string; time?: string }>): void {
    const { date, time } = e.detail;
    this._templatePickerDate = date;
    this._templatePickerTime = time ?? "";
    this._showTemplatePicker = true;
  }

  /** Handle task-complete from tasks/shopping views. */
  private async _onTaskComplete(e: CustomEvent<{ taskId: string }>): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/complete_task",
        task_id: e.detail.taskId,
      });
      // Optimistically mark it completed locally
      this._tasks = this._tasks.map((t) =>
        t.id === e.detail.taskId ? { ...t, completed: true } : t,
      );
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  }

  /** Handle task-uncomplete from shopping view — sets completed=false. */
  private async _onTaskUncomplete(e: CustomEvent<{ taskId: string }>): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/uncomplete_task",
        task_id: e.detail.taskId,
      });
      // Optimistically mark it uncompleted locally
      this._tasks = this._tasks.map((t) =>
        t.id === e.detail.taskId ? { ...t, completed: false } : t,
      );
    } catch (err) {
      console.error("Failed to uncomplete task:", err);
    }
  }

  /** Handle task-delete from swipe-to-delete on tasks/shopping views. */
  private async _onTaskDelete(e: CustomEvent<{ taskId: string }>): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/delete_task",
        task_id: e.detail.taskId,
      });
      // Optimistically remove it locally
      this._tasks = this._tasks.filter((t) => t.id !== e.detail.taskId);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  /** Handle task-price-update from shopping view. */
  private async _onTaskPriceUpdate(
    e: CustomEvent<{ taskId: string; price: number | null; version: number }>,
  ): Promise<void> {
    const { taskId, price, version } = e.detail;
    try {
      const updated = await this.hass.callWS({
        type: "calee/update_task",
        task_id: taskId,
        version,
        price,
      });
      if (updated) {
        this._tasks = this._tasks.map((t) =>
          t.id === taskId ? (updated as PlannerTask) : t,
        );
      }
    } catch (err) {
      console.error("Failed to update task price:", err);
    }
  }

  /** Handle task-quantity-update from shopping view. */
  private async _onTaskQuantityUpdate(
    e: CustomEvent<{ taskId: string; quantity: number; version: number }>,
  ): Promise<void> {
    const { taskId, quantity, version } = e.detail;
    try {
      const updated = await this.hass.callWS({
        type: "calee/update_task",
        task_id: taskId,
        version,
        quantity,
      });
      if (updated) {
        this._tasks = this._tasks.map((t) =>
          t.id === taskId ? (updated as PlannerTask) : t,
        );
      }
    } catch (err) {
      console.error("Failed to update task quantity:", err);
    }
  }

  /** Handle task-unit-update from shopping view. */
  private async _onTaskUnitUpdate(
    e: CustomEvent<{ taskId: string; unit: string; version: number }>,
  ): Promise<void> {
    const { taskId, unit, version } = e.detail;
    try {
      const updated = await this.hass.callWS({
        type: "calee/update_task",
        task_id: taskId,
        version,
        unit,
      });
      if (updated) {
        this._tasks = this._tasks.map((t) =>
          t.id === taskId ? (updated as PlannerTask) : t,
        );
      }
    } catch (err) {
      console.error("Failed to update task unit:", err);
    }
  }

  /** Handle task-quick-add from tasks/shopping views. */
  private async _onTaskQuickAdd(e: CustomEvent<{ title: string; category?: string; due?: string; recurrence_rule?: string; note?: string }>): Promise<void> {
    const listId = this._currentView === "shopping"
      ? (this._lists.find((l) => l.list_type === "shopping")?.id ?? "shopping")
      : (this._lists.find((l) => l.list_type === "standard")?.id ?? "inbox");

    const wsMsg: Record<string, unknown> = {
      type: "calee/create_task",
      list_id: listId,
      title: e.detail.title,
      category: e.detail.category ?? "",
    };
    if (e.detail.due) {
      wsMsg.due = e.detail.due;
    }
    if (e.detail.recurrence_rule) {
      wsMsg.recurrence_rule = e.detail.recurrence_rule;
    }
    if (e.detail.note) {
      wsMsg.note = e.detail.note;
    }

    try {
      const newTask = (await this.hass.callWS(wsMsg)) as PlannerTask | null;
      if (newTask) {
        if (newTask.merged) {
          // Duplicate was merged - update existing task in state
          this._tasks = this._tasks.map((t) =>
            t.id === newTask.id ? newTask : t,
          );
          // Show toast on shopping view
          const qty = newTask.quantity ?? 1;
          this._shoppingToast = `${newTask.title} \u2014 quantity updated to ${qty % 1 === 0 ? qty.toFixed(0) : qty}`;
        } else {
          this._tasks = [...this._tasks, newTask];
        }
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  /** Handle task-update from tasks view (inline edit). */
  private async _onTaskUpdate(e: CustomEvent<{ taskId: string; version: number; title?: string; due?: string; recurrence_rule?: string }>): Promise<void> {
    const wsMsg: Record<string, unknown> = {
      type: "calee/update_task",
      task_id: e.detail.taskId,
      version: e.detail.version,
    };
    if (e.detail.title !== undefined) {
      wsMsg.title = e.detail.title;
    }
    if (e.detail.due !== undefined) {
      wsMsg.due = e.detail.due;
    }
    if (e.detail.recurrence_rule !== undefined) {
      wsMsg.recurrence_rule = e.detail.recurrence_rule;
    }

    try {
      const updated = await this.hass.callWS(wsMsg);
      if (updated) {
        this._tasks = this._tasks.map((t) =>
          t.id === e.detail.taskId ? (updated as PlannerTask) : t,
        );
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  }

  /** Handle preset-add from tasks/shopping views. */
  private async _onPresetAdd(e: CustomEvent<{ presetId: string }>): Promise<void> {
    try {
      const result = (await this.hass.callWS({
        type: "calee/add_from_preset",
        preset_id: e.detail.presetId,
      })) as PlannerTask | null;
      if (result) {
        if (result.merged) {
          this._tasks = this._tasks.map((t) =>
            t.id === result.id ? result : t,
          );
          const qty = result.quantity ?? 1;
          this._shoppingToast = `${result.title} \u2014 quantity updated to ${qty % 1 === 0 ? qty.toFixed(0) : qty}`;
        } else {
          this._tasks = [...this._tasks, result];
        }
      }
    } catch (err) {
      console.error("Failed to add from preset:", err);
    }
  }

  /** Handle preset-create from shopping view. */
  private async _onPresetCreate(
    e: CustomEvent<{ title: string; category: string; icon: string; list_id: string }>,
  ): Promise<void> {
    try {
      const result = await this.hass.callWS({
        type: "calee/create_preset",
        title: e.detail.title,
        list_id: e.detail.list_id,
        category: e.detail.category,
        icon: e.detail.icon,
      });
      if (result) {
        this._presets = [...this._presets, result as import("../store/types.js").TaskPreset];
      }
    } catch (err) {
      console.error("Failed to create preset:", err);
    }
  }

  /** Handle preset-delete from shopping view. */
  private async _onPresetDelete(e: CustomEvent<{ presetId: string }>): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/delete_preset",
        preset_id: e.detail.presetId,
      });
      this._presets = this._presets.filter((p) => p.id !== e.detail.presetId);
    } catch (err) {
      console.error("Failed to delete preset:", err);
    }
  }

  /** Handle quick-add-task from the template picker — create a task with the given date as due date. */
  private async _onQuickAddTask(e: CustomEvent<{ date: string }>): Promise<void> {
    const { date } = e.detail;
    // Ensure tasks are loaded
    if (!this._tasksLoaded) {
      await this._loadTasks();
    }
    const listId = this._lists.find((l) => l.list_type === "standard")?.id ?? "inbox";
    try {
      const newTask = await this.hass.callWS({
        type: "calee/create_task",
        list_id: listId,
        title: "New task",
        due: date,
      });
      if (newTask) {
        this._tasks = [...this._tasks, newTask as PlannerTask];
        // Navigate to tasks view and auto-open editing for the new task
        window.location.hash = `#/tasks/${(newTask as PlannerTask).id}`;
      } else {
        this._navigate("tasks");
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  /** Handle quick-add-shopping from the template picker — create a shopping item. */
  private async _onQuickAddShopping(e: CustomEvent<{ date: string }>): Promise<void> {
    // Ensure tasks are loaded
    if (!this._tasksLoaded) {
      await this._loadTasks();
    }
    const shoppingList = this._lists.find((l) => l.list_type === "shopping");
    const listId = shoppingList?.id ?? "shopping";
    try {
      const newTask = await this.hass.callWS({
        type: "calee/create_task",
        list_id: listId,
        title: "New item",
      });
      if (newTask) {
        this._tasks = [...this._tasks, newTask as PlannerTask];
      }
      // Navigate to shopping view so user can edit the new item
      this._navigate("shopping");
    } catch (err) {
      console.error("Failed to create shopping item:", err);
    }
  }

  /** Handle template-select from the template picker. */
  private async _onTemplateSelect(e: CustomEvent<{ templateId: string; date: string }>): Promise<void> {
    const { templateId, date } = e.detail;
    try {
      const newEvent = await this.hass.callWS({
        type: "calee/add_shift_from_template",
        template_id: templateId,
        date,
      });
      if (newEvent) {
        this._events = [...this._events, newEvent as PlannerEvent];
      }
    } catch (err) {
      console.error("Failed to add shift from template:", err);
    }
  }

  /** Handle custom-event from the template picker — open the event dialog for manual entry. */
  private _onCustomEvent(e: CustomEvent<{ date: string; time?: string }>): void {
    const { date, time } = e.detail;
    // Pick a non-work calendar for events (prefer "Family Shared", then "Personal", then first available)
    const nonWorkCal =
      this._rawCalendars.find((c) => c.id === "family_shared") ??
      this._rawCalendars.find((c) => c.id === "personal") ??
      this._rawCalendars.find((c) => c.id !== "work_shifts") ??
      this._rawCalendars[0];
    this._editEvent = null;
    this._eventDialogDefaults = {
      date,
      time,
      calendar_id: nonWorkCal?.id,
    };
    this._showTemplatePicker = false;
    this._showEventDialog = true;
  }

  /** Handle manage-templates from the template picker — open the template manager. */
  private _onManageTemplates(): void {
    this._showTemplatePicker = false;
    this._showTemplateManager = true;
  }

  /** Handle template-created or template-deleted from the template manager — refresh templates. */
  private async _onTemplateChanged(): Promise<void> {
    try {
      this._templates = (await this.hass.callWS({ type: "calee/templates" })) ?? [];
    } catch {
      // silently handle
    }
  }

  /** Handle dialog-close from the template manager — return to template picker. */
  private _onManagerClose(): void {
    this._showTemplateManager = false;
    // Re-open the template picker so the user sees updated templates
    this._showTemplatePicker = true;
  }

  /** Handle event-save from the event dialog (create or update). */
  private async _onEventSave(e: CustomEvent): Promise<void> {
    const detail = e.detail;
    try {
      // Check if this is an occurrence edit (standalone replacement).
      const occParentId = (this._editEvent as any)?._occurrenceParentId;
      const occDate = (this._editEvent as any)?._occurrenceDate;
      if (occParentId && occDate) {
        // Create standalone replacement via edit_event_occurrence.
        const standalone = await this.hass.callWS({
          type: "calee/edit_event_occurrence",
          event_id: occParentId,
          date: occDate,
          title: detail.title,
          start: detail.start,
          end: detail.end,
          note: detail.note,
          calendar_id: detail.calendar_id,
        });
        if (standalone) {
          // Remove the virtual instance and add the standalone.
          this._events = this._events.filter(
            (ev) => ev.id !== `${occParentId}_${occDate}`,
          );
          this._events = [...this._events, standalone as PlannerEvent];
        }
      } else if (detail.id) {
        // Update existing event
        const updated = await this.hass.callWS({
          type: "calee/update_event",
          event_id: detail.id,
          version: detail.version,
          title: detail.title,
          start: detail.start,
          end: detail.end,
          note: detail.note,
          recurrence_rule: detail.recurrence_rule ?? undefined,
        });
        if (updated) {
          this._events = this._events.map((ev) =>
            ev.id === detail.id ? (updated as PlannerEvent) : ev,
          );
        }
      } else {
        // Create new event
        const created = await this.hass.callWS({
          type: "calee/create_event",
          calendar_id: detail.calendar_id,
          title: detail.title,
          start: detail.start,
          end: detail.end,
          note: detail.note,
          recurrence_rule: detail.recurrence_rule ?? undefined,
          template_id: detail.template_id ?? undefined,
        });
        if (created) {
          this._events = [...this._events, created as PlannerEvent];
        }
      }
      this._recomputeConflicts();
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  }

  /** Handle event-delete from the event dialog. */
  private async _onEventDelete(e: CustomEvent<{ eventId: string }>): Promise<void> {
    const eventId = e.detail.eventId;
    const event = this._events.find((ev) => ev.id === eventId);

    // If this is a recurring instance, show recurring action dialog instead.
    if (event && event.is_recurring_instance) {
      this._recurringActionEvent = event;
      this._showRecurringActionDialog = true;
      return;
    }

    try {
      await this.hass.callWS({
        type: "calee/delete_event",
        event_id: eventId,
      });
      this._events = this._events.filter((ev) => ev.id !== eventId);
      this._recomputeConflicts();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }

  /** Handle dialog-close from event dialog, template picker, or template manager. */
  private _onDialogClose(): void {
    this._showEventDialog = false;
    this._showTemplatePicker = false;
    this._showTemplateManager = false;
    this._showSettings = false;
    this._editEvent = null;
    this._eventDialogDefaults = {};
    this._templatePickerDate = "";
    this._templatePickerTime = "";
  }

  // ── Year View ────────────────────────────────────────────────────

  /** Handle day-click from year view — navigate to week view for that date. */
  private _onYearDayClick(e: CustomEvent<{ date: string }>): void {
    this._navigate("week", e.detail.date);
  }

  // ── Settings ────────────────────────────────────────────────────

  /** Load user settings from the backend via WS. */
  private async _loadSettings(): Promise<void> {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({ type: "calee/get_settings" });
      this._settingsWeekStart = result.week_start ?? "monday";
      this._settingsTimeFormat = result.time_format ?? "12h";
      this._settingsCurrency = result.currency ?? "$";
      this._settingsBudget = result.budget ?? 0;
      this._settingsStrictPrivacy = result.strict_privacy ?? false;
    } catch {
      // Defaults are already set
    }
  }

  private _openSettings(): void {
    this._showSettings = true;
  }

  private _onSettingsClose(): void {
    this._showSettings = false;
  }

  private _onSettingsChanged(_e: CustomEvent): void {
    this._showSettings = false;
    // Reload settings from backend to reflect the saved values
    this._loadSettings();
  }

  // ── Recently Deleted ──────────────────────────────────────────────

  private _openDeletedItems(): void {
    this._showDeletedItems = true;
  }

  private _onDeletedItemsClose(): void {
    this._showDeletedItems = false;
  }

  // ── Activity Feed ─────────────────────────────────────────────────

  private _openActivityFeed(): void {
    this._showActivityFeed = true;
  }

  private _onActivityFeedClose(): void {
    this._showActivityFeed = false;
  }

  // ── Routines ─────────────────────────────────────────────────────

  private async _executeRoutine(routineId: string): Promise<void> {
    if (!this.hass) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await this.hass.callWS({
        type: "calee/execute_routine",
        routine_id: routineId,
        date: today,
      });
      // Refresh data to pick up newly created items
      this._refreshAll();
    } catch (err) {
      console.error("Failed to execute routine:", err);
    }
  }

  private async _onRoutineExecute(e: CustomEvent<{ routineId: string }>): Promise<void> {
    await this._executeRoutine(e.detail.routineId);
  }

  private async _onRoutineChanged(): Promise<void> {
    // Re-fetch routines
    if (!this.hass) return;
    try {
      this._routines = (await this.hass.callWS({ type: "calee/routines" })) ?? [];
    } catch {
      // ignore
    }
  }

  private _onRoutineManagerClose(): void {
    this._showRoutineManager = false;
  }

  // ── Recurring Action Dialog (mobile) ──────────────────────────────

  private _renderRecurringActionDialog() {
    const event = this._recurringActionEvent;
    if (!event) return nothing;

    return html`
      <div class="dialog-backdrop" @click=${this._closeRecurringActionDialog}>
        <div class="dialog-card" @click=${(e: Event) => e.stopPropagation()} style="max-width:360px;">
          <h2 style="font-size:16px;margin:0 0 6px;">Recurring Event</h2>
          <p style="font-size:13px;color:var(--secondary-text-color,#757575);margin:0 0 16px;">${event.title}</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn-save" style="text-align:center;" @click=${() => { this._closeRecurringActionDialog(); this._onEditThisOccurrence(event); }}>Edit this occurrence</button>
            <button class="btn-cancel" style="text-align:center;" @click=${() => { this._closeRecurringActionDialog(); this._onEditAllOccurrences(event); }}>Edit all occurrences</button>
            <button class="btn-cancel" style="text-align:center;color:var(--error-color,#f44336);" @click=${() => { this._closeRecurringActionDialog(); this._onDeleteThisOccurrence(event); }}>Delete this occurrence</button>
            <button class="btn-cancel" style="text-align:center;color:var(--error-color,#f44336);" @click=${() => { this._closeRecurringActionDialog(); this._onDeleteAllOccurrences(event); }}>Delete all occurrences</button>
            <button class="btn-cancel" style="text-align:center;" @click=${this._closeRecurringActionDialog}>Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  private _closeRecurringActionDialog(): void {
    this._showRecurringActionDialog = false;
    this._recurringActionEvent = null;
  }

  // ── Calendar Manager ────────────────────────────────────────────────

  private async _onCalendarManagerChanged(): Promise<void> {
    // Refresh calendars and lists from backend.
    try {
      const [calendars, lists] = await Promise.all([
        this.hass.callWS({ type: "calee/calendars" }),
        this.hass.callWS({ type: "calee/lists" }),
      ]);
      this._rawCalendars = calendars ?? [];
      this._calendars = this._rawCalendars.map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color ?? "#64b5f6",
        visible: this._calendars.find((existing) => existing.id === c.id)?.visible ?? true,
      }));
      this._lists = lists ?? [];
    } catch {
      // ignore
    }
  }

  private _onCalendarManagerClose(): void {
    this._showCalendarManager = false;
  }

  // ── Data Center ──────────────────────────────────────────────────

  private _onDataCenterClose(): void {
    this._showDataCenter = false;
  }

  // ── Quick Add Dialog ──────────────────────────────────────────────

  private _renderAddDialog() {
    const now = new Date();
    const hour = now.getHours();
    const startH = String(hour).padStart(2, "0");
    const endH = String(Math.min(hour + 1, 23)).padStart(2, "0");
    const defaultStart = `${this._currentDate}T${startH}:00`;
    const defaultEnd = `${this._currentDate}T${endH}:00`;

    return html`
      <div class="dialog-backdrop" @click=${this._closeAddDialog}>
        <div class="dialog-card" @click=${(e: Event) => e.stopPropagation()}>
          <h2>New event</h2>
          <form @submit=${this._handleAddSubmit}>
            <label>
              Title
              <input type="text" name="title" required autofocus placeholder="e.g. Early Shift" />
            </label>
            <label>
              Calendar
              <select name="calendar_id">
                ${this._calendars.map(
                  (c) => html`<option value=${c.id}>${c.name}</option>`
                )}
              </select>
            </label>
            <div class="row">
              <label class="flex">
                Start
                <input type="datetime-local" name="start" value=${defaultStart} required />
              </label>
              <label class="flex">
                End
                <input type="datetime-local" name="end" value=${defaultEnd} required />
              </label>
            </div>
            <label>
              Note
              <textarea name="note" rows="2" placeholder="Optional note"></textarea>
            </label>
            <div class="dialog-actions">
              <button type="button" class="btn-cancel" @click=${this._closeAddDialog}>Cancel</button>
              <button type="submit" class="btn-save">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private _closeAddDialog(): void {
    this._showAddDialog = false;
  }

  private async _handleAddSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const title = data.get("title") as string;
    const calendarId = data.get("calendar_id") as string;
    const start = data.get("start") as string;
    const end = data.get("end") as string;
    const note = data.get("note") as string;

    if (!title || !start || !end) return;

    try {
      const created = await this.hass.callWS({
        type: "calee/create_event",
        calendar_id: calendarId,
        title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        note: note || "",
      });
      if (created) {
        this._events = [...this._events, created as PlannerEvent];
      }
      this._showAddDialog = false;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to create event:", err);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-panel": CaleePanel;
  }
}
