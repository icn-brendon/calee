/**
 * <calee-template-picker> -- Mobile-friendly bottom-sheet template picker.
 *
 * Shows shift template cards in a grid (desktop) or vertical list (mobile).
 * Clicking a card dispatches `template-select` with `{ templateId, date }`.
 * Also offers a "+ Custom event" option and a "Manage templates" link.
 *
 * Dispatches:
 *  - `template-select`     { templateId: string, date: string }
 *  - `custom-event`        { date: string, time?: string }
 *  - `quick-add-task`      { date: string }
 *  - `quick-add-shopping`  { date: string }
 *  - `manage-templates`    (no detail)
 *  - `dialog-close`        (no detail)
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ShiftTemplate } from "../store/types.js";

/* ── Time formatting helper ──────────────────────────────────────────── */

/**
 * Format a HH:MM time string into a compact 12-hour display.
 *  "06:00" -> "6am"
 *  "14:00" -> "2pm"
 *  "07:15" -> "7:15am"
 *  "22:00" -> "10pm"
 */
export function formatShiftTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatShiftTime(start)} - ${formatShiftTime(end)}`;
}

export function isOvernight(start: string, end: string): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return endMin < startMin;
}

/** Format a date subtitle like "Adding to Monday 6 Apr" */
function formatDateSubtitle(dateStr: string): string {
  if (!dateStr) return "Select a template to create a shift";
  const d = new Date(dateStr + "T00:00");
  return `Adding to ${d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  })}`;
}

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-template-picker")
export class CaleeTemplatePicker extends LitElement {
  @property({ type: Array }) templates: ShiftTemplate[] = [];
  @property({ type: String }) selectedDate = "";
  @property({ type: String }) selectedTime = "";
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _step: "choose" | "shifts" = "choose";
  @state() private _datePill: "today" | "tomorrow" | "custom" = "today";

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
      align-items: flex-end;
      justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
    }

    /* ── Sheet — bottom-sheet on mobile, centered card on desktop ── */

    .sheet {
      background: var(--card-background-color, #fff);
      border-radius: 16px 16px 0 0;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      max-height: 75vh;
      overflow-y: auto;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
    }

    /* Handle indicator at top of sheet */
    .sheet-handle {
      width: 36px;
      height: 4px;
      background: var(--divider-color, #e0e0e0);
      border-radius: 2px;
      margin: 0 auto 16px;
    }

    .sheet-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 4px;
    }

    .sheet-subtitle {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 20px;
    }

    /* ── Date pills in choose step ──────────────────────────── */

    .date-pills {
      display: flex;
      gap: 8px;
      margin: 8px 0 16px;
    }

    .date-pill {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .date-pill:hover {
      border-color: var(--primary-color, #03a9f4);
    }

    .date-pill[active] {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color, #03a9f4);
    }

    .custom-date-input {
      margin-top: -8px;
      margin-bottom: 8px;
    }

    .custom-date-input input {
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s;
    }

    .custom-date-input input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── Desktop grid ────────────────────────────────────────────── */

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }

    /* ── Template card ───────────────────────────────────────────── */

    .card {
      position: relative;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
      background: var(--card-background-color, #fff);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card:hover {
      border-color: var(--primary-color, #03a9f4);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
    .card:active {
      transform: scale(0.98);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .card-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      line-height: 1.3;
    }

    .card-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 3px;
    }

    .card-time {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .overnight-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      background: #fff3e0;
      color: #e65100;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.2px;
    }

    /* ── Divider ─────────────────────────────────────────────────── */

    .divider {
      border: none;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      margin: 20px 0 16px;
    }

    /* ── Custom event link ───────────────────────────────────────── */

    .custom-event-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 4px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-color, #03a9f4);
      font-family: inherit;
      transition: background 0.15s;
    }
    .custom-event-btn:hover {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .custom-event-btn .plus-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 400;
      flex-shrink: 0;
    }

    /* ── Manage templates link ───────────────────────────────────── */

    .manage-btn {
      display: block;
      width: 100%;
      padding: 10px 4px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      font-family: inherit;
      text-align: left;
      transition: background 0.15s, color 0.15s;
    }
    .manage-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    /* ── Cancel button ───────────────────────────────────────────── */

    .cancel-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      font-family: inherit;
      text-align: center;
      transition: background 0.15s;
    }
    .cancel-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    /* ── Empty state ─────────────────────────────────────────────── */

    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .empty-sub {
      font-size: 12px;
      margin-top: 6px;
      color: var(--disabled-text-color, #aaa);
    }

    /* ── Choose step (Shift / Event / Task / Shop) ───────────── */

    .choose-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .choose-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 22px 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 14px;
      cursor: pointer;
      background: var(--card-background-color, #fff);
      transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
    }
    .choose-card:hover {
      border-color: var(--primary-color, #03a9f4);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
    .choose-card:active {
      transform: scale(0.97);
    }

    .choose-emoji {
      font-size: 32px;
      line-height: 1;
    }

    .choose-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    /* ── Back arrow for shifts step ──────────────────────────── */

    .back-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .back-btn {
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
    .back-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    /* ── Card emoji ──────────────────────────────────────────── */

    .card-emoji {
      font-size: 22px;
      line-height: 1;
      flex-shrink: 0;
    }

    .card-mobile-emoji {
      font-size: 20px;
      line-height: 1;
    }

    /* ── Mobile list layout ──────────────────────────────────────── */

    @media (max-width: 600px) {
      .sheet {
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        padding: 16px 20px 20px;
        max-height: 80vh;
      }

      .grid {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .card {
        flex-direction: row;
        align-items: center;
        border: none;
        border-radius: 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        padding: 14px 4px;
        gap: 12px;
      }
      .card:last-child {
        border-bottom: none;
      }
      .card:hover {
        box-shadow: none;
        border-color: var(--divider-color, #e0e0e0);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      }
      .card:last-child:hover {
        border-bottom: none;
      }

      .card-mobile-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-mobile-icon .inner-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
      }

      .card-header {
        display: none;
      }

      .card-mobile-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }

      .card-mobile-name {
        font-size: 15px;
        font-weight: 500;
        color: var(--primary-text-color, #212121);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-time {
        font-size: 12px;
      }
    }

    /* ── Desktop: hide mobile elements ───────────────────────────── */

    @media (min-width: 601px) {
      .sheet-handle {
        display: none;
      }

      .sheet {
        border-radius: 16px;
        align-self: center;
        margin-bottom: 0;
      }

      .backdrop {
        align-items: center;
      }

      .card-mobile-icon,
      .card-mobile-body {
        display: none;
      }
    }
  `;

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  willUpdate(changed: PropertyValues): void {
    if (changed.has("open") && this.open) {
      this._step = "choose";
      // Set initial pill based on the incoming date
      const today = new Date().toISOString().slice(0, 10);
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      const tomorrowStr = tom.toISOString().slice(0, 10);
      if (this.selectedDate === today) {
        this._datePill = "today";
      } else if (this.selectedDate === tomorrowStr) {
        this._datePill = "tomorrow";
      } else {
        this._datePill = "custom";
      }
    }
  }

  /* ── Events ─────────────────────────────────────────────────────── */

  private _select(template: ShiftTemplate): void {
    this.dispatchEvent(
      new CustomEvent("template-select", {
        detail: { templateId: template.id, date: this.selectedDate },
        bubbles: true,
        composed: true,
      }),
    );
    this._close();
  }

  private _customEvent(): void {
    // Dispatch the event first — the parent (panel) will close the picker
    // and open the event dialog. We must NOT call _close() here because
    // _close() dispatches dialog-close which would cause the parent to
    // close the event dialog it just opened.
    this.dispatchEvent(
      new CustomEvent("custom-event", {
        detail: {
          date: this.selectedDate,
          time: this.selectedTime || undefined,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _quickAddTask(): void {
    this.dispatchEvent(
      new CustomEvent("quick-add-task", {
        detail: { date: this.selectedDate },
        bubbles: true,
        composed: true,
      }),
    );
    this._close();
  }

  private _quickAddShopping(): void {
    this.dispatchEvent(
      new CustomEvent("quick-add-shopping", {
        detail: { date: this.selectedDate },
        bubbles: true,
        composed: true,
      }),
    );
    this._close();
  }

  private _manageTemplates(): void {
    this.dispatchEvent(
      new CustomEvent("manage-templates", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _close(): void {
    this._step = "choose";
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains("backdrop")) {
      this._close();
    }
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this._close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeydown);
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="sheet" role="dialog" aria-label="Pick a shift template">
          <div class="sheet-handle"></div>
          ${this._step === "choose" ? this._renderChooseStep() : this._renderShiftsStep()}
        </div>
      </div>
    `;
  }

  private _onPillClick(pill: "today" | "tomorrow" | "custom"): void {
    this._datePill = pill;
    const today = new Date();
    if (pill === "today") {
      this.selectedDate = today.toISOString().slice(0, 10);
    } else if (pill === "tomorrow") {
      const tom = new Date(today);
      tom.setDate(tom.getDate() + 1);
      this.selectedDate = tom.toISOString().slice(0, 10);
    }
    // "custom" keeps the current selectedDate and shows the date input
  }

  private _onCustomDateChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    if (val) {
      this.selectedDate = val;
    }
  }

  private _renderChooseStep() {
    return html`
      <h3 class="sheet-title">${formatDateSubtitle(this.selectedDate)}</h3>

      <div class="date-pills">
        <button
          class="date-pill"
          ?active=${this._datePill === "today"}
          @click=${() => this._onPillClick("today")}
        >Today</button>
        <button
          class="date-pill"
          ?active=${this._datePill === "tomorrow"}
          @click=${() => this._onPillClick("tomorrow")}
        >Tomorrow</button>
        <button
          class="date-pill"
          ?active=${this._datePill === "custom"}
          @click=${() => this._onPillClick("custom")}
        >Custom &#x25BE;</button>
      </div>

      ${this._datePill === "custom" ? html`
        <div class="custom-date-input">
          <input
            type="date"
            .value=${this.selectedDate}
            @change=${this._onCustomDateChange}
          />
        </div>
      ` : nothing}

      <p class="sheet-subtitle">What would you like to add?</p>

      <div class="choose-grid">
        <div class="choose-card" @click=${this._goToShifts}>
          <span class="choose-emoji">\u{1F3E5}</span>
          <span class="choose-label">Shift</span>
        </div>
        <div class="choose-card" @click=${this._customEvent}>
          <span class="choose-emoji">\u{1F4C5}</span>
          <span class="choose-label">Event</span>
        </div>
        <div class="choose-card" @click=${this._quickAddTask}>
          <span class="choose-emoji">\u{2705}</span>
          <span class="choose-label">Task</span>
        </div>
        <div class="choose-card" @click=${this._quickAddShopping}>
          <span class="choose-emoji">\u{1F6D2}</span>
          <span class="choose-label">Shop</span>
        </div>
      </div>

      <button class="cancel-btn" @click=${this._close}>Cancel</button>
    `;
  }

  private _goToShifts(): void {
    this._step = "shifts";
  }

  private _goBack(): void {
    this._step = "choose";
  }

  private _renderShiftsStep() {
    return html`
      <div class="back-row">
        <button class="back-btn" @click=${this._goBack} aria-label="Back">&lsaquo;</button>
        <h3 class="sheet-title" style="margin:0">Shift Templates</h3>
      </div>
      <p class="sheet-subtitle">${formatDateSubtitle(this.selectedDate)}</p>

      <div class="grid">
        ${this.templates.length === 0
          ? html`
              <div class="empty">
                No templates configured
                <div class="empty-sub">Add templates to quickly create shifts</div>
              </div>
            `
          : this.templates.map((t) => this._renderCard(t))}
      </div>

      <hr class="divider" />

      <button class="manage-btn" @click=${this._manageTemplates}>
        Manage templates
      </button>

      <button class="cancel-btn" @click=${this._close}>Cancel</button>
    `;
  }

  private _renderCard(t: ShiftTemplate) {
    const overnight = isOvernight(t.start_time, t.end_time);
    return html`
      <div class="card" @click=${() => this._select(t)}>
        <!-- Desktop layout -->
        <div class="card-header">
          ${t.emoji ? html`<span class="card-emoji">${t.emoji}</span>` : nothing}
          <span class="card-name">${t.name}</span>
          <span class="card-dot" style="background:${t.color}"></span>
        </div>
        <div class="card-time">
          ${formatTimeRange(t.start_time, t.end_time)}
          ${overnight ? html`<span class="overnight-badge">Overnight</span>` : nothing}
        </div>

        <!-- Mobile layout -->
        <div class="card-mobile-icon" style="background:${t.color}">
          ${t.emoji
            ? html`<span class="card-mobile-emoji">${t.emoji}</span>`
            : html`<span class="inner-dot"></span>`}
        </div>
        <div class="card-mobile-body">
          <span class="card-mobile-name">${t.name}</span>
          <div class="card-time">
            ${formatTimeRange(t.start_time, t.end_time)}
            ${overnight ? html`<span class="overnight-badge">Overnight</span>` : nothing}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-template-picker": CaleeTemplatePicker;
  }
}
