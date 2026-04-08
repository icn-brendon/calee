/**
 * <calee-event-dialog> — Modal for creating / editing planner events.
 *
 * Dispatches `event-save`, `event-delete`, and `dialog-close` custom events.
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  EventNotificationDraft,
  NotifyServiceOption,
  PlannerCalendar,
  PlannerEvent,
} from "../store/types.js";

/* ── Helpers ─────────────────────────────────────────────────────────── */

const RECURRENCE_OPTIONS: { label: string; value: string }[] = [
  { label: "None", value: "" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Fortnightly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];

/** Convert ISO string to `YYYY-MM-DDTHH:MM` for <input type=datetime-local>. */
function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-event-dialog")
export class CaleeEventDialog extends LitElement {
  @property({ type: Object }) event: PlannerEvent | null = null;
  @property({ type: Array }) calendars: PlannerCalendar[] = [];
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Object }) defaults: { date?: string; time?: string; calendar_id?: string } = {};
  @property({ type: Array }) notifyServices: NotifyServiceOption[] = [];
  @property({ type: Object }) notificationDraft: EventNotificationDraft | null = null;

  @state() private _title = "";
  @state() private _calendarId = "";
  @state() private _start = "";
  @state() private _end = "";
  @state() private _note = "";
  @state() private _recurrenceRule = "";
  @state() private _templateId: string | null = null;
  @state() private _notificationMode: EventNotificationDraft["mode"] = "global";
  @state() private _notificationRuleId: string | null = null;
  @state() private _notificationReminderMinutes = 60;
  @state() private _notificationService = "";
  @state() private _notificationIncludeActions = true;

  static styles = css`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    /* ── Backdrop ────────────────────────────────────────────────── */

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease;
      padding: 16px;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
    }

    /* ── Dialog card ─────────────────────────────────────────────── */

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 440px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(24px); opacity: 0; }
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 20px;
    }

    /* ── Form ────────────────────────────────────────────────────── */

    .field {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 4px;
    }

    input,
    select,
    textarea {
      width: 100%;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
      font-family: inherit;
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    textarea {
      min-height: 80px;
      resize: vertical;
    }

    .row {
      display: flex;
      gap: 12px;
    }
    .row .field {
      flex: 1;
    }

    /* ── Buttons ──────────────────────────────────────────────────── */

    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .btn {
      font-size: 14px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    .btn:hover {
      opacity: 0.9;
    }

    .btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .btn-delete {
      background: var(--error-color, #f44336);
      color: #fff;
      margin-right: auto;
    }

    .btn-save {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    /* ── Recurrence pills ────────────────────────────────────── */

    .recurrence-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 0;
    }
    .rec-pill {
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .rec-pill[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, transparent);
      border-color: var(--primary-color, #03a9f4);
      color: var(--primary-color, #03a9f4);
    }

    .section-card {
      margin-top: 8px;
      padding: 14px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin-bottom: 4px;
    }

    .section-hint {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 10px;
      line-height: 1.4;
    }

    .mode-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 0 12px;
    }

    .mode-pill {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .mode-pill[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, transparent);
      border-color: var(--primary-color, #03a9f4);
      color: var(--primary-color, #03a9f4);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid color-mix(in srgb, var(--divider-color, #e0e0e0) 70%, transparent);
    }

    .toggle-label {
      font-size: 13px;
      color: var(--primary-text-color, #212121);
    }

    .toggle-desc {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      margin-top: 2px;
    }

    .toggle {
      width: auto;
      margin: 0;
      accent-color: var(--primary-color, #03a9f4);
    }

    /* ── Calendar color swatch in dropdown ────────────────────── */

    .cal-option {
      padding-left: 8px;
    }

    /* ── Responsive ──────────────────────────────────────────────── */

    @media (max-width: 480px) {
      .row {
        flex-direction: column;
        gap: 0;
      }
      .dialog {
        padding: 20px 16px;
      }
    }
  `;

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  willUpdate(changed: PropertyValues): void {
    if (changed.has("open") && this.open) {
      this._populateForm();
    }
  }

  private _populateForm(): void {
    const ev = this.event;
    const notification = this.notificationDraft;
    if (ev) {
      this._title = ev.title;
      this._calendarId = ev.calendar_id;
      this._start = toDateTimeLocal(ev.start);
      this._end = toDateTimeLocal(ev.end);
      this._note = ev.note;
      this._recurrenceRule = ev.recurrence_rule ?? "";
      this._templateId = ev.template_id;
    } else {
      // New event — use passed defaults or sensible fallbacks
      const defs = this.defaults ?? {};
      let startDate: Date;

      if (defs.date) {
        const timePart = defs.time ?? "";
        if (timePart) {
          startDate = new Date(`${defs.date}T${timePart}`);
        } else {
          const now = new Date();
          now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
          startDate = new Date(`${defs.date}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        }
      } else {
        startDate = new Date();
        startDate.setMinutes(Math.ceil(startDate.getMinutes() / 30) * 30, 0, 0);
      }

      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      this._title = "";
      this._calendarId = defs.calendar_id ?? this.calendars[0]?.id ?? "";
      this._start = toDateTimeLocal(startDate.toISOString());
      this._end = toDateTimeLocal(endDate.toISOString());
      this._note = "";
      this._recurrenceRule = "";
      this._templateId = null;
    }

    this._notificationMode = notification?.mode ?? "global";
    this._notificationRuleId = notification?.ruleId ?? null;
    this._notificationReminderMinutes = notification?.reminderMinutes ?? 60;
    this._notificationService = notification?.notifyService ?? "";
    this._notificationIncludeActions = notification?.includeActions ?? true;
  }

  /* ── Events ─────────────────────────────────────────────────────── */

  private _onSave(): void {
    if (!this._title.trim()) return;

    this.dispatchEvent(
      new CustomEvent("event-save", {
        detail: {
          id: this.event?.id ?? null,
          calendar_id: this._calendarId,
          title: this._title.trim(),
          start: new Date(this._start).toISOString(),
          end: new Date(this._end).toISOString(),
          note: this._note,
          recurrence_rule: this._recurrenceRule || null,
          template_id: this._templateId,
          version: this.event?.version ?? 0,
          notification: {
            mode: this._notificationMode,
            ruleId: this._notificationRuleId,
            reminderMinutes: this._notificationReminderMinutes,
            notifyService: this._notificationService,
            includeActions: this._notificationIncludeActions,
          },
        },
        bubbles: true,
        composed: true,
      }),
    );
    this._close();
  }

  private _onDelete(): void {
    if (!this.event) return;
    this.dispatchEvent(
      new CustomEvent("event-delete", {
        detail: { eventId: this.event.id },
        bubbles: true,
        composed: true,
      }),
    );
    this._close();
  }

  private _close(): void {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains("backdrop")) {
      this._close();
    }
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") this._close();
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeydown);
  }

  render() {
    if (!this.open) return nothing;

    const isEdit = !!this.event;

    return html`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="dialog" role="dialog" aria-label="${isEdit ? "Edit" : "New"} Event">
          <h2 class="dialog-title">${isEdit ? "Edit Event" : "New Event"}</h2>

          <!-- Title -->
          <div class="field">
            <label for="evt-title">Title</label>
            <input
              id="evt-title"
              type="text"
              placeholder="Event title"
              .value=${this._title}
              @input=${(e: Event) => (this._title = (e.target as HTMLInputElement).value)}
            />
          </div>

          <!-- Calendar -->
          <div class="field">
            <label for="evt-cal">Calendar</label>
            <select
              id="evt-cal"
              .value=${this._calendarId}
              @change=${(e: Event) => (this._calendarId = (e.target as HTMLSelectElement).value)}
            >
              ${this.calendars.map(
                (c) =>
                  html`<option value=${c.id} ?selected=${c.id === this._calendarId}>
                    ${c.name}
                  </option>`,
              )}
            </select>
          </div>

          <!-- Start / End -->
          <div class="row">
            <div class="field">
              <label for="evt-start">Start</label>
              <input
                id="evt-start"
                type="datetime-local"
                .value=${this._start}
                @input=${(e: Event) => (this._start = (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="field">
              <label for="evt-end">End</label>
              <input
                id="evt-end"
                type="datetime-local"
                .value=${this._end}
                @input=${(e: Event) => (this._end = (e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          <!-- Note -->
          <div class="field">
            <label for="evt-note">Note</label>
            <textarea
              id="evt-note"
              placeholder="Optional note..."
              .value=${this._note}
              @input=${(e: Event) => (this._note = (e.target as HTMLTextAreaElement).value)}
            ></textarea>
          </div>

          <!-- Repeat -->
          <div class="field">
            <label>Repeat</label>
            <div class="recurrence-pills">
              ${RECURRENCE_OPTIONS.map(
                (opt) => html`
                  <button
                    type="button"
                    class="rec-pill"
                    ?active=${this._recurrenceRule === opt.value}
                    @click=${() => (this._recurrenceRule = opt.value)}
                  >
                    ${opt.label}
                  </button>
                `,
              )}
            </div>
          </div>

          <div class="field">
            <label>Notifications</label>
            <div class="section-card">
              <div class="section-title">Event reminder behavior</div>
              <div class="section-hint">
                Choose whether this event should follow your global reminder settings, use its own event rule, or save an event-specific disabled rule.
              </div>
              <div class="mode-pills">
                ${[
                  { value: "global", label: "Use global" },
                  { value: "event", label: "Notify this event" },
                  { value: "disabled", label: "Disable this event" },
                ].map(
                  (option) => html`
                    <button
                      type="button"
                      class="mode-pill"
                      ?active=${this._notificationMode === option.value}
                      @click=${() => (this._notificationMode = option.value as EventNotificationDraft["mode"])}
                    >
                      ${option.label}
                    </button>
                  `,
                )}
              </div>

              ${this._notificationMode === "event"
                ? html`
                    <div class="row">
                      <div class="field">
                        <label for="evt-reminder-minutes">Reminder minutes</label>
                        <input
                          id="evt-reminder-minutes"
                          type="number"
                          min="0"
                          max="1440"
                          .value=${String(this._notificationReminderMinutes)}
                          @input=${(e: Event) => {
                            const value = Number((e.target as HTMLInputElement).value);
                            this._notificationReminderMinutes = Number.isFinite(value)
                              ? Math.max(0, Math.min(1440, value))
                              : 60;
                          }}
                        />
                      </div>
                      <div class="field">
                        <label for="evt-notify-service">Notify service</label>
                        <select
                          id="evt-notify-service"
                          .value=${this._notificationService}
                          @change=${(e: Event) => {
                            this._notificationService = (e.target as HTMLSelectElement).value;
                          }}
                        >
                          <option value="">Use default notify routing</option>
                          ${this.notifyServices.map(
                            (service) => html`
                              <option value=${service.service}>${service.name}</option>
                            `,
                          )}
                        </select>
                      </div>
                    </div>

                    ${this._notificationMode === "event"
                      ? html`
                          <div class="toggle-row">
                            <div>
                              <div class="toggle-label">Rich notification actions</div>
                              <div class="toggle-desc">Show open and snooze actions when the target device supports them.</div>
                            </div>
                            <input
                              class="toggle"
                              type="checkbox"
                              .checked=${this._notificationIncludeActions}
                              @change=${(e: Event) => {
                                this._notificationIncludeActions = (e.target as HTMLInputElement).checked;
                              }}
                            />
                          </div>
                        `
                  `
                : this._notificationMode === "disabled"
                  ? html`
                      <div class="section-hint" style="margin: 0;">
                        This saves an event-specific disabled rule so broader reminder settings will skip this event.
                      </div>
                    `
                  : html`
                    <div class="section-hint" style="margin: 0;">
                      No event rule will be saved. The event will follow whichever broader notification settings already apply.
                    </div>
                  `}
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            ${isEdit
              ? html`<button class="btn btn-delete" @click=${this._onDelete}>
                  Delete
                </button>`
              : nothing}
            <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
            <button class="btn btn-save" @click=${this._onSave}>Save</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-event-dialog": CaleeEventDialog;
  }
}
