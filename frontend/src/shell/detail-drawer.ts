/**
 * <calee-detail-drawer> -- Desktop right-side detail panel.
 *
 * Shows event or task details with edit/delete actions.
 * Only visible on non-narrow viewports.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type {
  PlannerEvent,
  PlannerTask,
  PlannerCalendar,
  PlannerList,
  Conflict,
} from "../store/types.js";

@customElement("calee-detail-drawer")
export class CaleeDetailDrawer extends LitElement {
  @property({ attribute: false }) item: PlannerEvent | PlannerTask | null = null;
  @property() itemType: "event" | "task" | null = null;
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) calendars: PlannerCalendar[] = [];
  @property({ attribute: false }) lists: PlannerList[] = [];
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) conflicts: Conflict[] = [];

  private _close(): void {
    this.dispatchEvent(new CustomEvent("drawer-close", { bubbles: true, composed: true }));
  }

  private _edit(): void {
    this.dispatchEvent(
      new CustomEvent("drawer-edit", {
        detail: { item: this.item, itemType: this.itemType },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _delete(): void {
    this.dispatchEvent(
      new CustomEvent("drawer-delete", {
        detail: { item: this.item, itemType: this.itemType },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _editOccurrence(action: "edit-this" | "edit-all" | "delete-this" | "delete-all"): void {
    this.dispatchEvent(
      new CustomEvent("drawer-recurring-action", {
        detail: { event: this.item, action },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    :host {
      display: block;
      width: 360px;
      min-width: 360px;
      background: var(--card-background-color, #fff);
      border-left: 1px solid var(--divider-color, #e0e0e0);
      overflow-y: auto;
      padding: 20px;
      transition: width 0.2s ease, min-width 0.2s ease;
      z-index: 3;
    }

    :host([hidden]) {
      width: 0;
      min-width: 0;
      padding: 0;
      overflow: hidden;
      border-left-width: 0;
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

    .close-btn {
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
    .close-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .field {
      margin-bottom: 14px;
    }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 4px;
    }

    .field-value {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      line-height: 1.4;
    }

    .field-value.muted {
      color: var(--secondary-text-color, #757575);
      font-style: italic;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .btn {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }

    .btn-edit {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }
    .btn-edit:hover { filter: brightness(1.1); }

    .btn-delete {
      background: transparent;
      color: var(--error-color, #f44336);
      border: 1px solid var(--error-color, #f44336);
    }
    .btn-delete:hover {
      background: color-mix(in srgb, var(--error-color, #f44336) 10%, transparent);
    }

    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--secondary-text-color, #757575);
    }

    .conflict-banner {
      background: color-mix(in srgb, var(--warning-color, #ff9800) 12%, transparent);
      border: 1px solid var(--warning-color, #ff9800);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 12px;
      color: var(--primary-text-color, #212121);
    }

    .conflict-banner strong {
      color: var(--warning-color, #ff9800);
    }

    @media (min-width: 768px) and (max-width: 1024px) {
      :host {
        width: 300px;
        min-width: 300px;
      }
    }

    @media (max-width: 767px) {
      :host {
        display: none;
      }
    }
  `;

  render() {
    if (!this.open || !this.item) {
      this.setAttribute("hidden", "");
      return nothing;
    }
    this.removeAttribute("hidden");

    if (this.itemType === "event") {
      return this._renderEventDetail(this.item as PlannerEvent);
    }
    return this._renderTaskDetail(this.item as PlannerTask);
  }

  private _getCalendarMap(): Map<string, PlannerCalendar> {
    const map = new Map<string, PlannerCalendar>();
    for (const c of this.calendars) map.set(c.id, c);
    return map;
  }

  private _renderEventDetail(event: PlannerEvent) {
    const calMap = this._getCalendarMap();
    const cal = calMap.get(event.calendar_id);
    const start = new Date(event.start);
    const end = new Date(event.end);

    const eventConflicts = this.conflicts.filter(
      (c) => c.eventA.id === event.id || c.eventB.id === event.id,
    );
    const conflictNames = eventConflicts.map((c) => {
      const other = c.eventA.id === event.id ? c.eventB : c.eventA;
      return other.title;
    });

    const dateOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

    const linkedTasks = this.tasks.filter(
      (t) => t.related_event_id === event.id && !t.deleted_at,
    );

    return html`
      <div class="drawer-header">
        <h3>Event</h3>
        <button class="close-btn" @click=${this._close}>&times;</button>
      </div>

      ${conflictNames.length > 0 ? html`
        <div class="conflict-banner">
          <strong>Conflict:</strong> Overlaps with ${conflictNames.join(", ")}
        </div>
      ` : nothing}

      <div class="field">
        <div class="field-label">Title</div>
        <div class="field-value">${event.title}</div>
      </div>

      <div class="field">
        <div class="field-label">Calendar</div>
        <div class="field-value">
          ${cal ? html`<span style="display:inline-flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${cal.color};display:inline-block;"></span>
            ${cal.name}
          </span>` : html`<span class="muted">Unknown</span>`}
        </div>
      </div>

      <div class="field">
        <div class="field-label">Start</div>
        <div class="field-value">
          ${event.all_day
            ? start.toLocaleDateString(undefined, dateOpts)
            : html`${start.toLocaleDateString(undefined, dateOpts)} at ${start.toLocaleTimeString(undefined, timeOpts)}`}
        </div>
      </div>

      <div class="field">
        <div class="field-label">End</div>
        <div class="field-value">
          ${event.all_day
            ? end.toLocaleDateString(undefined, dateOpts)
            : html`${end.toLocaleDateString(undefined, dateOpts)} at ${end.toLocaleTimeString(undefined, timeOpts)}`}
        </div>
      </div>

      ${event.recurrence_rule ? html`
        <div class="field">
          <div class="field-label">Recurrence</div>
          <div class="field-value"><span class="badge">${event.recurrence_rule}</span></div>
        </div>
      ` : nothing}

      <div class="field">
        <div class="field-label">Note</div>
        <div class="field-value ${event.note ? "" : "muted"}">${event.note || "No note"}</div>
      </div>

      ${linkedTasks.length > 0 ? html`
        <div class="field">
          <div class="field-label">Linked Tasks</div>
          ${linkedTasks.map(
            (t) => html`<div class="field-value" style="margin-bottom:4px;">
              ${t.completed ? html`<s>${t.title}</s>` : t.title}
            </div>`,
          )}
        </div>
      ` : nothing}

      ${event.is_recurring_instance ? html`
        <div class="actions" style="flex-wrap:wrap;">
          <button class="btn btn-edit" @click=${() => this._editOccurrence("edit-this")}>Edit this occurrence</button>
          <button class="btn btn-edit" style="background:var(--secondary-text-color,#727272);" @click=${() => this._editOccurrence("edit-all")}>Edit all</button>
          <button class="btn btn-delete" @click=${() => this._editOccurrence("delete-this")}>Delete this occurrence</button>
          <button class="btn btn-delete" @click=${() => this._editOccurrence("delete-all")}>Delete all</button>
        </div>
      ` : html`
        <div class="actions">
          <button class="btn btn-edit" @click=${this._edit}>Edit</button>
          <button class="btn btn-delete" @click=${this._delete}>Delete</button>
        </div>
      `}
    `;
  }

  private _renderTaskDetail(task: PlannerTask) {
    const list = this.lists.find((l) => l.id === task.list_id);
    const linkedEvent = task.related_event_id
      ? this.events.find((e) => e.id === task.related_event_id)
      : null;

    return html`
      <div class="drawer-header">
        <h3>Task</h3>
        <button class="close-btn" @click=${this._close}>&times;</button>
      </div>

      <div class="field">
        <div class="field-label">Title</div>
        <div class="field-value">${task.completed ? html`<s>${task.title}</s>` : task.title}</div>
      </div>

      <div class="field">
        <div class="field-label">List</div>
        <div class="field-value">${list?.name ?? task.list_id}</div>
      </div>

      ${task.due ? html`
        <div class="field">
          <div class="field-label">Due Date</div>
          <div class="field-value">
            ${new Date(task.due + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short", month: "short", day: "numeric", year: "numeric",
            })}
          </div>
        </div>
      ` : nothing}

      ${task.recurrence_rule ? html`
        <div class="field">
          <div class="field-label">Recurrence</div>
          <div class="field-value"><span class="badge">${task.recurrence_rule}</span></div>
        </div>
      ` : nothing}

      <div class="field">
        <div class="field-label">Note</div>
        <div class="field-value ${task.note ? "" : "muted"}">${task.note || "No note"}</div>
      </div>

      ${linkedEvent ? html`
        <div class="field">
          <div class="field-label">Linked Event</div>
          <div class="field-value">${linkedEvent.title}</div>
        </div>
      ` : nothing}

      <div class="actions">
        <button class="btn btn-edit" @click=${this._edit}>Open in Tasks</button>
        <button class="btn btn-delete" @click=${this._delete}>Delete</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-detail-drawer": CaleeDetailDrawer;
  }
}
