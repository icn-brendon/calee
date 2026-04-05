import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { PlannerEvent, PlannerCalendar } from "../store/types.js";

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

function fmtDayTitle(d: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function minutesInDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// ── Column layout for overlapping events ──────────────────────────────

interface PositionedEvent {
  event: PlannerEvent;
  startMin: number;
  endMin: number;
  column: number;
  totalColumns: number;
}

function layoutEvents(events: PlannerEvent[], dayDate: Date): PositionedEvent[] {
  const dayStart = startOfDay(dayDate).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const items: { event: PlannerEvent; startMin: number; endMin: number }[] = [];

  for (const ev of events) {
    const evStart = parseISO(ev.start);
    const evEnd = parseISO(ev.end);

    const clampedStart = Math.max(evStart.getTime(), dayStart);
    const clampedEnd = Math.min(evEnd.getTime(), dayEnd);
    if (clampedEnd <= clampedStart) continue;

    const startMin = Math.round((clampedStart - dayStart) / 60000);
    const endMin = Math.round((clampedEnd - dayStart) / 60000);

    items.push({ event: ev, startMin, endMin: Math.max(endMin, startMin + 15) });
  }

  items.sort(
    (a, b) =>
      a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin),
  );

  // Greedy column assignment
  const columns: number[][] = [];
  const positioned: PositionedEvent[] = [];

  for (const item of items) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
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

  const totalCols = Math.max(columns.length, 1);
  for (const p of positioned) {
    p.totalColumns = totalCols;
  }

  return positioned;
}

// ── Constants ──────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ── Component ──────────────────────────────────────────────────────────

@customElement("calee-day-view")
export class CaleeDayView extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) selectedDate: Date = new Date();

  @state() private _allDayEvents: PlannerEvent[] = [];
  @state() private _timedEvents: PlannerEvent[] = [];
  @state() private _now: Date = new Date();

  @query(".time-grid-scroll") private _scrollContainer!: HTMLElement;

  private _todayKey = dateKey(new Date());
  private _timerHandle = 0;
  private _hasScrolled = false;

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

  willUpdate(changed: PropertyValues): void {
    if (
      changed.has("events") ||
      changed.has("enabledCalendarIds") ||
      changed.has("selectedDate")
    ) {
      this._categoriseEvents();
    }
  }

  firstUpdated(): void {
    this._scrollToCurrentTime();
  }

  updated(_changed: PropertyValues): void {
    // No-op: willUpdate already handles selectedDate changes.
    // Scroll is intentionally only called once in firstUpdated.
  }

  private _scrollToCurrentTime(): void {
    if (this._hasScrolled) return;
    this._hasScrolled = true;
    requestAnimationFrame(() => {
      if (!this._scrollContainer) return;
      const hourPx = 60;
      const now = new Date();
      const target = Math.max(0, now.getHours() - 2) * hourPx;
      this._scrollContainer.scrollTop = target;
    });
  }

  private _categoriseEvents(): void {
    const visible = this.events.filter(
      (e) => !e.deleted_at && this.enabledCalendarIds.has(e.calendar_id),
    );

    const dayStart = startOfDay(this.selectedDate);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const allDay: PlannerEvent[] = [];
    const timed: PlannerEvent[] = [];

    for (const ev of visible) {
      const evStart = parseISO(ev.start);
      const evEnd = parseISO(ev.end);

      // Does this event overlap the selected day?
      if (evEnd.getTime() <= dayStart.getTime() || evStart.getTime() >= dayEnd.getTime()) {
        continue;
      }

      if (ev.all_day) {
        allDay.push(ev);
      } else {
        timed.push(ev);
      }
    }

    this._allDayEvents = allDay;
    this._timedEvents = timed;
  }

  // ── Event handlers ───────────────────────────────────────────────────

  private _onEventClick(e: MouseEvent, eventId: string): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("event-click", { detail: { eventId }, bubbles: true, composed: true }),
    );
  }

  private _onCellClick(hour: number): void {
    const key = dateKey(this.selectedDate);
    const hh = String(hour).padStart(2, "0");
    this.dispatchEvent(
      new CustomEvent("cell-click", {
        detail: { date: key, time: `${hh}:00` },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onAllDayClick(): void {
    const key = dateKey(this.selectedDate);
    this.dispatchEvent(
      new CustomEvent("cell-click", { detail: { date: key }, bubbles: true, composed: true }),
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  private _renderAllDayBar() {
    if (this._allDayEvents.length === 0) return nothing;

    return html`
      <div class="all-day-bar" @click=${this._onAllDayClick}>
        <div class="all-day-label">All day</div>
        <div class="all-day-events">
          ${this._allDayEvents.map((ev) => {
            const cal = this.calendars.get(ev.calendar_id);
            const color = cal?.color ?? "var(--primary-color)";
            return html`
              <div
                class="all-day-chip"
                style="--chip-color: ${color}"
                @click=${(e: MouseEvent) => this._onEventClick(e, ev.id)}
              >${ev.title}</div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private _renderCurrentTimeLine() {
    const key = dateKey(this.selectedDate);
    if (key !== this._todayKey) return nothing;
    const mins = minutesInDay(this._now);
    const pct = (mins / 1440) * 100;
    return html`<div class="now-line" style="top: ${pct}%"></div>`;
  }

  private _renderTimedEvents() {
    const positioned = layoutEvents(this._timedEvents, this.selectedDate);

    return positioned.map((p) => {
      const cal = this.calendars.get(p.event.calendar_id);
      const color = cal?.color ?? "var(--primary-color)";
      const topPct = (p.startMin / 1440) * 100;
      const heightPct = ((p.endMin - p.startMin) / 1440) * 100;
      const widthPct = 100 / p.totalColumns;
      const leftPct = p.column * widthPct;

      const evStart = parseISO(p.event.start);
      const evEnd = parseISO(p.event.end);
      const durationMin = p.endMin - p.startMin;
      const showDetails = durationMin >= 45;
      const notePreview =
        p.event.note.length > 60 ? p.event.note.slice(0, 60) + "..." : p.event.note;

      return html`
        <div
          class="timed-event ${durationMin < 30 ? "compact" : ""}"
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
          <div class="te-header">
            <span class="te-title">${p.event.title}</span>
            <span class="te-time">${fmtTime(evStart)} - ${fmtTime(evEnd)}</span>
          </div>
          ${showDetails && p.event.note
            ? html`<div class="te-note">${notePreview}</div>`
            : nothing}
        </div>
      `;
    });
  }

  render() {
    const isToday = dateKey(this.selectedDate) === this._todayKey;

    return html`
      <div class="day-view">
        <div class="day-title ${isToday ? "today" : ""}">
          ${fmtDayTitle(this.selectedDate)}
          ${isToday ? html`<span class="today-badge">Today</span>` : nothing}
        </div>

        ${this._renderAllDayBar()}

        <div class="time-grid-scroll">
          <div class="time-grid">
            <div class="hour-labels">
              ${HOURS.map(
                (h) => html`<div class="hour-label"><span>${fmtHour(h)}</span></div>`,
              )}
            </div>
            <div class="day-column ${isToday ? "today-col" : ""}">
              ${HOURS.map(
                (h) => html`
                  <div class="hour-cell" @click=${() => this._onCellClick(h)}></div>
                `,
              )}
              <div class="events-layer">
                ${this._renderTimedEvents()}
                ${this._renderCurrentTimeLine()}
              </div>
            </div>
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
      height: 100%;
    }

    .day-view {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ── Day title header ──────────────────────────────────────────── */

    .day-title {
      padding: 12px 16px 8px;
      font-size: 1rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .day-title.today {
      color: var(--primary-color, #03a9f4);
    }

    .today-badge {
      font-size: 0.7rem;
      font-weight: 600;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 10px;
      padding: 2px 8px;
    }

    /* ── All-day bar ───────────────────────────────────────────────── */

    .all-day-bar {
      display: flex;
      align-items: start;
      gap: 8px;
      padding: 6px 16px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
      cursor: pointer;
    }

    .all-day-label {
      font-size: 0.7rem;
      color: var(--secondary-text-color, #666);
      padding-top: 2px;
      flex-shrink: 0;
    }

    .all-day-events {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .all-day-chip {
      background: var(--chip-color);
      color: #fff;
      font-size: 0.8rem;
      border-radius: 4px;
      padding: 3px 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: filter 0.15s ease;
    }

    .all-day-chip:hover {
      filter: brightness(1.15);
    }

    /* ── Time grid (scrollable) ────────────────────────────────────── */

    .time-grid-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .time-grid {
      display: grid;
      grid-template-columns: 56px 1fr;
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
      padding-right: 12px;
      box-sizing: border-box;
    }

    .hour-label span {
      font-size: 0.7rem;
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

    /* ── Events layer ──────────────────────────────────────────────── */

    .events-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .timed-event {
      position: absolute;
      background: var(--chip-color);
      color: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.85rem;
      overflow: hidden;
      cursor: pointer;
      pointer-events: auto;
      box-sizing: border-box;
      border-left: 4px solid color-mix(in srgb, var(--chip-color) 65%, #000);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-height: 22px;
      z-index: 1;
      transition: filter 0.15s ease;
    }

    .timed-event.compact {
      padding: 2px 8px;
      font-size: 0.75rem;
    }

    .timed-event.compact .te-header {
      flex-direction: row;
      gap: 6px;
      align-items: center;
    }

    .timed-event:hover {
      filter: brightness(1.12);
      z-index: 2;
    }

    .te-header {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .te-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .te-time {
      font-size: 0.75rem;
      opacity: 0.85;
      white-space: nowrap;
    }

    .compact .te-time {
      font-size: 0.65rem;
    }

    .te-note {
      font-size: 0.7rem;
      opacity: 0.8;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
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
      }

      .day-title {
        font-size: 0.9rem;
        padding: 8px 12px 6px;
      }

      .time-grid {
        grid-template-columns: 40px 1fr;
      }

      .hour-label span {
        font-size: 0.6rem;
      }

      .timed-event {
        font-size: 0.75rem;
        padding: 4px 8px;
      }

      .te-note {
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-day-view": CaleeDayView;
  }
}
