import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "../views/month-view.js";
import "../views/week-view.js";
import "../views/day-view.js";
import "../views/agenda-view.js";

import type {
  CalendarSubView,
  Conflict,
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  ShiftTemplate,
} from "../store/types.js";

const CALENDAR_SUBVIEWS: Array<{ key: CalendarSubView; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "agenda", label: "Agenda" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr: string, months: number): string {
  const d = parseDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatMonthLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatDayLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAgendaLabel(dateStr: string): string {
  const start = parseDate(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

@customElement("calee-calendar-page")
export class CaleeCalendarPage extends LitElement {
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) templates: ShiftTemplate[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) conflicts: Conflict[] = [];
  @property({ type: Boolean }) weekStartsMonday = true;
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property({ type: String }) currentSubview: CalendarSubView = "week";
  @property({ type: String }) currentDate = todayISO();

  @state() private _subview: CalendarSubView = "week";
  @state() private _date = todayISO();

  override connectedCallback(): void {
    super.connectedCallback();
    this._subview = this.currentSubview;
    this._date = this.currentDate || todayISO();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has("currentSubview")) {
      this._subview = this.currentSubview;
    }
    if (changed.has("currentDate")) {
      this._date = this.currentDate || todayISO();
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--primary-color, #03a9f4) 4%, transparent),
        transparent 80%
      );
    }

    .shell {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px 12px;
      background: var(--card-background-color, #fff);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      flex-shrink: 0;
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--secondary-text-color, #727272);
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: space-between;
      min-width: 0;
    }

    .title-block {
      min-width: 0;
    }

    .title {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }

    .subtitle {
      margin-top: 4px;
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }

    .date-nav {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .nav-btn {
      appearance: none;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 10px;
      min-width: 36px;
      height: 36px;
      padding: 0 10px;
      font: inherit;
      font-size: 15px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }

    .nav-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      transform: translateY(-1px);
    }

    .nav-btn.today {
      font-size: 12px;
      font-weight: 600;
      min-width: 62px;
    }

    .nav-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .subview-bar {
      display: flex;
      gap: 8px;
      padding: 0 16px 12px;
      overflow-x: auto;
      flex-shrink: 0;
    }

    .subview-btn {
      appearance: none;
      border: none;
      border-radius: 999px;
      padding: 9px 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--secondary-text-color, #727272);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .subview-btn:hover {
      color: var(--primary-text-color, #212121);
      transform: translateY(-1px);
    }

    .subview-btn[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
      color: var(--primary-color, #03a9f4);
    }

    .content {
      min-height: 0;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .view-host {
      min-height: 0;
      flex: 1;
      overflow: hidden;
    }

    @media (max-width: 720px) {
      .header {
        gap: 10px;
        padding: 12px 12px 10px;
      }

      .title-row {
        align-items: flex-start;
        flex-direction: column;
      }

      .title {
        font-size: 21px;
      }

      .nav-label {
        display: none;
      }
    }
  `;

  private _emitSubviewChange(subview: CalendarSubView): void {
    this.dispatchEvent(
      new CustomEvent("calendar-subview-change", {
        detail: { subview },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _emitDateChange(date: string): void {
    this.dispatchEvent(
      new CustomEvent("calendar-date-change", {
        detail: { date },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _setSubview(subview: CalendarSubView): void {
    if (this._subview === subview) return;
    this._subview = subview;
    this._emitSubviewChange(subview);
  }

  private _setDate(date: string): void {
    if (!date || this._date === date) return;
    this._date = date;
    this._emitDateChange(date);
  }

  private _onPrev(): void {
    switch (this._subview) {
      case "day":
        this._setDate(addDays(this._date, -1));
        break;
      case "week":
        this._setDate(addDays(this._date, -7));
        break;
      case "month":
        this._setDate(addMonths(this._date, -1));
        break;
      case "agenda":
        this._setDate(addDays(this._date, -14));
        break;
    }
  }

  private _onNext(): void {
    switch (this._subview) {
      case "day":
        this._setDate(addDays(this._date, 1));
        break;
      case "week":
        this._setDate(addDays(this._date, 7));
        break;
      case "month":
        this._setDate(addMonths(this._date, 1));
        break;
      case "agenda":
        this._setDate(addDays(this._date, 14));
        break;
    }
  }

  private _onToday(): void {
    this._setDate(todayISO());
  }

  private _forwardInteraction(event: Event): void {
    event.stopPropagation();
    const detail = event instanceof CustomEvent ? event.detail : undefined;
    this.dispatchEvent(
      new CustomEvent(event.type, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderHeader() {
    const subtitle =
      this._subview === "day"
        ? formatDayLabel(this._date)
        : this._subview === "week"
          ? `Week of ${formatDayLabel(this._date)}`
          : this._subview === "month"
            ? formatMonthLabel(this._date)
            : formatAgendaLabel(this._date);

    return html`
      <div class="header">
        <div class="eyebrow">Calendar</div>
        <div class="title-row">
          <div class="title-block">
            <h2 class="title">${this._subview[0].toUpperCase()}${this._subview.slice(1)}</h2>
            <div class="subtitle">${subtitle}</div>
          </div>

          <div class="date-nav" aria-label="Calendar date navigation">
            <button class="nav-btn" @click=${this._onPrev} aria-label="Previous period">&lt;</button>
            <button class="nav-btn today" @click=${this._onToday}>Today</button>
            <button class="nav-btn" @click=${this._onNext} aria-label="Next period">&gt;</button>
          </div>
        </div>

        <div class="subview-bar" role="tablist" aria-label="Calendar views">
          ${CALENDAR_SUBVIEWS.map(
            (subview) => html`
              <button
                class="subview-btn"
                role="tab"
                ?active=${this._subview === subview.key}
                aria-selected=${(this._subview === subview.key).toString()}
                @click=${() => this._setSubview(subview.key)}
              >
                ${subview.label}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }

  private _renderActiveView() {
    const selectedDate = parseDate(this._date || todayISO());
    const common = {
      events: this.events,
      calendars: this.calendars,
      enabledCalendarIds: this.enabledCalendarIds,
      narrow: this.narrow,
    };

    switch (this._subview) {
      case "day":
        return html`
          <calee-day-view
            .events=${common.events}
            .calendars=${common.calendars}
            .enabledCalendarIds=${common.enabledCalendarIds}
            .selectedDate=${selectedDate}
            ?narrow=${common.narrow}
            @event-click=${this._forwardInteraction}
            @cell-click=${this._forwardInteraction}
          ></calee-day-view>
        `;
      case "week":
        return html`
          <calee-week-view
            .events=${common.events}
            .calendars=${common.calendars}
            .enabledCalendarIds=${common.enabledCalendarIds}
            .selectedDate=${selectedDate}
            .templates=${this.templates}
            .tasks=${this.tasks}
            .weekStartsMonday=${this.weekStartsMonday}
            ?narrow=${common.narrow}
            @event-click=${this._forwardInteraction}
            @cell-click=${this._forwardInteraction}
          ></calee-week-view>
        `;
      case "month":
        return html`
          <calee-month-view
            .events=${common.events}
            .calendars=${common.calendars}
            .enabledCalendarIds=${common.enabledCalendarIds}
            .selectedDate=${selectedDate}
            .templates=${this.templates}
            .tasks=${this.tasks}
            .conflicts=${this.conflicts}
            .weekStartsMonday=${this.weekStartsMonday}
            ?narrow=${common.narrow}
            @event-click=${this._forwardInteraction}
            @cell-click=${this._forwardInteraction}
          ></calee-month-view>
        `;
      case "agenda":
        return html`
          <calee-agenda-view
            .events=${common.events}
            .calendars=${common.calendars}
            @event-select=${this._forwardInteraction}
          ></calee-agenda-view>
        `;
      default:
        return nothing;
    }
  }

  render() {
    return html`
      <div class="shell">
        ${this._renderHeader()}
        <div class="content">
          <div class="view-host">
            ${this._renderActiveView()}
          </div>
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
