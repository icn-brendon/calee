/**
 * <calee-agenda-view> — Chronological list of upcoming events grouped by date.
 *
 * Shows the next 14 days of events with date section headers such as
 * "Today", "Tomorrow", or "Wednesday Apr 8".
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerEvent, PlannerCalendar } from "../store/types.js";

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Strip time portion and return YYYY-MM-DD in local timezone. */
function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateHeader(dateKey: string, today: Date): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const todayKey = toLocalDateKey(today.toISOString());
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrowDate.toISOString());

  if (dateKey === todayKey) return "Today";
  if (dateKey === tomorrowKey) return "Tomorrow";

  return target.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface DateGroup {
  dateKey: string;
  label: string;
  events: PlannerEvent[];
}

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-agenda-view")
export class CaleeAgendaView extends LitElement {
  @property({ type: Array }) events: PlannerEvent[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> =
    new Map();

  @state() private _groups: DateGroup[] = [];

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      --agenda-bg: var(--card-background-color, #fff);
      --agenda-border: var(--divider-color, #e0e0e0);
      --agenda-text: var(--primary-text-color, #212121);
      --agenda-secondary: var(--secondary-text-color, #757575);
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--agenda-secondary);
      font-size: 14px;
    }

    .date-group + .date-group {
      margin-top: 24px;
    }

    .date-header {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--agenda-secondary);
      padding: 0 0 8px;
      border-bottom: 1px solid var(--agenda-border);
      margin-bottom: 8px;
    }

    .event-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .event-row:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 5px;
    }

    .event-info {
      flex: 1;
      min-width: 0;
    }

    .event-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--agenda-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-time {
      font-size: 12px;
      color: var(--agenda-secondary);
      margin-top: 2px;
    }

    .event-note {
      font-size: 12px;
      color: var(--agenda-secondary);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.8;
    }

    .all-day-badge {
      font-size: 11px;
      font-weight: 500;
      background: var(--primary-color, #03a9f4);
      color: #fff;
      padding: 1px 6px;
      border-radius: 4px;
    }
  `;

  willUpdate(changed: PropertyValues): void {
    if (changed.has("events")) {
      this._buildGroups();
    }
  }

  private _buildGroups(): void {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);

    // Filter to future events within 14 days, non-deleted
    const visible = this.events
      .filter((e) => {
        if (e.deleted_at) return false;
        const start = new Date(e.start);
        return start >= new Date(now.toDateString()) && start <= cutoff;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Group by local date
    const map = new Map<string, PlannerEvent[]>();
    for (const ev of visible) {
      const key = toLocalDateKey(ev.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }

    this._groups = [...map.entries()].map(([dateKey, events]) => ({
      dateKey,
      label: formatDateHeader(dateKey, now),
      events,
    }));
  }

  private _calendarColor(calendarId: string): string {
    return this.calendars.get(calendarId)?.color ?? "#9e9e9e";
  }

  private _onEventClick(ev: PlannerEvent): void {
    this.dispatchEvent(
      new CustomEvent("event-select", {
        detail: { event: ev },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (this._groups.length === 0) {
      return html`<div class="empty">No upcoming events</div>`;
    }

    return html`
      ${this._groups.map(
        (g) => html`
          <div class="date-group">
            <div class="date-header">${g.label}</div>
            ${g.events.map((ev) => this._renderEvent(ev))}
          </div>
        `,
      )}
    `;
  }

  private _renderEvent(ev: PlannerEvent) {
    const color = this._calendarColor(ev.calendar_id);
    return html`
      <div class="event-row" @click=${() => this._onEventClick(ev)}>
        <span class="dot" style="background:${color}"></span>
        <div class="event-info">
          <div class="event-title">${ev.title}</div>
          <div class="event-time">
            ${ev.all_day
              ? html`<span class="all-day-badge">All day</span>`
              : html`${formatTime(ev.start)} &ndash; ${formatTime(ev.end)}`}
          </div>
          ${ev.note
            ? html`<div class="event-note">${ev.note}</div>`
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-agenda-view": CaleeAgendaView;
  }
}
