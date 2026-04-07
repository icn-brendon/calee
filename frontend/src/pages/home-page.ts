/**
 * <calee-home-page> -- Calm overview surface for the Calee panel.
 *
 * This page is intentionally simple: it summarizes the day, surfaces the next
 * few events, highlights due work, and provides quick access to shopping and
 * routines without introducing another navigation layer.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type {
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  PlannerList,
  Routine,
  TaskPreset,
} from "../store/types.js";

type TaskBucket = "overdue" | "today" | "upcoming" | "later";

interface DatedItem {
  date: string;
  dayLabel: string;
  items: PlannerEvent[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfDay(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime();
}

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function isTomorrow(iso: string): boolean {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return sameDay(iso, d.toISOString());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(value: number, currency: string): string {
  const amount = Math.max(0, value);
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${currency}${text}`;
}

function calendarColor(
  calendars: Map<string, PlannerCalendar>,
  calendarId: string,
): string {
  return calendars.get(calendarId)?.color ?? "var(--primary-color, #03a9f4)";
}

function calendarName(
  calendars: Map<string, PlannerCalendar>,
  calendarId: string,
): string {
  return calendars.get(calendarId)?.name ?? calendarId;
}

function taskDueBucket(task: PlannerTask): TaskBucket {
  if (!task.due) return "later";
  const today = todayISO();
  const due = task.due.slice(0, 10);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return due <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    ? "upcoming"
    : "later";
}

function taskPriorityScore(task: PlannerTask): number {
  const bucket = taskDueBucket(task);
  if (bucket === "overdue") return 0;
  if (bucket === "today") return 1;
  if (bucket === "upcoming") return 2;
  return 3;
}

@customElement("calee-home-page")
export class CaleeHomePage extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) lists: PlannerList[] = [];
  @property({ attribute: false }) routines: Routine[] = [];
  @property({ attribute: false }) presets: TaskPreset[] = [];
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ type: String }) currency = "$";
  @property({ type: Number }) budget = 0;
  @property({ type: String }) currentDate = todayISO();
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property() weekStart: "monday" | "sunday" = "monday";

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      color: var(--primary-text-color, #212121);
      background:
        radial-gradient(circle at top left, rgba(3, 169, 244, 0.08), transparent 28%),
        radial-gradient(circle at top right, rgba(76, 175, 80, 0.07), transparent 24%),
        var(--primary-background-color, #fafafa);
    }

    .shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-height: 0;
      overflow: auto;
    }

    .hero {
      display: grid;
      gap: 12px;
      grid-template-columns: 1.5fr 1fr;
      align-items: stretch;
    }

    .hero-main,
    .hero-side,
    .panel-card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 18px;
      box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
    }

    .hero-main {
      padding: 20px;
      min-height: 144px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        linear-gradient(135deg, rgba(3, 169, 244, 0.08), transparent 42%),
        var(--card-background-color, #fff);
    }

    .hero-kicker {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #757575);
    }

    .hero-title {
      margin: 4px 0 8px;
      font-size: 28px;
      line-height: 1.05;
      font-weight: 700;
      letter-spacing: -0.6px;
    }

    .hero-subtitle {
      font-size: 14px;
      color: var(--secondary-text-color, #666);
      max-width: 60ch;
    }

    .hero-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: rgba(255, 255, 255, 0.85);
      color: var(--primary-text-color, #212121);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .pill strong {
      font-weight: 700;
    }

    .hero-side {
      padding: 16px;
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .summary-card {
      padding: 12px;
      border-radius: 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border: 1px solid color-mix(in srgb, var(--divider-color, #e0e0e0) 70%, transparent);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .summary-card[clickable] {
      cursor: pointer;
    }

    .summary-card[clickable]:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
    }

    .summary-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      font-weight: 700;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      line-height: 1.25;
    }

    .summary-sub {
      margin-top: 3px;
      font-size: 12px;
      color: var(--secondary-text-color, #666);
    }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .panel-card {
      padding: 16px;
      min-height: 0;
    }

    .panel-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .panel-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      margin: 0;
    }

    .panel-meta {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
    }

    .timeline {
      display: grid;
      gap: 10px;
    }

    .timeline-day {
      display: grid;
      gap: 8px;
    }

    .timeline-day-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      font-weight: 700;
    }

    .timeline-item,
    .task-item,
    .shopping-item,
    .routine-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--primary-background-color, #fff);
      border-radius: 14px;
      padding: 10px 12px;
      text-align: left;
      color: inherit;
      font: inherit;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .timeline-item:hover,
    .task-item:hover,
    .shopping-item:hover,
    .routine-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 26%, var(--divider-color, #e0e0e0));
    }

    .event-dot,
    .task-dot,
    .shopping-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      flex-shrink: 0;
      background: var(--primary-color, #03a9f4);
    }

    .timeline-main,
    .task-main,
    .shopping-main,
    .routine-main {
      min-width: 0;
      flex: 1;
    }

    .timeline-title,
    .task-title,
    .shopping-title,
    .routine-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    .timeline-sub,
    .task-sub,
    .shopping-sub,
    .routine-sub {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--secondary-background-color, #f4f4f4) 85%, transparent);
      color: var(--secondary-text-color, #666);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .badge[data-tone="warn"] {
      background: color-mix(in srgb, var(--warning-color, #ff9800) 14%, transparent);
      color: var(--warning-color, #ff9800);
    }

    .badge[data-tone="danger"] {
      background: color-mix(in srgb, var(--error-color, #f44336) 14%, transparent);
      color: var(--error-color, #f44336);
    }

    .badge[data-tone="good"] {
      background: color-mix(in srgb, var(--success-color, #4caf50) 14%, transparent);
      color: var(--success-color, #4caf50);
    }

    .stack {
      display: grid;
      gap: 8px;
    }

    .section-empty {
      color: var(--secondary-text-color, #757575);
      font-size: 13px;
      padding: 12px 2px 4px;
    }

    .routine-grid {
      display: grid;
      gap: 8px;
    }

    .routine-emoji {
      width: 30px;
      height: 30px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      flex-shrink: 0;
      font-size: 16px;
    }

    .shopping-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .shopping-total {
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }

    .shopping-shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .shortcut-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      color: var(--primary-text-color, #212121);
      border-radius: 999px;
      padding: 8px 12px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .shortcut-chip:hover {
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .shortcut-chip span:last-child {
      color: var(--secondary-text-color, #666);
      font-weight: 500;
    }

    .footer-note {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      padding: 0 4px 4px;
    }

    @media (max-width: 900px) {
      .hero,
      .grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .shell {
        padding: 12px;
        gap: 12px;
      }

      .hero-main {
        padding: 16px;
      }

      .hero-title {
        font-size: 24px;
      }

      .panel-card,
      .hero-side {
        padding: 14px;
      }
    }

    @keyframes riseIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hero-main,
    .hero-side,
    .panel-card {
      animation: riseIn 180ms ease-out both;
    }
  `;

  private get _visibleCalendars(): PlannerCalendar[] {
    const ids = this.enabledCalendarIds;
    const calendars = [...this.calendars.values()];
    return ids.size > 0 ? calendars.filter((cal) => ids.has(cal.id)) : calendars;
  }

  private get _shoppingListIds(): Set<string> {
    return new Set(this.lists.filter((list) => list.list_type === "shopping").map((list) => list.id));
  }

  private get _shoppingTasks(): PlannerTask[] {
    const shoppingIds = this._shoppingListIds;
    return this.tasks.filter((task) => shoppingIds.has(task.list_id));
  }

  private get _standardTasks(): PlannerTask[] {
    const shoppingIds = this._shoppingListIds;
    return this.tasks.filter((task) => !shoppingIds.has(task.list_id) && !task.completed);
  }

  private get _upcomingEvents(): PlannerEvent[] {
    const now = Date.now();
    return this.events
      .filter((event) => !event.deleted_at)
      .filter((event) => {
        if (this.enabledCalendarIds.size === 0) return true;
        return this.enabledCalendarIds.has(event.calendar_id);
      })
      .filter((event) => startOfDay(event.start.slice(0, 10)) >= startOfDay(this.currentDate) || new Date(event.start).getTime() >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 8);
  }

  private get _timelineDays(): DatedItem[] {
    const grouped = new Map<string, PlannerEvent[]>();
    for (const event of this._upcomingEvents) {
      const date = event.start.slice(0, 10);
      const bucket = grouped.get(date) ?? [];
      bucket.push(event);
      grouped.set(date, bucket);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        dayLabel: this._dayLabel(date),
        items,
      }));
  }

  private get _nextShift(): PlannerEvent | null {
    const shiftCalendars = [...this.calendars.values()]
      .filter((calendar) => calendar.id === "work_shifts" || /shift/i.test(calendar.name))
      .map((calendar) => calendar.id);
    const pool = this.events
      .filter((event) => !event.deleted_at)
      .filter((event) => {
        if (this.enabledCalendarIds.size === 0) return true;
        return this.enabledCalendarIds.has(event.calendar_id);
      })
      .filter((event) => shiftCalendars.length === 0 || shiftCalendars.includes(event.calendar_id))
      .filter((event) => new Date(event.start).getTime() >= Date.now())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return pool[0] ?? null;
  }

  private get _dueTasks(): PlannerTask[] {
    return this._standardTasks
      .slice()
      .sort((a, b) => taskPriorityScore(a) - taskPriorityScore(b) || (a.due ?? "").localeCompare(b.due ?? "") || a.title.localeCompare(b.title))
      .slice(0, 6);
  }

  private get _shoppingSummary(): {
    remaining: number;
    spent: number;
    count: number;
  } {
    const spent = this._shoppingTasks.reduce((sum, task) => sum + (task.price ?? 0), 0);
    const remaining = Math.max(0, this.budget - spent);
    return {
      spent,
      remaining,
      count: this._shoppingTasks.filter((task) => !task.completed).length,
    };
  }

  private get _shoppingShortcuts(): Array<PlannerTask | TaskPreset> {
    if (this.presets.length > 0) {
      const shoppingIds = this._shoppingListIds;
      return this.presets.filter((preset) => shoppingIds.has(preset.list_id));
    }
    return this._shoppingTasks
      .filter((task) => !task.completed)
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title))
      .slice(0, 5);
  }

  private get _routineCount(): number {
    return this.routines.length;
  }

  private _dayLabel(iso: string): string {
    const today = todayISO();
    if (sameDay(iso, today)) return "Today";
    if (isTomorrow(iso)) return "Tomorrow";
    return formatShortDate(iso);
  }

  private _dispatchEventSelect(event: PlannerEvent): void {
    this.dispatchEvent(
      new CustomEvent("event-select", {
        detail: { event },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchTaskClick(task: PlannerTask): void {
    this.dispatchEvent(
      new CustomEvent("task-click", {
        detail: { task },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchRoutineExecute(routine: Routine): void {
    this.dispatchEvent(
      new CustomEvent("routine-execute", {
        detail: { routineId: routine.id, routine },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchPresetAdd(preset: TaskPreset): void {
    this.dispatchEvent(
      new CustomEvent("preset-add", {
        detail: { preset },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const nextShift = this._nextShift;
    const nextShiftText = nextShift
      ? `${nextShift.title} · ${formatTime(nextShift.start)}`
      : "No upcoming shifts";
    const nextShiftDate = nextShift ? this._dayLabel(nextShift.start.slice(0, 10)) : "Nothing on deck";
    const shopping = this._shoppingSummary;

    return html`
      <div class="shell">
        <section class="hero" aria-label="Overview summary">
          <div class="hero-main">
            <div>
              <div class="hero-kicker">Home</div>
              <h1 class="hero-title">${formatLongDate(this.currentDate)}</h1>
              <div class="hero-subtitle">
                A quiet overview of what is next, what needs attention, and where to jump in without digging through the rest of the shell.
              </div>
            </div>

            <div class="hero-pills">
              <span class="pill"><strong>${this._visibleCalendars.length}</strong> calendars visible</span>
              <span class="pill"><strong>${this._dueTasks.length}</strong> tasks in view</span>
              <span class="pill"><strong>${shopping.count}</strong> shopping items</span>
              <span class="pill"><strong>${this._routineCount}</strong> routines</span>
            </div>
          </div>

          <div class="hero-side">
            <div class="summary-card" clickable @click=${() => nextShift && this._dispatchEventSelect(nextShift)}>
              <div class="summary-label">Next Shift</div>
              <div class="summary-value">${nextShiftText}</div>
              <div class="summary-sub">${nextShiftDate}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Due Tasks</div>
              <div class="summary-value">${this._dueTasks.length} ready for attention</div>
              <div class="summary-sub">${this._dueTasks[0]?.title ?? "No urgent tasks"}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Shopping</div>
              <div class="summary-value">${formatAmount(shopping.remaining, this.currency)} left</div>
              <div class="summary-sub">${formatAmount(shopping.spent, this.currency)} planned from budget</div>
            </div>
          </div>
        </section>

        <section class="grid">
          <article class="panel-card">
            <div class="panel-head">
              <h2 class="panel-title">Upcoming Timeline</h2>
              <div class="panel-meta">${this._upcomingEvents.length} events</div>
            </div>
            ${this._timelineDays.length > 0
              ? html`
                  <div class="timeline">
                    ${this._timelineDays.map(
                      (day) => html`
                        <div class="timeline-day">
                          <div class="timeline-day-label">
                            <span>${day.dayLabel}</span>
                            <span class="badge">${day.items.length}</span>
                          </div>
                          ${day.items.map(
                            (event) => html`
                              <button class="timeline-item" @click=${() => this._dispatchEventSelect(event)}>
                                <span class="event-dot" style="background:${calendarColor(this.calendars, event.calendar_id)}"></span>
                                <div class="timeline-main">
                                  <div class="timeline-title">${event.title}</div>
                                  <div class="timeline-sub">
                                    ${event.all_day ? "All day" : formatTime(event.start)}
                                    ${calendarName(this.calendars, event.calendar_id) ? html`<span> · ${calendarName(this.calendars, event.calendar_id)}</span>` : nothing}
                                  </div>
                                </div>
                                <span class="badge">${event.all_day ? "All day" : formatTime(event.start)}</span>
                              </button>
                            `,
                          )}
                        </div>
                      `,
                    )}
                  </div>
                `
              : html`<div class="section-empty">No upcoming events right now.</div>`}
          </article>

          <article class="panel-card">
            <div class="panel-head">
              <h2 class="panel-title">Due Tasks</h2>
              <div class="panel-meta">${this._dueTasks.length} shown</div>
            </div>
            ${this._dueTasks.length > 0
              ? html`
                  <div class="stack">
                    ${this._dueTasks.map(
                      (task) => {
                        const bucket = taskDueBucket(task);
                        const listName = this.lists.find((list) => list.id === task.list_id)?.name ?? task.list_id;
                        return html`
                          <button class="task-item" @click=${() => this._dispatchTaskClick(task)}>
                            <span class="task-dot" style="background:${bucket === "overdue" ? "var(--error-color, #f44336)" : bucket === "today" ? "var(--warning-color, #ff9800)" : "var(--primary-color, #03a9f4)"}"></span>
                            <div class="task-main">
                              <div class="task-title">${task.title}</div>
                              <div class="task-sub">${listName}${task.due ? html` · ${task.due.slice(0, 10) === todayISO() ? "Today" : formatShortDate(task.due)}` : nothing}</div>
                            </div>
                            <span class="badge" data-tone=${bucket === "overdue" ? "danger" : bucket === "today" ? "warn" : "good"}>
                              ${bucket === "overdue" ? "Overdue" : bucket === "today" ? "Today" : bucket === "upcoming" ? "Soon" : "Later"}
                            </span>
                          </button>
                        `;
                      },
                    )}
                  </div>
                `
              : html`<div class="section-empty">No pending tasks in the current standard lists.</div>`}
          </article>

          <article class="panel-card">
            <div class="panel-head">
              <h2 class="panel-title">Shopping Shortcuts</h2>
              <div class="panel-meta">${formatAmount(shopping.spent, this.currency)} planned</div>
            </div>
            ${this._shoppingShortcuts.length > 0
              ? html`
                  <div class="shopping-meta">
                    <span class="badge">Budget ${formatAmount(this.budget, this.currency)}</span>
                    <span class="badge">Remaining ${formatAmount(shopping.remaining, this.currency)}</span>
                  </div>
                  <div class="shopping-shortcuts" style="margin-top: 12px;">
                    ${this._shoppingShortcuts.map((item) => {
                      if ("icon" in item) {
                        const preset = item as TaskPreset;
                        return html`
                          <button class="shortcut-chip" @click=${() => this._dispatchPresetAdd(preset)}>
                            <span>${preset.title}</span>
                            <span>${preset.category || "preset"}</span>
                          </button>
                        `;
                      }

                      const task = item as PlannerTask;
                      if ("quantity" in task) {
                        const task = item as PlannerTask;
                        return html`
                          <button class="shortcut-chip" @click=${() => this._dispatchTaskClick(task)}>
                            <span>${task.title}</span>
                            <span>${task.category || "shopping"}</span>
                          </button>
                        `;
                      }

                      return html`
                        <button class="shortcut-chip" @click=${() => this._dispatchTaskClick(task)}>
                          <span>${task.title}</span>
                          <span>${task.category || "shopping"}</span>
                        </button>
                      `;
                    })}
                  </div>
                `
              : html`<div class="section-empty">No shopping shortcuts yet.</div>`}
          </article>

          <article class="panel-card">
            <div class="panel-head">
              <h2 class="panel-title">Routines</h2>
              <div class="panel-meta">${this._routineCount} available</div>
            </div>
            ${this.routines.length > 0
              ? html`
                  <div class="routine-grid">
                    ${this.routines.map(
                      (routine) => html`
                        <button class="routine-item" @click=${() => this._dispatchRoutineExecute(routine)}>
                          <span class="routine-emoji">${routine.emoji || "⚡"}</span>
                          <div class="routine-main">
                            <div class="routine-title">${routine.name}</div>
                            <div class="routine-sub">${routine.description || "Quick routine"}</div>
                          </div>
                          <span class="badge">${routine.tasks.length} tasks</span>
                        </button>
                      `,
                    )}
                  </div>
                `
              : html`<div class="section-empty">No routines configured yet.</div>`}
          </article>
        </section>

        <div class="footer-note">
          Week starts ${this.weekStart}. The page keeps interactions shallow: tap an event, task, or routine and let the parent decide how to open it.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-home-page": CaleeHomePage;
  }
}
