/**
 * <calee-calendar-page> -- Calendar page wrapper with internal sub-view switching.
 *
 * Keeps Day / Week / Month / Agenda inside one page surface while preserving
 * the existing child view interaction events.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type {
  CalendarSubView,
  Conflict,
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  ShiftTemplate,
} from "../store/types.js";

// Side-effect imports register the existing subviews.
import "../views/day-view.js";
import "../views/week-view.js";
import "../views/month-view.js";
import "../views/agenda-view.js";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function stepMonth(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(view: CalendarSubView, dateStr: string, weekStartsMonday = true): string {
  const d = new Date(`${dateStr}T00:00:00`);

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
    const dow = start.getDay();
    const diff = weekStartsMonday
      ? (dow === 0 ? -6 : 1 - dow)
      : -dow;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }

  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

@customElement("calee-calendar-page")
export class CaleeCalendarPage extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) templates: ShiftTemplate[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) conflicts: Conflict[] = [];
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property({ type: Boolean, reflect: true }) weekStartsMonday = true;
  @property() currentSubview: CalendarSubView = "week";
  @property() currentDate: string = todayISO();

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--primary-background-color, #fafafa);
    }

    .shell {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 12px;
      min-height: 44px;
      background: var(--card-background-color, #fff);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .title {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      letter-spacing: 0.15px;
      margin-right: 4px;
    }

    .segment {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border-radius: 999px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      overflow-x: auto;
      max-width: 100%;
    }

    .seg-btn {
      border: none;
      background: transparent;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      text-transform: capitalize;
      white-space: nowrap;
      font-family: inherit;
      line-height: 1;
      transition: background 0.15s, color 0.15s, box-shadow 0.15s;
    }

    .seg-btn:hover {
      color: var(--primary-text-color, #212121);
      background: rgba(0, 0, 0, 0.03);
    }

    .seg-btn[active] {
      color: var(--primary-text-color, #212121);
      background: var(--card-background-color, #fff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .spacer {
      flex: 1;
      min-width: 12px;
    }

    .date-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .nav-btn {
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
      font-family: inherit;
    }

    .nav-btn:hover {
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
      font-family: inherit;
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

    .view-area {
      flex: 1;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      display: flex;
    }

    .view-area > * {
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    @media (max-width: 767px) {
      .toolbar {
        padding: 8px 10px;
      }

      .title {
        display: none;
      }

      .date-label {
        max-width: 120px;
      }
    }
  `;

  private get _selectedDate(): Date {
    return new Date(`${this.currentDate}T00:00:00`);
  }

  private _dispatchViewChange(): void {
    this.dispatchEvent(
      new CustomEvent("calendar-subview-change", {
        detail: {
          subView: this.currentSubview,
          date: this.currentDate,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchDateChange(): void {
    this.dispatchEvent(
      new CustomEvent("calendar-date-change", {
        detail: {
          date: this.currentDate,
          subView: this.currentSubview,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _setSubview(subView: CalendarSubView): void {
    if (this.currentSubview === subView) return;
    this.currentSubview = subView;
    this._dispatchViewChange();
  }

  private _setDate(date: string): void {
    if (this.currentDate === date) return;
    this.currentDate = date;
    this._dispatchDateChange();
  }

  /** Navigation step: 3 days for narrow week, 7 for desktop week. */
  private get _weekStep(): number {
    return this.narrow ? 3 : 7;
  }

  private _onPrev(): void {
    if (this.currentSubview === "agenda") return;
    const step = this.currentSubview === "day" ? 1 : this.currentSubview === "week" ? this._weekStep : 0;
    const nextDate = step > 0 ? addDays(this.currentDate, -step) : stepMonth(this.currentDate, -1);
    this._setDate(nextDate);
  }

  private _onNext(): void {
    if (this.currentSubview === "agenda") return;
    const step = this.currentSubview === "day" ? 1 : this.currentSubview === "week" ? this._weekStep : 0;
    const nextDate = step > 0 ? addDays(this.currentDate, step) : stepMonth(this.currentDate, 1);
    this._setDate(nextDate);
  }

  private _onToday(): void {
    if (this.currentSubview === "agenda") return;
    this._setDate(todayISO());
  }

  private _bridgeEvent(e: Event): void {
    e.stopPropagation();
    const custom = e as CustomEvent<unknown>;
    this.dispatchEvent(
      new CustomEvent(custom.type, {
        detail: custom.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderToolbar() {
    const showDateNav = this.currentSubview !== "agenda";
    const dateLabel = this.currentSubview === "agenda"
      ? "Next 14 days"
      : formatDateLabel(this.currentSubview, this.currentDate, this.weekStartsMonday);

    return html`
      <div class="toolbar">
        <span class="title">Calendar</span>
        <div class="segment" role="tablist" aria-label="Calendar views">
          ${(["day", "week", "month", "agenda"] as CalendarSubView[]).map(
            (view) => html`
              <button
                class="seg-btn"
                role="tab"
                ?active=${this.currentSubview === view}
                aria-selected=${String(this.currentSubview === view)}
                @click=${() => this._setSubview(view)}
              >${view}</button>
            `,
          )}
        </div>
        <div class="spacer"></div>
        ${showDateNav
          ? html`
              <div class="date-nav">
                <button class="nav-btn" @click=${this._onPrev} aria-label="Previous">
                  &lsaquo;
                </button>
                <button class="today-btn" @click=${this._onToday}>Today</button>
                <button class="nav-btn" @click=${this._onNext} aria-label="Next">
                  &rsaquo;
                </button>
                <span class="date-label">${dateLabel}</span>
              </div>
            `
          : html`<span class="date-label">${dateLabel}</span>`}
      </div>
    `;
  }

  private _renderSubview() {
    const selectedDate = this._selectedDate;

    switch (this.currentSubview) {
      case "month":
        return html`<calee-month-view
          .events=${this.events}
          .calendars=${this.calendars}
          .enabledCalendarIds=${this.enabledCalendarIds}
          .selectedDate=${selectedDate}
          .templates=${this.templates}
          .tasks=${this.tasks}
          .conflicts=${this.conflicts}
          .weekStartsMonday=${this.weekStartsMonday}
          ?narrow=${this.narrow}
          @event-click=${this._bridgeEvent}
          @cell-click=${this._bridgeEvent}
        ></calee-month-view>`;

      case "week":
        return html`<calee-week-view
          .events=${this.events}
          .calendars=${this.calendars}
          .enabledCalendarIds=${this.enabledCalendarIds}
          .selectedDate=${selectedDate}
          .templates=${this.templates}
          .tasks=${this.tasks}
          .weekStartsMonday=${this.weekStartsMonday}
          ?narrow=${this.narrow}
          @event-click=${this._bridgeEvent}
          @cell-click=${this._bridgeEvent}
        ></calee-week-view>`;

      case "day":
        return html`<calee-day-view
          .events=${this.events}
          .calendars=${this.calendars}
          .enabledCalendarIds=${this.enabledCalendarIds}
          .selectedDate=${selectedDate}
          @event-click=${this._bridgeEvent}
          @cell-click=${this._bridgeEvent}
        ></calee-day-view>`;

      case "agenda":
        return html`<calee-agenda-view
          .events=${this.events}
          .calendars=${this.calendars}
          @event-select=${this._bridgeEvent}
        ></calee-agenda-view>`;

      default:
        return nothing;
    }
  }

  render() {
    return html`
      <div class="shell">
        ${this._renderToolbar()}
        <div class="view-area">
          ${this._renderSubview()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-calendar-page": CaleeCalendarPage;
  }
}
