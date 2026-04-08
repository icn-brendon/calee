/**
 * Calee -- Main Shell Component
 *
 * Entry point registered as <calee-panel> custom element.
 * Receives hass, narrow, and panel properties from Home Assistant.
 *
 * This is the thin orchestrator that:
 *  - Manages top-level state (currentView, hass, narrow)
 *  - Delegates rendering to page components
 *  - Handles hash routing
 *  - Loads data (settings, initial WS fetch)
 *  - Manages dialogs/sheets (template picker, event dialog, settings)
 *  - Keyboard shortcuts
 *  - Real-time subscription
 */

import { LitElement, html, css, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerStore } from "../store/planner-store.js";
import type {
  Conflict,
  PlannerEvent,
  PlannerCalendar,
  PlannerTask,
  PlannerList,
  Routine,
  ShiftTemplate,
  TaskPreset,
  ViewType,
  CalendarSubView,
  MoreSubView,
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
import "./bottom-nav.js";
import "./left-rail.js";
import "./detail-drawer.js";
import "../pages/home-page.js";
import "../pages/calendar-page.js";
import "../pages/tasks-page.js";
import "../pages/shopping-page.js";
import "../pages/more-page.js";
import "../components/task-edit-sheet.js";
import "../components/undo-snackbar.js";

// ── Types ──────────────────────────────────────────────────────────

interface CalendarToggle {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

// All top-level views for routing
const ALL_VIEWS: ViewType[] = ["home", "calendar", "tasks", "shopping", "more"];

// ── Helpers ────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseHash(): { view: ViewType; date: string; sub?: string } {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");

  // Map legacy view names to new model
  const legacyMap: Record<string, ViewType> = {
    month: "calendar", week: "calendar", day: "calendar", agenda: "calendar",
    year: "more", smart: "more",
  };

  let view: ViewType;
  const rawView = parts[0];
  if (ALL_VIEWS.includes(rawView as ViewType)) {
    view = rawView as ViewType;
  } else if (legacyMap[rawView]) {
    view = legacyMap[rawView];
  } else {
    view = "home";
  }

  const date = parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])
    ? parts[1]
    : todayISO();

  return { view, date, sub: rawView };
}

function buildHash(view: ViewType, _date?: string): string {
  return `#/${view}`;
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

  @state() private _currentView: ViewType = "home";
  @state() private _currentDate: string = todayISO();
  @state() private _calendars: CalendarToggle[] = [];
  @state() private _lists: PlannerList[] = [];
  @state() private _loading = true;

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
  @state() private _settingsReminderCalendars: string[] = ["work_shifts"];
  @state() private _settingsStrictPrivacy = false;

  // ── Detail drawer state ────────────────────────────────────────────
  @state() private _detailDrawerOpen = false;
  @state() private _detailItem: PlannerEvent | PlannerTask | null = null;
  @state() private _detailItemType: "event" | "task" | null = null;

  // ── Dialog state ───────────────────────────────────────────────────
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
  @state() private _showCalendarManager = false;
  @state() private _showDataCenter = false;
  @state() private _showAddDialog = false;
  @state() private _showRecurringActionDialog = false;
  @state() private _recurringActionEvent: PlannerEvent | null = null;

  // ── Smart view sub-tab ─────────────────────────────────────────────
  @state() private _smartSubTab: "before-shift" | "weekend" | "budget" | "overdue" | "conflicts" = "before-shift";

  // ── Conflicts ──────────────────────────────────────────────────────
  @state() private _conflicts: Conflict[] = [];

  // ── Shopping toast ─────────────────────────────────────────────────
  @state() private _shoppingToast = "";

  // ── Task edit sheet ───────────────────────────────────────────────
  @state() private _editSheetTask: PlannerTask | null = null;
  @state() private _editSheetOpen = false;

  // ── Undo snackbar ─────────────────────────────────────────────────
  @state() private _undoAction: { type: "delete"; taskId: string; title: string } | null = null;

  // ── More sub-view (year, smart, etc.) ──────────────────────────────
  @state() private _moreSubView: MoreSubView = "year";

  private _store?: PlannerStore;
  private _hashHandler = this._onHashChange.bind(this);
  private _keyHandler = this._handleKeydown.bind(this);
  private _unsubscribe?: () => void;
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
      await this._loadSettings();
      try {
        const mod = await import("../store/planner-store");
        this._store = new mod.PlannerStore(this.hass);
        await this._store.load();
        this._syncFromStore();
      } catch {
        await this._loadViaWebSocket();
      }
      this._subscribeToChanges();
    } catch (err) {
      console.error("[Calee] Failed to initialise panel:", err);
    } finally {
      this._loading = false;
    }
  }

  updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass") && this._store) {
      this._store.hass = this.hass;
    }
    if (changedProps.has("_currentView") || changedProps.has("_currentDate")) {
      if (!this._loading) {
        this._loadEvents();
        if (!this._tasksLoaded) {
          this._loadTasks();
        }
      }
    }
  }

  // ── Hash Routing ─────────────────────────────────────────────────

  private _applyHash(): void {
    const originalHash = window.location.hash;
    const { view, date } = parseHash();
    this._currentView = view;
    this._currentDate = date;
    if (!originalHash || originalHash !== buildHash(this._currentView)) {
      window.location.hash = buildHash(this._currentView, this._currentDate);
    }
  }

  private _onHashChange(): void {
    this._applyHash();
  }

  private _navigate(view: ViewType): void {
    if (view === "home") {
      this._currentDate = todayISO();
    }
    this._currentView = view;
    window.location.hash = buildHash(view);
  }

  // ── Data Loading ─────────────────────────────────────────────────

  private _syncFromStore(): void {
    if (!this._store) return;
    const store = this._store as any;
    this._rawCalendars = store.calendars ?? [];
    this._calendars = this._rawCalendars.map((c: PlannerCalendar) => ({
      id: c.id, name: c.name, color: c.color, visible: true,
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
        id: c.id, name: c.name, color: c.color ?? "#64b5f6", visible: true,
      }));
      this._lists = lists ?? [];
      this._templates = templates ?? [];
      this._presets = presets ?? [];
      this._routines = (routines as Routine[]) ?? [];
      await this._loadTasks();
    } catch {
      this._rawCalendars = [];
      this._calendars = [];
      this._lists = [];
      this._tasks = [];
      this._templates = [];
      this._presets = [];
      this._routines = [];
    }
    await this._loadEvents();
  }

  private async _loadEvents(): Promise<void> {
    if (!this.hass) return;
    const { start, end } = this._getViewRange();
    try {
      this._events = (await this.hass.callWS({
        type: "calee/expand_recurring_events", start, end,
      })) ?? [];
    } catch {
      try {
        this._events = (await this.hass.callWS({
          type: "calee/events", start, end,
        })) ?? [];
      } catch { /* silently handle */ }
    }
    this._conflicts = this._detectConflicts(this._events);
  }

  private _detectConflicts(events: PlannerEvent[]): Conflict[] {
    const timed = events
      .filter((e) => !e.deleted_at && !e.all_day && e.start && e.end)
      .sort((a, b) => a.start.localeCompare(b.start));
    const conflicts: Conflict[] = [];
    for (let i = 0; i < timed.length; i++) {
      for (let j = i + 1; j < timed.length; j++) {
        const a = timed[i];
        const b = timed[j];
        if (b.start >= a.end) break;
        if (a.calendar_id !== b.calendar_id) {
          conflicts.push({ eventA: a, eventB: b });
        }
      }
    }
    return conflicts;
  }

  private _recomputeConflicts(): void {
    this._conflicts = this._detectConflicts(this._events);
  }

  private async _loadTasks(): Promise<void> {
    if (!this.hass) return;
    try {
      this._tasks = (await this.hass.callWS({ type: "calee/tasks" })) ?? [];
      this._tasksLoaded = true;
    } catch { /* silently handle */ }
  }

  private _getViewRange(): { start: string; end: string } {
    const d = new Date(this._currentDate + "T00:00:00");

    if (this._currentView === "calendar") {
      // Broad range for calendar: 2 months around current date
      const start = new Date(d);
      start.setDate(start.getDate() - 35);
      const end = new Date(d);
      end.setDate(end.getDate() + 45);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      };
    }
    if (this._currentView === "home") {
      // Home shows 3 days + upcoming shifts
      const start = new Date(d);
      start.setDate(start.getDate() - 1);
      const end = new Date(d);
      end.setDate(end.getDate() + 30);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      };
    }
    // Default broad range for tasks / shopping / more
    const start = new Date(d);
    start.setDate(start.getDate() - 30);
    const end = new Date(d);
    end.setDate(end.getDate() + 90);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  private async _subscribeToChanges(): Promise<void> {
    if (!this.hass?.connection) return;
    try {
      this._unsubscribe = await this.hass.connection.subscribeMessage(
        (_event: any) => { this._refreshAll(); },
        { type: "calee/subscribe" },
      );
    } catch { /* subscription may not be available */ }
  }

  private _refreshDebounce: ReturnType<typeof setTimeout> | null = null;

  private _refreshAll(): void {
    if (this._refreshDebounce) clearTimeout(this._refreshDebounce);
    this._refreshDebounce = setTimeout(async () => {
      this._refreshDebounce = null;
      if (this._store) {
        await this._store.refresh();
        this._syncFromStore();
      } else {
        await this._loadViaWebSocket();
      }
      if (!this._store && (this._currentView === "tasks" || this._currentView === "shopping")) {
        await this._loadTasks();
      }
    }, 250);
  }

  // ── Calendar Toggle ──────────────────────────────────────────────

  private _toggleCalendar(id: string): void {
    this._calendars = this._calendars.map((c) =>
      c.id === id ? { ...c, visible: !c.visible } : c,
    );
  }

  // ── Computed helpers ─────────────────────────────────────────────

  private get _calendarMap(): Map<string, PlannerCalendar> {
    const map = new Map<string, PlannerCalendar>();
    for (const c of this._rawCalendars) map.set(c.id, c);
    return map;
  }

  private get _enabledIds(): Set<string> {
    return new Set(this._calendars.filter((c) => c.visible).map((c) => c.id));
  }

  private get _shoppingTasks(): PlannerTask[] {
    const shoppingList = this._lists.find((l) => l.list_type === "shopping");
    if (!shoppingList) return this._tasks.filter((t) => t.list_id === "shopping");
    return this._tasks.filter((t) => t.list_id === shoppingList.id);
  }

  private get _standardTasks(): PlannerTask[] {
    const shoppingIds = new Set(
      this._lists.filter((l) => l.list_type === "shopping").map((l) => l.id),
    );
    return this._tasks.filter((t) => !shoppingIds.has(t.list_id));
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────

  private _isEditableKeyboardTarget(e: KeyboardEvent): boolean {
    const isEditable = (value: EventTarget | null | undefined): boolean => {
      if (!(value instanceof HTMLElement)) return false;
      const tag = value.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || value.isContentEditable;
    };
    if (e.composedPath().some((target) => isEditable(target))) return true;
    let active: Element | null = document.activeElement;
    while (active && active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return isEditable(active);
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (this.narrow) return;
    if (this._isEditableKeyboardTarget(e)) return;

    if (
      this._showEventDialog || this._showTemplatePicker || this._showTemplateManager ||
      this._showSettings || this._showDeletedItems || this._showActivityFeed ||
      this._showRoutineManager || this._showAddDialog || this._showRecurringActionDialog ||
      this._showCalendarManager || this._showDataCenter
    ) {
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

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case "n":
        e.preventDefault();
        this._onSidebarAdd();
        break;
      case "t":
        e.preventDefault();
        this._currentDate = todayISO();
        break;
      case "h":
        e.preventDefault();
        this._navigate("home");
        break;
      case "c":
        e.preventDefault();
        this._navigate("calendar");
        break;
      case "1":
        e.preventDefault();
        this._navigate("tasks");
        break;
      case "2":
        e.preventDefault();
        this._navigate("shopping");
        break;
      case "Escape":
        if (this._detailDrawerOpen) this._closeDetailDrawer();
        break;
    }
  }

  // ── Styles ──────────────────────────────────────────────────────

  static styles = css`
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
    }

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

    .title {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      color: var(--primary-text-color, #212121);
      letter-spacing: 0.2px;
    }

    .spacer { flex: 1; }

    .body {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .main {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: var(--card-background-color, #fff);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
      font-weight: 400;
    }

    :host([narrow]) calee-left-rail {
      display: none;
    }

    :host(:not([narrow])) calee-bottom-nav {
      display: none;
    }

    /* Dialog styles */
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

    .dialog-card .row {
      display: flex;
      gap: 12px;
    }

    .dialog-card .flex { flex: 1; }

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

    .btn-save:hover { opacity: 0.9; }
  `;

  // ── Render ──────────────────────────────────────────────────────

  render() {
    return html`
      <div class="header">
        <span class="title">Calee</span>
        <div class="spacer"></div>
      </div>

      <div class="body">
        <calee-left-rail
          .activeView=${this._currentView}
          .calendars=${this._calendars}
          .rawCalendars=${this._rawCalendars}
          .routines=${this._routines}
          .conflicts=${this._conflicts}
          @nav-change=${this._onNavChange}
          @toggle-calendar=${this._onToggleCalendar}
          @open-more=${this._onOpenMore}
          @routine-execute=${this._onRoutineExecute}
          @open-routine-manager=${() => { this._showRoutineManager = true; }}
          @open-calendar-manager=${() => { this._showCalendarManager = true; }}
          @open-settings=${() => { this._showSettings = true; }}
          @open-template-picker=${this._onSidebarAdd}
        ></calee-left-rail>

        <div class="main"
          @event-click=${this._onEventClick}
          @cell-click=${this._onCellClick}
          @task-click=${this._onTaskClick}
          @task-complete=${this._onTaskComplete}
          @task-uncomplete=${this._onTaskUncomplete}
          @task-delete=${this._onTaskDelete}
          @task-quick-add=${this._onTaskQuickAdd}
          @task-update=${this._onTaskUpdate}
          @task-edit-open=${this._onTaskEditOpen}
          @task-reorder=${this._onTaskReorder}
          @task-price-update=${this._onTaskPriceUpdate}
          @task-quantity-update=${this._onTaskQuantityUpdate}
          @task-unit-update=${this._onTaskUnitUpdate}
          @routine-execute=${this._onRoutineExecute}
          @preset-add=${this._onPresetAdd}
          @preset-create=${this._onPresetCreate}
          @preset-delete=${this._onPresetDelete}
          @event-select=${this._onEventSelect}
          @nav-change=${this._onNavChange}
          @calendar-date-change=${this._onCalendarDateChange}
          @calendar-subview-change=${this._onCalendarSubviewChange}
        >
          ${this._loading
            ? html`<div class="loading">Loading...</div>`
            : this._renderView()}
        </div>

        <calee-detail-drawer
          .item=${this._detailItem}
          .itemType=${this._detailItemType}
          .calendars=${this._rawCalendars}
          .lists=${this._lists}
          .events=${this._events}
          .tasks=${this._tasks}
          .conflicts=${this._conflicts}
          ?open=${this._detailDrawerOpen && !this.narrow}
          @drawer-close=${this._closeDetailDrawer}
          @drawer-edit=${this._onDrawerEdit}
          @drawer-delete=${this._onDrawerDelete}
          @drawer-recurring-action=${this._onDrawerRecurringAction}
        ></calee-detail-drawer>
      </div>

      <calee-task-edit-sheet
        .task=${this._editSheetTask}
        .lists=${this._lists.filter((l) => l.list_type !== "shopping")}
        ?open=${this._editSheetOpen}
        ?narrow=${this.narrow}
        @sheet-close=${this._onEditSheetClose}
        @task-update=${this._onTaskUpdate}
        @task-delete=${this._onTaskDelete}
      ></calee-task-edit-sheet>

      <calee-undo-snackbar
        @undo=${this._onUndoAction}
      ></calee-undo-snackbar>

      <calee-bottom-nav
        .activeView=${this._currentView}
        @nav-change=${this._onNavChange}
        @open-template-picker=${this._onSidebarAdd}
      ></calee-bottom-nav>

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

  // ── View Rendering ──────────────────────────────────────────────

  private _renderView() {
    switch (this._currentView) {
      case "home":
        return html`<calee-home-page
          .events=${this._events}
          .tasks=${this._tasks}
          .calendars=${this._calendarMap}
          .lists=${this._lists}
          .routines=${this._routines}
          .presets=${this._presets}
          .enabledCalendarIds=${this._enabledIds}
          .currentDate=${this._currentDate}
          ?narrow=${this.narrow}
          .currency=${this._settingsCurrency}
          .budget=${this._settingsBudget}
          .weekStart=${this._settingsWeekStart}
        ></calee-home-page>`;

      case "calendar":
        return html`<calee-calendar-page
          .events=${this._events}
          .calendars=${this._calendarMap}
          .enabledCalendarIds=${this._enabledIds}
          .templates=${this._templates}
          .tasks=${this._tasks}
          .conflicts=${this._conflicts}
          ?narrow=${this.narrow}
          ?weekStartsMonday=${this._settingsWeekStart === "monday"}
          .currentDate=${this._currentDate}
        ></calee-calendar-page>`;

      case "tasks":
        return html`<calee-tasks-page
          .tasks=${this._standardTasks}
          .lists=${this._lists}
          .presets=${this._presets}
          ?narrow=${this.narrow}
        ></calee-tasks-page>`;

      case "shopping":
        return html`<calee-shopping-page
          .tasks=${this._tasks}
          .lists=${this._lists}
          .presets=${this._presets}
          .currency=${this._settingsCurrency}
          .budget=${this._settingsBudget}
          .toastMessage=${this._shoppingToast}
          @toast-shown=${() => { this._shoppingToast = ""; }}
        ></calee-shopping-page>`;

      case "more":
        return html`<calee-more-page
          .events=${this._events}
          .tasks=${this._tasks}
          .lists=${this._lists}
          .conflicts=${this._conflicts}
          .calendars=${this._calendarMap}
          .enabledCalendarIds=${this._enabledIds}
          .selectedDate=${new Date(this._currentDate + "T00:00:00")}
          .currency=${this._settingsCurrency}
          .budget=${this._settingsBudget}
          .reminderCalendars=${this._settingsReminderCalendars}
          .initialSubView=${this._moreSubView}
          ?narrow=${this.narrow}
          @day-click=${this._onYearDayClick}
          @more-subview-change=${this._onMoreSubviewChange}
          @deleted=${() => { this._showDeletedItems = true; }}
          @activity=${() => { this._showActivityFeed = true; }}
          @data-center=${() => { this._showDataCenter = true; }}
          @calendar-manager=${() => { this._showCalendarManager = true; }}
          @settings=${() => { this._showSettings = true; }}
        ></calee-more-page>`;

      default:
        return html`<div class="loading">Unknown view</div>`;
    }
  }

  // ── Navigation Event Handlers ──────────────────────────────────

  private _onNavChange(e: CustomEvent<{ view: ViewType }>): void {
    this._navigate(e.detail.view);
  }

  private _onToggleCalendar(e: CustomEvent<{ id: string }>): void {
    this._toggleCalendar(e.detail.id);
  }

  private _onOpenMore(e: CustomEvent<{ sub: MoreSubView }>): void {
    const sub = e.detail.sub;
    switch (sub) {
      case "year":
      case "smart":
        this._moreSubView = sub;
        this._navigate("more");
        break;
      case "data-center":
        this._showDataCenter = true;
        break;
      case "activity":
        this._showActivityFeed = true;
        break;
      case "deleted":
        this._showDeletedItems = true;
        break;
    }
  }

  private _onCalendarDateChange(e: CustomEvent<{ date: string; subView: CalendarSubView }>): void {
    this._currentDate = e.detail.date;
  }

  private _onCalendarSubviewChange(e: CustomEvent<{ subView: CalendarSubView; date: string }>): void {
    this._currentDate = e.detail.date;
  }

  private _onMoreSubviewChange(e: CustomEvent<{ subView: MoreSubView }>): void {
    this._moreSubView = e.detail.subView;
  }

  // ── Sidebar Add ─────────────────────────────────────────────────

  private _onSidebarAdd(): void {
    this._templatePickerDate = this._currentDate;
    this._templatePickerTime = "";
    this._showTemplatePicker = true;
  }

  // ── Detail Drawer ───────────────────────────────────────────────

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

  private _onDrawerEdit(e: CustomEvent<{ item: any; itemType: string }>): void {
    const { item, itemType } = e.detail;
    this._closeDetailDrawer();
    if (itemType === "event") {
      this._editEvent = item;
      this._showEventDialog = true;
    } else {
      window.location.hash = `#/tasks/${item.id}`;
    }
  }

  private async _onDrawerDelete(e: CustomEvent<{ item: any; itemType: string }>): Promise<void> {
    const { item, itemType } = e.detail;
    try {
      if (itemType === "event") {
        await this.hass.callWS({ type: "calee/delete_event", event_id: item.id });
        this._events = this._events.filter((ev) => ev.id !== item.id);
      } else {
        await this.hass.callWS({ type: "calee/delete_task", task_id: item.id });
        this._tasks = this._tasks.filter((t) => t.id !== item.id);
      }
      this._closeDetailDrawer();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  private _onDrawerRecurringAction(
    e: CustomEvent<{ event: PlannerEvent; action: string }>,
  ): void {
    const { event, action } = e.detail;
    this._closeDetailDrawer();
    switch (action) {
      case "edit-this":
        this._onEditThisOccurrence(event);
        break;
      case "edit-all":
        this._onEditAllOccurrences(event);
        break;
      case "delete-this":
        this._onDeleteThisOccurrence(event);
        break;
      case "delete-all":
        this._onDeleteAllOccurrences(event);
        break;
    }
  }

  // ── View Event Handlers ──────────────────────────────────────────

  private _onEventClick(e: CustomEvent<{ eventId: string }>): void {
    const event = this._events.find((ev) => ev.id === e.detail.eventId);
    if (event) {
      if (this.narrow) {
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

  private _onEventSelect(e: CustomEvent<{ event: PlannerEvent }>): void {
    if (this.narrow) {
      this._editEvent = e.detail.event;
      this._showEventDialog = true;
    } else {
      this._openDetailDrawer(e.detail.event, "event");
    }
  }

  private _onTaskClick(e: CustomEvent<{ task: PlannerTask }>): void {
    if (!this.narrow) {
      this._openDetailDrawer(e.detail.task, "task");
    }
  }

  private _onTaskEditOpen(e: CustomEvent<{ task: PlannerTask }>): void {
    this._editSheetTask = e.detail.task;
    this._editSheetOpen = true;
  }

  private _onEditSheetClose(): void {
    this._editSheetOpen = false;
    this._editSheetTask = null;
  }

  private _onCellClick(e: CustomEvent<{ date: string; time?: string }>): void {
    this._templatePickerDate = e.detail.date;
    this._templatePickerTime = e.detail.time ?? "";
    this._showTemplatePicker = true;
  }

  private async _onTaskComplete(e: CustomEvent<{ taskId: string }>): Promise<void> {
    try {
      await this.hass.callWS({ type: "calee/complete_task", task_id: e.detail.taskId });
      this._tasks = this._tasks.map((t) =>
        t.id === e.detail.taskId ? { ...t, completed: true } : t,
      );
    } catch (err) { console.error("Failed to complete task:", err); }
  }

  private async _onTaskUncomplete(e: CustomEvent<{ taskId: string }>): Promise<void> {
    try {
      await this.hass.callWS({ type: "calee/uncomplete_task", task_id: e.detail.taskId });
      this._tasks = this._tasks.map((t) =>
        t.id === e.detail.taskId ? { ...t, completed: false } : t,
      );
    } catch (err) { console.error("Failed to uncomplete task:", err); }
  }

  private async _onTaskDelete(e: CustomEvent<{ taskId: string; title?: string }>): Promise<void> {
    const { taskId, title } = e.detail;
    try {
      await this.hass.callWS({ type: "calee/delete_task", task_id: taskId });
      this._tasks = this._tasks.filter((t) => t.id !== taskId);
      // Show undo snackbar
      this._undoAction = { type: "delete", taskId, title: title ?? "Task" };
      const snackbar = this.shadowRoot?.querySelector("calee-undo-snackbar") as any;
      snackbar?.show(`"${title ?? "Task"}" deleted`);
    } catch (err) { console.error("Failed to delete task:", err); }
  }

  private async _onTaskReorder(e: CustomEvent<{ taskId: string; beforeTaskId: string }>): Promise<void> {
    const { taskId, beforeTaskId } = e.detail;
    // Compute new position order
    const targetIdx = this._tasks.findIndex((t) => t.id === beforeTaskId);
    if (targetIdx < 0) return;
    const task = this._tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic reorder in local state
    const reordered = this._tasks.filter((t) => t.id !== taskId);
    const insertIdx = reordered.findIndex((t) => t.id === beforeTaskId);
    reordered.splice(insertIdx, 0, { ...task, position: insertIdx });
    this._tasks = reordered.map((t, i) => ({ ...t, position: i }));

    try {
      await this.hass.callWS({
        type: "calee/reorder_task",
        task_id: taskId,
        before_task_id: beforeTaskId,
        version: task.version,
      });
    } catch (err) {
      console.error("Failed to reorder task:", err);
      // Reload tasks on failure
      this._loadTasks();
    }
  }

  private async _onUndoAction(): Promise<void> {
    if (!this._undoAction) return;
    if (this._undoAction.type === "delete") {
      try {
        const restored = await this.hass.callWS({
          type: "calee/restore_task",
          task_id: this._undoAction.taskId,
        });
        if (restored) {
          this._tasks = [...this._tasks, restored as PlannerTask];
        }
      } catch (err) {
        console.error("Failed to undo delete:", err);
      }
    }
    this._undoAction = null;
  }

  private async _onTaskPriceUpdate(
    e: CustomEvent<{ taskId: string; price: number | null; version: number }>,
  ): Promise<void> {
    const { taskId, price, version } = e.detail;
    try {
      const updated = await this.hass.callWS({ type: "calee/update_task", task_id: taskId, version, price });
      if (updated) this._tasks = this._tasks.map((t) => t.id === taskId ? (updated as PlannerTask) : t);
    } catch (err) { console.error("Failed to update task price:", err); }
  }

  private async _onTaskQuantityUpdate(
    e: CustomEvent<{ taskId: string; quantity: number; version: number }>,
  ): Promise<void> {
    const { taskId, quantity, version } = e.detail;
    try {
      const updated = await this.hass.callWS({ type: "calee/update_task", task_id: taskId, version, quantity });
      if (updated) this._tasks = this._tasks.map((t) => t.id === taskId ? (updated as PlannerTask) : t);
    } catch (err) { console.error("Failed to update task quantity:", err); }
  }

  private async _onTaskUnitUpdate(
    e: CustomEvent<{ taskId: string; unit: string; version: number }>,
  ): Promise<void> {
    const { taskId, unit, version } = e.detail;
    try {
      const updated = await this.hass.callWS({ type: "calee/update_task", task_id: taskId, version, unit });
      if (updated) this._tasks = this._tasks.map((t) => t.id === taskId ? (updated as PlannerTask) : t);
    } catch (err) { console.error("Failed to update task unit:", err); }
  }

  private async _onTaskQuickAdd(e: CustomEvent<{ title: string; category?: string; due?: string; recurrence_rule?: string; note?: string }>): Promise<void> {
    const listId = this._currentView === "shopping"
      ? (this._lists.find((l) => l.list_type === "shopping")?.id ?? "shopping")
      : (this._lists.find((l) => l.list_type === "standard")?.id ?? "inbox");

    const wsMsg: Record<string, unknown> = {
      type: "calee/create_task", list_id: listId, title: e.detail.title, category: e.detail.category ?? "",
    };
    if (e.detail.due) wsMsg.due = e.detail.due;
    if (e.detail.recurrence_rule) wsMsg.recurrence_rule = e.detail.recurrence_rule;
    if (e.detail.note) wsMsg.note = e.detail.note;

    try {
      const newTask = (await this.hass.callWS(wsMsg)) as PlannerTask | null;
      if (newTask) {
        if (newTask.merged) {
          this._tasks = this._tasks.map((t) => t.id === newTask.id ? newTask : t);
          const qty = newTask.quantity ?? 1;
          this._shoppingToast = `${newTask.title} \u2014 quantity updated to ${qty % 1 === 0 ? qty.toFixed(0) : qty}`;
        } else {
          this._tasks = [...this._tasks, newTask];
        }
      }
    } catch (err) { console.error("Failed to create task:", err); }
  }

  private async _onTaskUpdate(e: CustomEvent<{ taskId: string; version: number; title?: string; due?: string; recurrence_rule?: string; note?: string; list_id?: string; category?: string }>): Promise<void> {
    const wsMsg: Record<string, unknown> = {
      type: "calee/update_task", task_id: e.detail.taskId, version: e.detail.version,
    };
    if (e.detail.title !== undefined) wsMsg.title = e.detail.title;
    if (e.detail.due !== undefined) wsMsg.due = e.detail.due;
    if (e.detail.recurrence_rule !== undefined) wsMsg.recurrence_rule = e.detail.recurrence_rule;
    if (e.detail.note !== undefined) wsMsg.note = e.detail.note;
    if (e.detail.list_id !== undefined) wsMsg.list_id = e.detail.list_id;
    if (e.detail.category !== undefined) wsMsg.category = e.detail.category;

    try {
      const updated = await this.hass.callWS(wsMsg);
      if (updated) this._tasks = this._tasks.map((t) => t.id === e.detail.taskId ? (updated as PlannerTask) : t);
    } catch (err) { console.error("Failed to update task:", err); }
  }

  private async _onPresetAdd(e: CustomEvent<{ presetId: string }>): Promise<void> {
    try {
      const result = (await this.hass.callWS({
        type: "calee/add_from_preset", preset_id: e.detail.presetId,
      })) as PlannerTask | null;
      if (result) {
        if (result.merged) {
          this._tasks = this._tasks.map((t) => t.id === result.id ? result : t);
          const qty = result.quantity ?? 1;
          this._shoppingToast = `${result.title} \u2014 quantity updated to ${qty % 1 === 0 ? qty.toFixed(0) : qty}`;
        } else {
          this._tasks = [...this._tasks, result];
        }
      }
    } catch (err) { console.error("Failed to add from preset:", err); }
  }

  private async _onPresetCreate(
    e: CustomEvent<{ title: string; category: string; icon: string; list_id: string }>,
  ): Promise<void> {
    try {
      const result = await this.hass.callWS({
        type: "calee/create_preset", title: e.detail.title,
        list_id: e.detail.list_id, category: e.detail.category, icon: e.detail.icon,
      });
      if (result) this._presets = [...this._presets, result as TaskPreset];
    } catch (err) { console.error("Failed to create preset:", err); }
  }

  private async _onPresetDelete(e: CustomEvent<{ presetId: string }>): Promise<void> {
    try {
      await this.hass.callWS({ type: "calee/delete_preset", preset_id: e.detail.presetId });
      this._presets = this._presets.filter((p) => p.id !== e.detail.presetId);
    } catch (err) { console.error("Failed to delete preset:", err); }
  }

  // ── Template / Event Dialog Handlers ──────────────────────────

  private async _onQuickAddTask(e: CustomEvent<{ date: string }>): Promise<void> {
    if (!this._tasksLoaded) await this._loadTasks();
    const listId = this._lists.find((l) => l.list_type === "standard")?.id ?? "inbox";
    try {
      const newTask = await this.hass.callWS({ type: "calee/create_task", list_id: listId, title: "New task", due: e.detail.date });
      if (newTask) {
        this._tasks = [...this._tasks, newTask as PlannerTask];
        window.location.hash = `#/tasks/${(newTask as PlannerTask).id}`;
      } else {
        this._navigate("tasks");
      }
    } catch (err) { console.error("Failed to create task:", err); }
  }

  private async _onQuickAddShopping(_e: CustomEvent<{ date: string }>): Promise<void> {
    if (!this._tasksLoaded) await this._loadTasks();
    const shoppingList = this._lists.find((l) => l.list_type === "shopping");
    const listId = shoppingList?.id ?? "shopping";
    try {
      const newTask = await this.hass.callWS({ type: "calee/create_task", list_id: listId, title: "New item" });
      if (newTask) this._tasks = [...this._tasks, newTask as PlannerTask];
      this._navigate("shopping");
    } catch (err) { console.error("Failed to create shopping item:", err); }
  }

  private async _onTemplateSelect(e: CustomEvent<{ templateId: string; date: string }>): Promise<void> {
    try {
      const newEvent = await this.hass.callWS({
        type: "calee/add_shift_from_template", template_id: e.detail.templateId, date: e.detail.date,
      });
      if (newEvent) this._events = [...this._events, newEvent as PlannerEvent];
    } catch (err) { console.error("Failed to add shift from template:", err); }
  }

  private _onCustomEvent(e: CustomEvent<{ date: string; time?: string }>): void {
    const nonWorkCal =
      this._rawCalendars.find((c) => c.id === "family_shared") ??
      this._rawCalendars.find((c) => c.id === "personal") ??
      this._rawCalendars.find((c) => c.id !== "work_shifts") ??
      this._rawCalendars[0];
    this._editEvent = null;
    this._eventDialogDefaults = { date: e.detail.date, time: e.detail.time, calendar_id: nonWorkCal?.id };
    this._showTemplatePicker = false;
    this._showEventDialog = true;
  }

  private _onManageTemplates(): void {
    this._showTemplatePicker = false;
    this._showTemplateManager = true;
  }

  private async _onTemplateChanged(): Promise<void> {
    try { this._templates = (await this.hass.callWS({ type: "calee/templates" })) ?? []; } catch { /* ignore */ }
  }

  private _onManagerClose(): void {
    this._showTemplateManager = false;
    this._showTemplatePicker = true;
  }

  private async _onEventSave(e: CustomEvent): Promise<void> {
    const detail = e.detail;
    try {
      const occParentId = (this._editEvent as any)?._occurrenceParentId;
      const occDate = (this._editEvent as any)?._occurrenceDate;
      if (occParentId && occDate) {
        const standalone = await this.hass.callWS({
          type: "calee/edit_event_occurrence", event_id: occParentId, date: occDate,
          title: detail.title, start: detail.start, end: detail.end,
          note: detail.note, calendar_id: detail.calendar_id,
        });
        if (standalone) {
          this._events = this._events.filter((ev) => ev.id !== `${occParentId}_${occDate}`);
          this._events = [...this._events, standalone as PlannerEvent];
        }
      } else if (detail.id) {
        const updated = await this.hass.callWS({
          type: "calee/update_event", event_id: detail.id, version: detail.version,
          title: detail.title, start: detail.start, end: detail.end,
          note: detail.note, recurrence_rule: detail.recurrence_rule ?? undefined,
        });
        if (updated) this._events = this._events.map((ev) => ev.id === detail.id ? (updated as PlannerEvent) : ev);
      } else {
        const created = await this.hass.callWS({
          type: "calee/create_event", calendar_id: detail.calendar_id,
          title: detail.title, start: detail.start, end: detail.end,
          note: detail.note, recurrence_rule: detail.recurrence_rule ?? undefined,
          template_id: detail.template_id ?? undefined,
        });
        if (created) this._events = [...this._events, created as PlannerEvent];
      }
      this._recomputeConflicts();
    } catch (err) { console.error("Failed to save event:", err); }
  }

  private async _onEventDelete(e: CustomEvent<{ eventId: string }>): Promise<void> {
    const eventId = e.detail.eventId;
    const event = this._events.find((ev) => ev.id === eventId);
    if (event && event.is_recurring_instance) {
      this._recurringActionEvent = event;
      this._showRecurringActionDialog = true;
      return;
    }
    try {
      await this.hass.callWS({ type: "calee/delete_event", event_id: eventId });
      this._events = this._events.filter((ev) => ev.id !== eventId);
      this._recomputeConflicts();
    } catch (err) { console.error("Failed to delete event:", err); }
  }

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

  private _onYearDayClick(e: CustomEvent<{ date: string }>): void {
    this._currentDate = e.detail.date;
    this._navigate("calendar");
  }

  // ── Settings ────────────────────────────────────────────────────

  private async _loadSettings(): Promise<void> {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({ type: "calee/get_settings" });
      this._settingsWeekStart = result.week_start ?? "monday";
      this._settingsTimeFormat = result.time_format ?? "12h";
      this._settingsCurrency = result.currency ?? "$";
      this._settingsBudget = result.budget ?? 0;
      this._settingsReminderCalendars = result.reminder_calendars ?? ["work_shifts"];
      this._settingsStrictPrivacy = result.strict_privacy ?? false;
    } catch { /* defaults already set */ }
  }

  private _onSettingsClose(): void { this._showSettings = false; }

  private _onSettingsChanged(_e: CustomEvent): void {
    this._showSettings = false;
    this._loadSettings();
  }

  // ── Recently Deleted ──────────────────────────────────────────────

  private _onDeletedItemsClose(): void { this._showDeletedItems = false; }

  // ── Activity Feed ─────────────────────────────────────────────────

  private _onActivityFeedClose(): void { this._showActivityFeed = false; }

  // ── Routines ─────────────────────────────────────────────────────

  private async _executeRoutine(routineId: string): Promise<void> {
    if (!this.hass) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await this.hass.callWS({ type: "calee/execute_routine", routine_id: routineId, date: today });
      this._refreshAll();
    } catch (err) { console.error("Failed to execute routine:", err); }
  }

  private async _onRoutineExecute(e: CustomEvent<{ routineId: string }>): Promise<void> {
    await this._executeRoutine(e.detail.routineId);
  }

  private async _onRoutineChanged(): Promise<void> {
    if (!this.hass) return;
    try { this._routines = (await this.hass.callWS({ type: "calee/routines" })) ?? []; } catch { /* ignore */ }
  }

  private _onRoutineManagerClose(): void { this._showRoutineManager = false; }

  // ── Recurring event actions ────────────────────────────────────────

  private _getOccurrenceDate(event: PlannerEvent): string {
    const parentId = event.parent_event_id;
    if (parentId && event.id.startsWith(parentId + "_")) {
      return event.id.slice(parentId.length + 1);
    }
    return event.start.slice(0, 10);
  }

  private async _onEditThisOccurrence(event: PlannerEvent): Promise<void> {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    const occDate = this._getOccurrenceDate(event);
    const standalone: PlannerEvent = { ...event, id: "", recurrence_rule: null, exceptions: [] };
    (standalone as any)._occurrenceParentId = parentId;
    (standalone as any)._occurrenceDate = occDate;
    this._editEvent = standalone;
    this._showEventDialog = true;
  }

  private _onEditAllOccurrences(event: PlannerEvent): void {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    this._loadParentAndEdit(parentId);
  }

  private async _loadParentAndEdit(parentId: string): Promise<void> {
    try {
      const allEvents = (await this.hass.callWS({ type: "calee/events" })) as PlannerEvent[];
      const parent = allEvents.find((e) => e.id === parentId);
      if (parent) {
        this._editEvent = parent;
        this._showEventDialog = true;
      }
    } catch { console.error("Failed to load parent event"); }
  }

  private async _onDeleteThisOccurrence(event: PlannerEvent): Promise<void> {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    const occDate = this._getOccurrenceDate(event);
    try {
      await this.hass.callWS({ type: "calee/add_event_exception", event_id: parentId, date: occDate });
      this._events = this._events.filter((ev) => ev.id !== event.id);
      this._recomputeConflicts();
    } catch (err) { console.error("Failed to delete occurrence:", err); }
  }

  private async _onDeleteAllOccurrences(event: PlannerEvent): Promise<void> {
    const parentId = event.parent_event_id || event.id.split("_").slice(0, -1).join("_");
    try {
      await this.hass.callWS({ type: "calee/delete_event", event_id: parentId });
      this._events = this._events.filter(
        (ev) => ev.id !== parentId && !(ev.parent_event_id === parentId),
      );
      this._recomputeConflicts();
    } catch (err) { console.error("Failed to delete all occurrences:", err); }
  }

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
    try {
      const [calendars, lists] = await Promise.all([
        this.hass.callWS({ type: "calee/calendars" }),
        this.hass.callWS({ type: "calee/lists" }),
      ]);
      this._rawCalendars = calendars ?? [];
      this._calendars = this._rawCalendars.map((c: any) => ({
        id: c.id, name: c.name, color: c.color ?? "#64b5f6",
        visible: this._calendars.find((existing) => existing.id === c.id)?.visible ?? true,
      }));
      this._lists = lists ?? [];
    } catch { /* ignore */ }
  }

  private _onCalendarManagerClose(): void { this._showCalendarManager = false; }

  // ── Data Center ──────────────────────────────────────────────────

  private _onDataCenterClose(): void { this._showDataCenter = false; }

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
                ${this._calendars.map((c) => html`<option value=${c.id}>${c.name}</option>`)}
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

  private _closeAddDialog(): void { this._showAddDialog = false; }

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
        type: "calee/create_event", calendar_id: calendarId, title,
        start: new Date(start).toISOString(), end: new Date(end).toISOString(), note: note || "",
      });
      if (created) this._events = [...this._events, created as PlannerEvent];
      this._showAddDialog = false;
    } catch (err) { console.error("Failed to create event:", err); }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-panel": CaleePanel;
  }
}
