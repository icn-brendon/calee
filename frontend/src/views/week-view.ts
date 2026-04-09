import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { PlannerEvent, PlannerCalendar, PlannerTask, ShiftTemplate } from "../store/types.js";

// ── Helpers ────────────────────────────────────────────────────────────

function parseISO(iso: string): Date {
  return new Date(iso);
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function fmtDayHeader(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

/** Clamp a Date to midnight of the same day. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Minutes from midnight for a given Date. */
function minutesInDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// ── Week builder ──────────────────────────────────────────────────────

function getWeekDays(selectedDate: Date, weekStartsMonday: boolean, maxDays = 7): Date[] {
  const d = new Date(selectedDate);
  if (maxDays <= 3) {
    // Mobile: show selected day and neighbors (yesterday, today, tomorrow)
    const days: Date[] = [];
    for (let i = -1; i < maxDays - 1; i++) {
      days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
    }
    return days;
  }
  let dow = d.getDay(); // 0=Sun
  if (weekStartsMonday) {
    dow = (dow + 6) % 7; // Mon=0
  }
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const days: Date[] = [];
  for (let i = 0; i < maxDays; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

// ── Positioned event ──────────────────────────────────────────────────

interface PositionedEvent {
  event: PlannerEvent;
  startMin: number; // minutes from midnight (clamped to 0)
  endMin: number; // minutes from midnight (clamped to 1440)
  column: number; // for overlapping placement
  totalColumns: number;
}

/** Assign columns to overlapping events in a single day. */
function layoutEvents(events: PlannerEvent[], dayDate: Date): PositionedEvent[] {
  const dayStart = startOfDay(dayDate).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const items: { event: PlannerEvent; startMin: number; endMin: number }[] = [];

  for (const ev of events) {
    const evStart = parseISO(ev.start);
    const evEnd = parseISO(ev.end);

    // Clamp to this day
    const clampedStart = Math.max(evStart.getTime(), dayStart);
    const clampedEnd = Math.min(evEnd.getTime(), dayEnd);
    if (clampedEnd <= clampedStart) continue;

    const startMin = Math.round((clampedStart - dayStart) / 60000);
    const endMin = Math.round((clampedEnd - dayStart) / 60000);

    items.push({ event: ev, startMin, endMin: Math.max(endMin, startMin + 15) });
  }

  // Sort by start time, then longer events first
  items.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  // Greedy column assignment
  const columns: number[][] = []; // columns[col] = list of endMin values

  const positioned: PositionedEvent[] = [];

  for (const item of items) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      // Check if this column is free (all existing events in the column end before this one starts)
      const lastEnd = columns[col][columns[col].length - 1];
      if (lastEnd <= item.startMin) {
        columns[col].push(item.endMin);
        positioned.push({ ...item, column: col, totalColumns: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([item.endMin]);
      positioned.push({ ...item, column: columns.length - 1, totalColumns: 0 });
    }
  }

  // Calculate total overlapping columns per group
  // Simple approach: every event in this day shares the same totalColumns
  const totalCols = columns.length;
  for (const p of positioned) {
    p.totalColumns = totalCols;
  }

  return positioned;
}

// ── Constants ──────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ── Component ──────────────────────────────────────────────────────────

@customElement("calee-week-view")
export class CaleeWeekView extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) selectedDate: Date = new Date();
  @property({ attribute: false }) templates: ShiftTemplate[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ type: Boolean }) weekStartsMonday = true;
  @property({ type: Boolean, reflect: true }) narrow = false;

  @state() private _weekDays: Date[] = [];
  @state() private _allDayByDay: Map<string, PlannerEvent[]> = new Map();
  @state() private _timedByDay: Map<string, PlannerEvent[]> = new Map();
  @state() private _taskCountByDay: Map<string, number> = new Map();
  @state() private _now: Date = new Date();

  @query(".time-grid-scroll") private _scrollContainer!: HTMLElement;
  @query(".week-pan") private _panContainer!: HTMLElement;

  private _todayKey = dateKey(new Date());
  private _timerHandle = 0;
  private _hasScrolled = false;
  private _hasAlignedSelectedDay = false;

  // ── Lifecycle ────────────────────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    this._timerHandle = window.setInterval(() => {
      this._now = new Date();
      this._todayKey = dateKey(this._now);
    }, 60_000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timerHandle);
  }

  private get _dayCount(): number {
    return this.narrow ? 3 : 7;
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("selectedDate") || changed.has("weekStartsMonday") || changed.has("narrow")) {
      this._weekDays = getWeekDays(this.selectedDate, this.weekStartsMonday, this._dayCount);
      this._hasAlignedSelectedDay = false;
    }

    if (
      changed.has("events") ||
      changed.has("enabledCalendarIds") ||
      changed.has("selectedDate") ||
      changed.has("weekStartsMonday") ||
      changed.has("narrow")
    ) {
      this._categoriseEvents();
    }

    if (changed.has("tasks")) {
      this._buildTaskCountMap();
    }
  }

  firstUpdated(): void {
    this._scrollToCurrentTime();
    this._scrollSelectedDayIntoView();
  }

  updated(changed: PropertyValues): void {
    if (changed.has("selectedDate") || changed.has("narrow")) {
      this._scrollSelectedDayIntoView();
    }
  }

  private _scrollToCurrentTime(): void {
    if (this._hasScrolled) return;
    this._hasScrolled = true;
    requestAnimationFrame(() => {
      if (!this._scrollContainer) return;
      const hourPx = 60; // matches --hour-height
      const now = new Date();
      const target = Math.max(0, (now.getHours() - 2)) * hourPx;
      this._scrollContainer.scrollTop = target;
    });
  }

  private _scrollSelectedDayIntoView(): void {
    if (!this.narrow || this._hasAlignedSelectedDay) return;
    this._hasAlignedSelectedDay = true;
    requestAnimationFrame(() => {
      if (!this._panContainer) return;
      const selectedIndex = this._weekDays.findIndex((day) => sameDay(day, this.selectedDate));
      if (selectedIndex < 0) return;
      const labelWidth = 40;
      const dayWidth = 104;
      const targetLeft = labelWidth + Math.max(0, selectedIndex - 1) * dayWidth;
      this._panContainer.scrollLeft = targetLeft;
    });
  }

  private _categoriseEvents(): void {
    const allDay = new Map<string, PlannerEvent[]>();
    const timed = new Map<string, PlannerEvent[]>();

    const visible = this.events.filter(
      (e) => !e.deleted_at && this.enabledCalendarIds.has(e.calendar_id),
    );

    for (const ev of visible) {
      if (ev.all_day) {
        // Add to every day the all-day event spans
        const start = parseISO(ev.start);
        const end = parseISO(ev.end);
        const cursor = new Date(start);
        const endDay = new Date(end.getTime() - 1);
        while (cursor <= endDay) {
          const key = dateKey(cursor);
          if (!allDay.has(key)) allDay.set(key, []);
          allDay.get(key)!.push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        // Timed: add to every day the event touches
        const start = parseISO(ev.start);
        const end = parseISO(ev.end);
        const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        while (cursor <= endDay) {
          const key = dateKey(cursor);
          if (!timed.has(key)) timed.set(key, []);
          timed.get(key)!.push(ev);
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    this._allDayByDay = allDay;
    this._timedByDay = timed;
  }

  /** Precompute task counts per day to avoid O(days x tasks) in render. */
  private _buildTaskCountMap(): void {
    const map = new Map<string, number>();
    for (const t of this.tasks) {
      if (t.due && !t.completed && !t.deleted_at) {
        const key = t.due.slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    this._taskCountByDay = map;
  }

  // ── Event handlers ───────────────────────────────────────────────────

  private _onEventClick(e: MouseEvent, eventId: string): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("event-click", { detail: { eventId }, bubbles: true, composed: true }),
    );
  }

  private _onCellClick(dayKey: string, hour: number): void {
    const hh = String(hour).padStart(2, "0");
    this.dispatchEvent(
      new CustomEvent("cell-click", {
        detail: { date: dayKey, time: `${hh}:00` },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onAllDayCellClick(dayKey: string): void {
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: dayKey }, bubbles: true, composed: true }),
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  private _renderAllDayRow() {
    const hasAny = this._weekDays.some(
      (d) => (this._allDayByDay.get(dateKey(d))?.length ?? 0) > 0,
    );
    if (!hasAny) return nothing;

    return html`
      <div class="all-day-row" style="grid-template-columns: var(--grid-cols)">
        <div class="all-day-label">All day</div>
        ${this._weekDays.map((d) => {
          const key = dateKey(d);
          const evts = this._allDayByDay.get(key) ?? [];
          return html`
            <div class="all-day-cell" @click=${() => this._onAllDayCellClick(key)}>
              ${evts.map((ev) => {
                const cal = this.calendars.get(ev.calendar_id);
                const color = cal?.color ?? "var(--primary-color)";
                const isRecurring = !!ev.recurrence_rule;
                return html`
                  <div
                    class="all-day-chip"
                    style="--chip-color: ${color}"
                    @click=${(e: MouseEvent) => this._onEventClick(e, ev.id)}
                  >${isRecurring ? html`<span class="te-recur" title="Recurring">&#x1F501; </span>` : nothing}${ev.title}</div>
                `;
              })}
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderDayHeaders() {
    return this._weekDays.map((d) => {
      const key = dateKey(d);
      const isToday = key === this._todayKey;
      const isSelected = sameDay(d, this.selectedDate);
      const classes = ["day-header"];
      if (isToday) classes.push("today");
      if (isSelected) classes.push("selected");

      // Task count for this day (precomputed in willUpdate).
      const taskCount = this._taskCountByDay.get(key) ?? 0;

      return html`<div class=${classes.join(" ")}>${fmtDayHeader(d)}${taskCount > 0 ? html`<span class="day-task-count">${taskCount}</span>` : nothing}</div>`;
    });
  }

  private _renderCurrentTimeLine(dayDate: Date) {
    const key = dateKey(dayDate);
    if (key !== this._todayKey) return nothing;
    const mins = minutesInDay(this._now);
    const pct = (mins / 1440) * 100;
    return html`<div class="now-line" style="top: ${pct}%"></div>`;
  }

  private _renderTimedEvents(dayDate: Date) {
    const key = dateKey(dayDate);
    const dayEvents = this._timedByDay.get(key) ?? [];
    const positioned = layoutEvents(dayEvents, dayDate);

    return positioned.map((p) => {
      const cal = this.calendars.get(p.event.calendar_id);
      const color = cal?.color ?? "var(--primary-color)";
      const topPct = (p.startMin / 1440) * 100;
      const heightPct = ((p.endMin - p.startMin) / 1440) * 100;
      const widthPct = 100 / p.totalColumns;
      const leftPct = p.column * widthPct;

      const startDate = parseISO(p.event.start);
      const endDate = parseISO(p.event.end);

      // Look up template emoji if this event came from a template
      const tplEmoji = p.event.template_id
        ? this.templates.find((t) => t.id === p.event.template_id)?.emoji ?? ""
        : "";

      const isRecurring = !!p.event.recurrence_rule;

      return html`
        <div
          class="timed-event"
          style="
            top: ${topPct}%;
            height: ${heightPct}%;
            left: ${leftPct}%;
            width: ${widthPct}%;
            --chip-color: ${color};
          "
          title="${p.event.title}"
          @click=${(e: MouseEvent) => this._onEventClick(e, p.event.id)}
        >
          <span class="te-title">${tplEmoji ? html`<span class="te-emoji">${tplEmoji}</span>` : nothing}${isRecurring ? html`<span class="te-recur" title="Recurring">&#x1F501;</span>` : nothing}${p.event.title}</span>
          <span class="te-time">${fmtTime(startDate)} - ${fmtTime(endDate)}</span>
        </div>
      `;
    });
  }

  private _renderTimeGrid() {
    return html`
      <div class="time-grid-scroll">
        <div class="time-grid" style="grid-template-columns: var(--grid-cols)">
          <!-- Hour labels column -->
          <div class="hour-labels">
            ${HOURS.map(
              (h) => html`<div class="hour-label"><span>${fmtHour(h)}</span></div>`,
            )}
          </div>

          <!-- Day columns -->
          ${this._weekDays.map((d) => {
            const key = dateKey(d);
            const isToday = key === this._todayKey;
            return html`
              <div class="day-column ${isToday ? "today-col" : ""}">
                ${HOURS.map(
                  (h) => html`
                    <div
                      class="hour-cell"
                      @click=${() => this._onCellClick(key, h)}
                    ></div>
                  `,
                )}
                <div class="events-layer">
                  ${this._renderTimedEvents(d)}
                  ${this._renderCurrentTimeLine(d)}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  render() {
    const labelW = this.narrow ? "40px" : "56px";
    const dayW = this.narrow ? "104px" : "minmax(0, 1fr)";
    const gridCols = `${labelW} repeat(${this._weekDays.length}, ${dayW})`;
    return html`
      <div class="week-view" style="--grid-cols: ${gridCols}">
        <div class="week-pan">
          <div class="week-content">
            <div class="headers" style="grid-template-columns: ${gridCols}">
              <div class="corner"></div>
              ${this._renderDayHeaders()}
            </div>

            ${this._renderAllDayRow()}
            ${this._renderTimeGrid()}
          </div>
        </div>
      </div>
    `;
  }

  // ── Styles ───────────────────────────────────────────────────────────

  static styles = css`
    :host {
      display: block;
      --hour-height: 60px;
      --day-count: 7;
      --label-width: 56px;
      height: 100%;
    }

    .week-view {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .week-pan {
      flex: 1;
      min-height: 0;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x pan-y;
      overscroll-behavior-x: contain;
    }

    .week-content {
      min-width: 100%;
      height: 100%;
    }

    /* ── Header ────────────────────────────────────────────────────── */

    .headers {
      display: grid;
      grid-template-columns: var(--label-width) repeat(var(--day-count, 7), 1fr);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
    }

    .corner {
      /* Empty top-left corner */
    }

    .day-header {
      text-align: center;
      padding: 8px 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .day-header.today {
      color: var(--primary-color, #03a9f4);
    }

    .day-header.selected {
      font-weight: 700;
    }

    .day-task-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 14px;
      height: 14px;
      border-radius: 7px;
      background: var(--secondary-text-color, #999);
      color: #fff;
      font-size: 0.55rem;
      font-weight: 600;
      margin-left: 4px;
      padding: 0 3px;
      vertical-align: middle;
    }

    /* ── All-day row ───────────────────────────────────────────────── */

    .all-day-row {
      display: grid;
      grid-template-columns: var(--label-width) repeat(var(--day-count, 7), 1fr);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
      min-height: 28px;
    }

    .all-day-label {
      font-size: 0.65rem;
      color: var(--secondary-text-color, #666);
      padding: 4px;
      display: flex;
      align-items: start;
    }

    .all-day-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 2px;
      border-left: 1px solid var(--divider-color, #e0e0e0);
      cursor: pointer;
    }

    .all-day-chip {
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      color: var(--primary-text-color, #212121);
      border-left: 3px solid var(--chip-color);
      font-size: 0.7rem;
      border-radius: 4px;
      padding: 1px 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    .all-day-chip:hover {
      background: color-mix(in srgb, var(--chip-color) 20%, transparent);
    }

    /* ── Time grid (scrollable) ────────────────────────────────────── */

    .time-grid-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: visible;
      min-width: 0;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x pan-y;
    }

    .time-grid {
      display: grid;
      grid-template-columns: var(--label-width) repeat(var(--day-count, 7), 1fr);
      position: relative;
      height: calc(24 * var(--hour-height));
    }

    /* ── Hour labels ───────────────────────────────────────────────── */

    .hour-labels {
      display: flex;
      flex-direction: column;
    }

    .hour-label {
      height: var(--hour-height);
      display: flex;
      align-items: start;
      justify-content: flex-end;
      padding-right: 8px;
      box-sizing: border-box;
    }

    .hour-label span {
      font-size: 0.65rem;
      color: var(--secondary-text-color, #666);
      transform: translateY(-0.4em);
    }

    /* ── Day column ────────────────────────────────────────────────── */

    .day-column {
      position: relative;
      border-left: 1px solid var(--divider-color, #e0e0e0);
    }

    .day-column.today-col {
      background: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 4%,
        transparent
      );
    }

    .hour-cell {
      height: var(--hour-height);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      box-sizing: border-box;
      cursor: pointer;
    }

    .hour-cell:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }

    /* ── Events layer (positioned absolutely over hour cells) ─────── */

    .events-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .timed-event {
      position: absolute;
      left: 0;
      right: 0;
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      color: var(--primary-text-color, #212121);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 0.7rem;
      overflow: hidden;
      cursor: pointer;
      pointer-events: auto;
      box-sizing: border-box;
      border-left: 4px solid var(--chip-color);
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-height: 18px;
      z-index: 1;
      transition: background 0.15s ease;
    }

    .timed-event:hover {
      background: color-mix(in srgb, var(--chip-color) 20%, transparent);
      z-index: 2;
    }

    .te-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color, #212121);
    }

    .te-emoji {
      margin-right: 2px;
    }

    .te-recur {
      font-size: 0.55rem;
      opacity: 0.6;
      margin-right: 1px;
    }

    .te-time {
      font-size: 0.6rem;
      opacity: 0.7;
      white-space: nowrap;
      color: var(--secondary-text-color, #666);
    }

    /* ── Current-time line ─────────────────────────────────────────── */

    .now-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--error-color, #f44336);
      z-index: 3;
      pointer-events: none;
    }

    .now-line::before {
      content: "";
      position: absolute;
      left: -5px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--error-color, #f44336);
    }

    /* ── Responsive ────────────────────────────────────────────────── */

    @media (max-width: 600px) {
      :host {
        --hour-height: 48px;
        --label-width: 40px;
      }

      .week-content {
        min-width: calc(var(--label-width) + 7 * 104px);
      }

      .day-header {
        font-size: 0.75rem;
        padding: 6px 2px;
      }

      .hour-label span {
        font-size: 0.6rem;
      }

      .timed-event {
        font-size: 0.65rem;
        padding: 2px 4px;
      }

      .te-time {
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-week-view": CaleeWeekView;
  }
}
