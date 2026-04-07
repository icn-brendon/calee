import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerEvent, PlannerCalendar, PlannerTask, ShiftTemplate, Conflict } from "../store/types.js";

// ── Helpers ────────────────────────────────────────────────────────────

/** Parse an ISO-8601 string into a local Date. */
function parseISO(iso: string): Date {
  return new Date(iso);
}

/** YYYY-MM-DD key for a Date. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when two dates share the same calendar day. */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format a time like "9:30 AM" from a Date. */
function fmtTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Month grid builder ────────────────────────────────────────────────

interface MonthDay {
  date: Date;
  key: string;
  inMonth: boolean;
}

/**
 * Build the 5-or-6-row grid of dates for the given month.
 * @param year  Full year
 * @param month 0-based month
 * @param weekStartsMonday Whether the week starts on Monday
 */
function buildMonthGrid(
  year: number,
  month: number,
  weekStartsMonday: boolean,
): MonthDay[] {
  const first = new Date(year, month, 1);
  let startDow = first.getDay(); // 0=Sun
  if (weekStartsMonday) {
    startDow = (startDow + 6) % 7; // shift so Mon=0
  }

  const days: MonthDay[] = [];

  // Fill leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, key: dateKey(d), inMonth: false });
  }

  // Fill current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, key: dateKey(d), inMonth: true });
  }

  // Fill trailing days to complete last row (rows of 7)
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    days.push({ date: d, key: dateKey(d), inMonth: false });
  }

  return days;
}

// ── Component ──────────────────────────────────────────────────────────

const MAX_VISIBLE_EVENTS = 3;

@customElement("calee-month-view")
export class CaleeMonthView extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) selectedDate: Date = new Date();
  @property({ attribute: false }) templates: ShiftTemplate[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) conflicts: Conflict[] = [];
  @property({ type: Boolean }) weekStartsMonday = true;
  @property({ type: Boolean, reflect: true }) narrow = false;

  @state() private _grid: MonthDay[] = [];
  @state() private _eventsByDay: Map<string, PlannerEvent[]> = new Map();

  private _today = dateKey(new Date());

  // ── Lifecycle ────────────────────────────────────────────────────────

  willUpdate(changed: PropertyValues): void {
    if (changed.has("selectedDate") || changed.has("weekStartsMonday")) {
      this._grid = buildMonthGrid(
        this.selectedDate.getFullYear(),
        this.selectedDate.getMonth(),
        this.weekStartsMonday,
      );
    }

    if (
      changed.has("events") ||
      changed.has("enabledCalendarIds") ||
      changed.has("selectedDate") ||
      changed.has("weekStartsMonday")
    ) {
      this._buildEventMap();
    }
  }

  private _buildEventMap(): void {
    const map = new Map<string, PlannerEvent[]>();

    const visible = this.events.filter(
      (e) => !e.deleted_at && this.enabledCalendarIds.has(e.calendar_id),
    );

    for (const ev of visible) {
      const start = parseISO(ev.start);
      const end = parseISO(ev.end);

      if (ev.all_day) {
        // Span every day from start to end (exclusive end for all-day)
        const cursor = new Date(start);
        // All-day end is typically the next day at 00:00
        const endDay = new Date(end.getTime() - 1);
        while (cursor <= endDay) {
          const key = dateKey(cursor);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        // Timed event: add to every day it touches
        const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        while (cursor <= endDay) {
          const key = dateKey(cursor);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    this._eventsByDay = map;
  }

  // ── Event handlers ───────────────────────────────────────────────────

  private _onEventClick(ev: MouseEvent, eventId: string): void {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("event-click", { detail: { eventId }, bubbles: true, composed: true }),
    );
  }

  private _onCellClick(dayKey: string): void {
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: dayKey }, bubbles: true, composed: true }),
    );
  }

  private _onMoreClick(ev: MouseEvent, dayKey: string): void {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: dayKey }, bubbles: true, composed: true }),
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  private _renderDayNames() {
    if (this.narrow) {
      const letters = this.weekStartsMonday
        ? ["M", "T", "W", "T", "F", "S", "S"]
        : ["S", "M", "T", "W", "T", "F", "S"];
      return letters.map((n) => html`<div class="day-name">${n}</div>`);
    }
    const names = this.weekStartsMonday
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return names.map((n) => html`<div class="day-name">${n}</div>`);
  }

  private _renderEventChip(ev: PlannerEvent) {
    const cal = this.calendars.get(ev.calendar_id);
    const color = cal?.color ?? "var(--primary-color)";
    const start = parseISO(ev.start);
    const timeStr = ev.all_day ? "" : fmtTime(start);

    // Look up template emoji if this event came from a template
    const tplEmoji = ev.template_id
      ? this.templates.find((t) => t.id === ev.template_id)?.emoji ?? ""
      : "";

    // On narrow screens, show just a colored dot instead of full chip
    if (this.narrow) {
      return html`
        <div
          class="event-dot"
          style="background: ${color}"
          title="${ev.title}"
          @click=${(e: MouseEvent) => this._onEventClick(e, ev.id)}
        ></div>
      `;
    }

    const isRecurring = !!ev.recurrence_rule;

    return html`
      <div
        class="event-chip"
        style="--chip-color: ${color}"
        title="${ev.title}"
        @click=${(e: MouseEvent) => this._onEventClick(e, ev.id)}
      >
        ${tplEmoji ? html`<span class="chip-emoji">${tplEmoji}</span>` : nothing}
        ${isRecurring ? html`<span class="chip-recur" title="Recurring">&#x1F501;</span>` : nothing}
        ${timeStr ? html`<span class="chip-time">${timeStr}</span>` : nothing}
        <span class="chip-title">${ev.title}</span>
      </div>
    `;
  }

  private _renderCell(day: MonthDay) {
    const isToday = day.key === this._today;
    const isSelected = sameDay(day.date, this.selectedDate);
    const dayEvents = this._eventsByDay.get(day.key) ?? [];
    const overflow = dayEvents.length - MAX_VISIBLE_EVENTS;

    // Task count for this day.
    const dayTasks = this.tasks.filter(
      (t) => t.due && t.due.slice(0, 10) === day.key && !t.completed && !t.deleted_at,
    );
    const taskCount = dayTasks.length;

    // Conflict check for this day.
    const dayHasConflict = this.conflicts.some((c) => {
      const aDate = c.eventA.start.slice(0, 10);
      const bDate = c.eventB.start.slice(0, 10);
      return aDate === day.key || bDate === day.key;
    });

    const classes: string[] = ["cell"];
    if (!day.inMonth) classes.push("outside");
    if (isToday) classes.push("today");
    if (isSelected) classes.push("selected");

    return html`
      <div class=${classes.join(" ")} @click=${() => this._onCellClick(day.key)}>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="date-number">${day.date.getDate()}</span>
          ${dayHasConflict ? html`<span class="conflict-badge" title="Schedule conflict">!</span>` : nothing}
        </div>
        <div class="events">
          ${dayEvents
            .slice(0, MAX_VISIBLE_EVENTS)
            .map((e) => this._renderEventChip(e))}
          ${overflow > 0
            ? html`<button
                class="more-link"
                @click=${(e: MouseEvent) => this._onMoreClick(e, day.key)}
              >+${overflow} more</button>`
            : nothing}
        </div>
        ${taskCount > 0 ? html`<div class="task-badge">${taskCount} task${taskCount > 1 ? "s" : ""}</div>` : nothing}
      </div>
    `;
  }

  render() {
    return html`
      <div class="month-grid">
        <div class="header-row">${this._renderDayNames()}</div>
        <div class="body">${this._grid.map((d) => this._renderCell(d))}</div>
      </div>
    `;
  }

  // ── Styles ───────────────────────────────────────────────────────────

  static styles = css`
    :host {
      display: block;
      --cell-min-height: 80px;
    }

    .month-grid {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    /* ── Header row ────────────────────────────────────────────────── */

    .header-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      width: 100%;
    }

    .day-name {
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 0;
      color: var(--secondary-text-color, #666);
    }

    /* ── Grid body ─────────────────────────────────────────────────── */

    .body {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      flex: 1;
      overflow-y: auto;
      width: 100%;
    }

    /* ── Day cell ──────────────────────────────────────────────────── */

    .cell {
      min-height: var(--cell-min-height);
      border-right: 1px solid var(--divider-color, #e0e0e0);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      padding: 4px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      display: flex;
      flex-direction: column;
    }

    .cell:nth-child(7n) {
      border-right: none;
    }

    .cell:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .cell.outside {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }

    .cell.outside .date-number {
      color: var(--disabled-text-color, #aaa);
    }

    .cell.today {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 8%,
        transparent
      );
    }

    .cell.today .date-number {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .cell.selected {
      box-shadow: inset 0 0 0 2px var(--primary-color, #03a9f4);
    }

    /* ── Date number ───────────────────────────────────────────────── */

    .date-number {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      margin-bottom: 2px;
      line-height: 26px;
    }

    /* ── Events in cell ────────────────────────────────────────────── */

    .events {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .event-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      color: var(--primary-text-color, #212121);
      border-left: 3px solid var(--chip-color);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 0.7rem;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .event-chip:hover {
      background: color-mix(in srgb, var(--chip-color) 20%, transparent);
    }

    .chip-emoji {
      flex-shrink: 0;
      font-size: 0.7rem;
      line-height: 1;
    }

    .chip-recur {
      flex-shrink: 0;
      font-size: 0.55rem;
      line-height: 1;
      opacity: 0.6;
    }

    .chip-time {
      flex-shrink: 0;
      opacity: 0.7;
      font-size: 0.65rem;
      color: var(--secondary-text-color, #666);
    }

    .chip-title {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .more-link {
      all: unset;
      font-size: 0.7rem;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .more-link:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.08));
    }

    .task-badge {
      font-size: 0.6rem;
      color: var(--secondary-text-color, #999);
      padding: 1px 4px;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conflict-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--warning-color, #ff9800);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      flex-shrink: 0;
      line-height: 1;
    }

    /* ── Event dot (narrow/mobile mode) ────────────────────────────── */

    .event-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      cursor: pointer;
    }

    :host([narrow]) .events {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 3px;
    }

    /* ── Responsive ────────────────────────────────────────────────── */

    :host([narrow]) {
      --cell-min-height: 52px;
    }

    :host([narrow]) .day-name {
      font-size: 0.6rem;
      padding: 4px 0;
    }

    :host([narrow]) .cell {
      padding: 2px;
    }

    :host([narrow]) .date-number {
      font-size: 0.7rem;
      line-height: 20px;
    }

    :host([narrow]) .cell.today .date-number {
      width: 20px;
      height: 20px;
      font-size: 0.65rem;
    }

    :host([narrow]) .more-link {
      font-size: 0.6rem;
      padding: 0 2px;
    }

    @media (max-width: 600px) {
      :host {
        --cell-min-height: 52px;
      }

      .day-name {
        font-size: 0.6rem;
        padding: 4px 0;
      }

      .cell {
        padding: 2px;
      }

      .date-number {
        font-size: 0.7rem;
      }

      .event-chip {
        font-size: 0.6rem;
        padding: 1px 4px;
      }

      .chip-time {
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-month-view": CaleeMonthView;
  }
}
