/**
 * <calee-task-edit-sheet> — Full task editor as bottom sheet (mobile)
 * or side panel (desktop).
 *
 * Created in Sprint 8 to replace inline editing in the task list.
 * Provides a richer editing experience: title, due date pills,
 * recurrence, note, list selector, and linked event info.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerTask, PlannerList } from "../store/types.js";
import {
  type DatePill,
  type RecurrencePill,
  resolveDue,
  datePillFromDue,
  formatRecurrence,
  RECURRENCE_LABELS,
} from "../helpers/task-helpers.js";

@customElement("calee-task-edit-sheet")
export class CaleeTaskEditSheet extends LitElement {
  @property({ attribute: false }) task: PlannerTask | null = null;
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean, reflect: true }) narrow = false;

  /* ── Edit state ────────────────────────────────────────────────────── */
  @state() private _title = "";
  @state() private _note = "";
  @state() private _listId = "";
  @state() private _datePill: DatePill = "none";
  @state() private _customDate = "";
  @state() private _recurrence: RecurrencePill = "none";
  @state() private _category = "";

  /* ── Lifecycle ─────────────────────────────────────────────────────── */

  updated(changed: import("lit").PropertyValues): void {
    if (changed.has("task") && this.task) {
      this._populateFromTask(this.task);
    }
  }

  private _populateFromTask(task: PlannerTask): void {
    this._title = task.title;
    this._note = task.note;
    this._listId = task.list_id;
    this._category = task.category;
    const { pill, customDate } = datePillFromDue(task.due);
    this._datePill = pill;
    this._customDate = customDate;
    this._recurrence = (task.recurrence_rule as RecurrencePill) || "none";
  }

  /* ── Styles ────────────────────────────────────────────────────────── */

  static styles = css`
    :host {
      display: block;
    }

    /* ── Overlay backdrop ─────────────────────────────────────── */
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 300;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, visibility 0.25s;
    }
    .backdrop.open {
      opacity: 1;
      visibility: visible;
    }

    /* ── Sheet panel ──────────────────────────────────────────── */
    .sheet {
      position: fixed;
      z-index: 301;
      background: var(--card-background-color, #fff);
      overflow-y: auto;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Mobile: bottom sheet */
    :host([narrow]) .sheet {
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 85vh;
      border-radius: 16px 16px 0 0;
      transform: translateY(100%);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
    }
    :host([narrow]) .sheet.open {
      transform: translateY(0);
    }

    /* Desktop: side panel */
    :host(:not([narrow])) .sheet {
      top: 0;
      right: 0;
      bottom: 0;
      width: 380px;
      border-left: 1px solid var(--divider-color, #e0e0e0);
      transform: translateX(100%);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
    }
    :host(:not([narrow])) .sheet.open {
      transform: translateX(0);
    }

    /* ── Handle (mobile drag indicator) ──────────────────────── */
    .sheet-handle {
      width: 36px;
      height: 4px;
      background: var(--divider-color, #ccc);
      border-radius: 2px;
      margin: 10px auto 4px;
    }
    :host(:not([narrow])) .sheet-handle {
      display: none;
    }

    /* ── Header ──────────────────────────────────────────────── */
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .sheet-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--secondary-text-color, #757575);
      padding: 4px;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-btn:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    /* ── Form fields ─────────────────────────────────────────── */
    .sheet-body {
      padding: 16px;
    }

    .field {
      margin-bottom: 16px;
    }
    .field-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      margin-bottom: 6px;
      display: block;
    }

    input[type="text"],
    textarea {
      width: 100%;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
    }
    input:focus,
    textarea:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    textarea {
      resize: vertical;
      min-height: 60px;
      max-height: 160px;
    }

    select {
      width: 100%;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      appearance: auto;
    }
    select:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── Pill rows ────────────────────────────────────────────── */
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pill {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      background: transparent;
      color: var(--secondary-text-color, #757575);
      border: 1px solid var(--divider-color, #e0e0e0);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
      user-select: none;
    }
    .pill:hover {
      border-color: var(--primary-color, #03a9f4);
    }
    .pill[aria-selected="true"] {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }
    .recurrence-pill[aria-selected="true"] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, transparent);
      color: var(--primary-color, #03a9f4);
      border-color: var(--primary-color, #03a9f4);
    }
    .custom-date-input {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
    }

    /* ── Actions ──────────────────────────────────────────────── */
    .sheet-actions {
      display: flex;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .btn {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      padding: 10px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      text-align: center;
      transition: opacity 0.15s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .btn-save {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }
    .btn-delete {
      background: var(--error-color, #f44336);
      color: #fff;
      flex: 0;
      padding: 10px 16px;
    }
    .btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
      flex: 0;
      padding: 10px 16px;
    }
  `;

  /* ── Events ────────────────────────────────────────────────────────── */

  private _close(): void {
    this.dispatchEvent(new CustomEvent("sheet-close", { bubbles: true, composed: true }));
  }

  private _save(): void {
    if (!this.task) return;
    const due = resolveDue(this._datePill, this._customDate);
    const recurrence = this._recurrence !== "none" && due ? this._recurrence : "";

    this.dispatchEvent(new CustomEvent("task-update", {
      detail: {
        taskId: this.task.id,
        version: this.task.version,
        title: this._title.trim() || this.task.title,
        note: this._note.trim(),
        due: due ?? "",
        recurrence_rule: recurrence,
        list_id: this._listId,
        category: this._category,
      },
      bubbles: true,
      composed: true,
    }));
    this._close();
  }

  private _delete(): void {
    if (!this.task) return;
    this.dispatchEvent(new CustomEvent("task-delete", {
      detail: { taskId: this.task.id, title: this.task.title },
      bubbles: true,
      composed: true,
    }));
    this._close();
  }

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") this._close();
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  render() {
    const isOpen = this.open && this.task;

    return html`
      <div class="backdrop ${isOpen ? "open" : ""}" @click=${this._close}></div>

      <div class="sheet ${isOpen ? "open" : ""}" @keydown=${this._onKeydown}>
        <div class="sheet-handle"></div>

        <div class="sheet-header">
          <h3>Edit Task</h3>
          <button class="close-btn" @click=${this._close} aria-label="Close">&times;</button>
        </div>

        ${isOpen ? html`
          <div class="sheet-body">
            <!-- Title -->
            <div class="field">
              <label class="field-label">Title</label>
              <input type="text" .value=${this._title}
                @input=${(e: Event) => { this._title = (e.target as HTMLInputElement).value; }} />
            </div>

            <!-- List -->
            <div class="field">
              <label class="field-label">List</label>
              <select .value=${this._listId}
                @change=${(e: Event) => { this._listId = (e.target as HTMLSelectElement).value; }}>
                ${this.lists.map((l) => html`
                  <option value=${l.id} ?selected=${this._listId === l.id}>${l.name}</option>
                `)}
              </select>
            </div>

            <!-- Due date pills -->
            <div class="field">
              <label class="field-label">Due date</label>
              <div class="pill-row">
                ${(["today", "tomorrow", "nextweek", "custom", "none"] as DatePill[]).map((key) => {
                  const labels: Record<DatePill, string> = {
                    today: "Today", tomorrow: "Tomorrow", nextweek: "Next week",
                    custom: "Custom", none: "No date",
                  };
                  return html`
                    <button class="pill" aria-selected=${this._datePill === key}
                      @click=${() => { this._datePill = key; if (key === "none") this._recurrence = "none"; }}>
                      ${labels[key]}
                    </button>
                  `;
                })}
                ${this._datePill === "custom" ? html`
                  <input type="date" class="custom-date-input" .value=${this._customDate}
                    @change=${(e: Event) => { this._customDate = (e.target as HTMLInputElement).value; }} />
                ` : nothing}
              </div>
            </div>

            <!-- Recurrence pills (visible when a due date is set) -->
            ${this._datePill !== "none" ? html`
              <div class="field">
                <label class="field-label">Repeat</label>
                <div class="pill-row">
                  ${(["none", "daily", "weekly", "biweekly", "monthly", "weekdays"] as RecurrencePill[]).map((key) => {
                    const labels: Record<RecurrencePill, string> = {
                      none: "None", daily: "Daily", weekly: "Weekly",
                      biweekly: "Fortnightly", monthly: "Monthly", weekdays: "Weekdays",
                    };
                    return html`
                      <button class="pill recurrence-pill" aria-selected=${this._recurrence === key}
                        @click=${() => { this._recurrence = key; }}>
                        ${labels[key]}
                      </button>
                    `;
                  })}
                </div>
              </div>
            ` : nothing}

            <!-- Category -->
            <div class="field">
              <label class="field-label">Category</label>
              <input type="text" .value=${this._category} placeholder="e.g. Work, Home, Errands"
                @input=${(e: Event) => { this._category = (e.target as HTMLInputElement).value; }} />
            </div>

            <!-- Note -->
            <div class="field">
              <label class="field-label">Note</label>
              <textarea .value=${this._note} placeholder="Add a note..."
                @input=${(e: Event) => { this._note = (e.target as HTMLTextAreaElement).value; }}></textarea>
            </div>

            <!-- Linked event info (read-only) -->
            ${this.task!.related_event_id ? html`
              <div class="field">
                <label class="field-label">Linked event</label>
                <div style="font-size: 13px; color: var(--secondary-text-color);">
                  Event ID: ${this.task!.related_event_id}
                </div>
              </div>
            ` : nothing}
          </div>

          <div class="sheet-actions">
            <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
            <button class="btn btn-delete" @click=${this._delete}>Delete</button>
            <button class="btn btn-save" @click=${this._save}>Save</button>
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-task-edit-sheet": CaleeTaskEditSheet;
  }
}
