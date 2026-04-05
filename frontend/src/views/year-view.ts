import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
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

const MONTH_NAMES = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Build a grid of weeks for a given month. Each week is 7 cells (Mon-Sun).
 *  Cells outside the month are null. */
function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // getDay() returns 0=Sun..6=Sat; we want 0=Mon..6=Sun
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(startDow).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  // Pad the last week
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
}

// ── Component ──────────────────────────────────────────────────────────

@customElement("calee-year-view")
export class CaleeYearView extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) selectedDate: Date = new Date();

  @state() private _eventsByDay: Map<string, { calendarId: string; color: string }[]> = new Map();
  private _todayKey = dateKey(new Date());

  // ── Lifecycle ────────────────────────────────────────────────────────

  willUpdate(changed: PropertyValues): void {
    if (
      changed.has("events") ||
      changed.has("enabledCalendarIds") ||
      changed.has("calendars")
    ) {
      this._buildEventMap();
    }
  }

  private _buildEventMap(): void {
    const map = new Map<string, { calendarId: string; color: string }[]>();

    const visible = this.events.filter(
      (e) => !e.deleted_at && this.enabledCalendarIds.has(e.calendar_id),
    );

    for (const ev of visible) {
      const evStart = parseISO(ev.start);
      const evEnd = parseISO(ev.end);

      // Walk each day this event spans
      const d = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
      const endDay = new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate());
      // For events ending at midnight, don't count the next day
      if (evEnd.getHours() === 0 && evEnd.getMinutes() === 0 && evEnd.getTime() > evStart.getTime()) {
        endDay.setDate(endDay.getDate() - 1);
      }

      while (d <= endDay) {
        const key = dateKey(d);
        if (!map.has(key)) map.set(key, []);
        const cal = this.calendars.get(ev.calendar_id);
        const color = cal?.color ?? "var(--primary-color)";
        // Avoid duplicate calendar dots on same day
        const existing = map.get(key)!;
        if (!existing.find((e) => e.calendarId === ev.calendar_id)) {
          existing.push({ calendarId: ev.calendar_id, color });
        }
        d.setDate(d.getDate() + 1);
      }
    }

    this._eventsByDay = map;
  }

  // ── Event handlers ───────────────────────────────────────────────────

  private _onDayClick(year: number, month: number, day: number): void {
    const m = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${year}-${m}-${dd}`;
    this.dispatchEvent(
      new CustomEvent("day-click", {
        detail: { date: dateStr },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  private _renderMiniMonth(year: number, month: number) {
    const weeks = buildMonthGrid(year, month);

    return html`
      <div class="mini-month">
        <div class="mini-month-title">${MONTH_NAMES[month]}</div>
        <div class="mini-grid">
          ${DAY_HEADERS.map((h) => html`<div class="day-header">${h}</div>`)}
          ${weeks.map((week) =>
            week.map((day) => {
              if (day === null) {
                return html`<div class="day-cell empty"></div>`;
              }
              const m = String(month + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const key = `${year}-${m}-${dd}`;
              const isToday = key === this._todayKey;
              const dots = this._eventsByDay.get(key) ?? [];
              const maxDots = dots.slice(0, 3); // show at most 3 dots

              return html`
                <div
                  class="day-cell ${isToday ? "today" : ""}"
                  @click=${() => this._onDayClick(year, month, day)}
                >
                  <span class="day-num">${day}</span>
                  ${maxDots.length > 0
                    ? html`<div class="dot-row">
                        ${maxDots.map(
                          (d) => html`<span class="dot" style="background:${d.color}"></span>`,
                        )}
                      </div>`
                    : nothing}
                </div>
              `;
            }),
          )}
        </div>
      </div>
    `;
  }

  render() {
    const year = this.selectedDate.getFullYear();
    this._todayKey = dateKey(new Date());

    return html`
      <div class="year-view">
        <div class="months-grid">
          ${Array.from({ length: 12 }, (_, i) => this._renderMiniMonth(year, i))}
        </div>
      </div>
    `;
  }

  // ── Styles ───────────────────────────────────────────────────────────

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .year-view {
      padding: 16px;
    }

    .months-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* ── Mini month ────────────────────────────────────────────── */

    .mini-month {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
    }

    .mini-month-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      text-align: center;
      margin-bottom: 8px;
    }

    .mini-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
    }

    .day-header {
      font-size: 0.6rem;
      font-weight: 600;
      color: var(--secondary-text-color, #999);
      text-align: center;
      padding: 2px 0 4px;
      text-transform: uppercase;
    }

    .day-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.12s;
      position: relative;
      padding: 2px 0;
    }

    .day-cell.empty {
      cursor: default;
    }

    .day-cell:not(.empty):hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .day-cell.today .day-num {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .day-num {
      font-size: 0.7rem;
      color: var(--primary-text-color, #212121);
      line-height: 1;
    }

    .dot-row {
      display: flex;
      gap: 2px;
      margin-top: 2px;
      justify-content: center;
    }

    .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Responsive ────────────────────────────────────────────── */

    @media (max-width: 900px) {
      .months-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
    }

    @media (max-width: 700px) {
      .months-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .year-view {
        padding: 12px;
      }
    }

    @media (max-width: 400px) {
      .months-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-year-view": CaleeYearView;
  }
}
