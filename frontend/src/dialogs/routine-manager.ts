/**
 * <calee-routine-manager> -- Dialog for listing, creating, editing,
 * and deleting routines (one-tap bundles).
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Routine, ShiftTemplate } from "../store/types.js";

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-routine-manager")
export class CaleeRoutineManager extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Array }) routines: Routine[] = [];
  @property({ type: Array }) templates: ShiftTemplate[] = [];
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _editingRoutine: Partial<Routine> | null = null;
  @state() private _isNew = false;
  @state() private _confirmDeleteId: string | null = null;

  static styles = css`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      width: 100%;
      max-width: 560px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      padding: 24px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--secondary-text-color, #757575);
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .close-btn:hover {
      background: var(--secondary-background-color, #f0f0f0);
    }

    /* ── Routine list ──────────────────────────────────── */

    .routine-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .routine-row:last-child {
      border-bottom: none;
    }

    .routine-emoji {
      font-size: 22px;
      width: 32px;
      text-align: center;
      flex-shrink: 0;
    }

    .routine-info {
      flex: 1;
      min-width: 0;
    }

    .routine-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }

    .routine-desc {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .routine-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
      transition: background 0.15s, color 0.15s;
    }

    .icon-btn:hover {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      margin-top: 12px;
      background: none;
      border: 1px dashed var(--divider-color, #e0e0e0);
      border-radius: 8px;
      color: var(--primary-color, #03a9f4);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
      font-family: inherit;
    }

    .add-btn:hover {
      border-color: var(--primary-color, #03a9f4);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    /* ── Edit form ─────────────────────────────────────── */

    .form-section {
      margin-top: 16px;
      padding: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      background: var(--secondary-background-color, #fafafa);
    }

    .form-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--primary-text-color, #212121);
    }

    .form-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
    }

    .form-row label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      width: 80px;
      flex-shrink: 0;
    }

    .form-input {
      flex: 1;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      font-family: inherit;
    }

    .form-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .form-select {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }

    .form-select:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .form-emoji-input {
      width: 48px;
      font-size: 20px;
      text-align: center;
      padding: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      outline: none;
      font-family: inherit;
    }

    .form-emoji-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── Inline list items ─────────────────────────────── */

    .inline-list-heading {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      margin: 12px 0 6px;
    }

    .inline-row {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }

    .inline-input {
      flex: 1;
      font-size: 13px;
      padding: 4px 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      font-family: inherit;
    }

    .inline-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .inline-input-sm {
      width: 50px;
      flex: none;
    }

    .inline-remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      color: var(--secondary-text-color, #999);
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .inline-remove-btn:hover {
      color: var(--error-color, #f44336);
    }

    .inline-add-btn {
      font-size: 12px;
      color: var(--primary-color, #03a9f4);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      font-weight: 500;
      font-family: inherit;
    }

    .inline-add-btn:hover {
      text-decoration: underline;
    }

    /* ── Form actions ──────────────────────────────────── */

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 14px;
    }

    .form-btn {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .form-btn:hover {
      opacity: 0.9;
    }

    .form-btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .form-btn-save {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    .form-btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Delete confirm ────────────────────────────────── */

    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .confirm-dialog p {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      margin: 0 0 16px;
    }

    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .confirm-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .confirm-delete {
      background: var(--error-color, #f44336);
      color: #fff;
    }

    .empty-msg {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }
  `;

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="overlay" @click=${this._onOverlayClick}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title">Routines</span>
            <button class="close-btn" @click=${this._close}>\u2715</button>
          </div>

          ${this.routines.length === 0 && !this._editingRoutine
            ? html`<div class="empty-msg">No routines yet. Create one to get started.</div>`
            : nothing}

          ${this.routines.map((r) => html`
            <div class="routine-row">
              <span class="routine-emoji">${r.emoji || "\u26A1"}</span>
              <div class="routine-info">
                <div class="routine-name">${r.name}</div>
                ${r.description
                  ? html`<div class="routine-desc">${r.description}</div>`
                  : nothing}
              </div>
              <div class="routine-actions">
                <button class="icon-btn" @click=${() => this._editRoutine(r)} title="Edit">\u270E</button>
                <button class="icon-btn" @click=${() => { this._confirmDeleteId = r.id; }} title="Delete">\u2715</button>
              </div>
            </div>
          `)}

          <button class="add-btn" @click=${this._newRoutine}>+ Add routine</button>

          ${this._editingRoutine ? this._renderForm() : nothing}

          ${this._confirmDeleteId ? html`
            <div class="confirm-overlay" @click=${() => { this._confirmDeleteId = null; }}>
              <div class="confirm-dialog" @click=${(e: Event) => e.stopPropagation()}>
                <p>Delete this routine?</p>
                <div class="confirm-actions">
                  <button class="confirm-cancel" @click=${() => { this._confirmDeleteId = null; }}>Cancel</button>
                  <button class="confirm-delete" @click=${this._doDelete}>Delete</button>
                </div>
              </div>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderForm() {
    const r = this._editingRoutine!;
    const tasks = (r.tasks ?? []) as Array<Record<string, any>>;
    const items = (r.shopping_items ?? []) as Array<Record<string, any>>;

    return html`
      <div class="form-section">
        <div class="form-title">${this._isNew ? "New Routine" : "Edit Routine"}</div>

        <div class="form-row">
          <label>Emoji</label>
          <input
            type="text"
            class="form-emoji-input"
            maxlength="2"
            .value=${r.emoji ?? ""}
            @input=${(e: Event) => { this._editingRoutine = { ...r, emoji: (e.target as HTMLInputElement).value }; }}
          />
        </div>

        <div class="form-row">
          <label>Name</label>
          <input
            type="text"
            class="form-input"
            .value=${r.name ?? ""}
            @input=${(e: Event) => { this._editingRoutine = { ...r, name: (e.target as HTMLInputElement).value }; }}
            placeholder="Routine name"
          />
        </div>

        <div class="form-row">
          <label>Description</label>
          <input
            type="text"
            class="form-input"
            .value=${r.description ?? ""}
            @input=${(e: Event) => { this._editingRoutine = { ...r, description: (e.target as HTMLInputElement).value }; }}
            placeholder="What does it do?"
          />
        </div>

        <div class="form-row">
          <label>Shift</label>
          <select
            class="form-select"
            .value=${r.shift_template_id ?? ""}
            @change=${(e: Event) => {
              const val = (e.target as HTMLSelectElement).value;
              this._editingRoutine = { ...r, shift_template_id: val || null };
            }}
          >
            <option value="">None</option>
            ${this.templates.map(
              (t) => html`<option value=${t.id} ?selected=${r.shift_template_id === t.id}>${t.emoji ? t.emoji + " " : ""}${t.name}</option>`,
            )}
          </select>
        </div>

        <!-- Tasks -->
        <div class="inline-list-heading">Tasks</div>
        ${tasks.map((task, idx) => html`
          <div class="inline-row">
            <input
              class="inline-input"
              .value=${task.title ?? ""}
              @input=${(e: Event) => {
                const newTasks = [...tasks];
                newTasks[idx] = { ...task, title: (e.target as HTMLInputElement).value };
                this._editingRoutine = { ...r, tasks: newTasks };
              }}
              placeholder="Task title"
            />
            <input
              class="inline-input inline-input-sm"
              type="text"
              .value=${task.list_id ?? "inbox"}
              @input=${(e: Event) => {
                const newTasks = [...tasks];
                newTasks[idx] = { ...task, list_id: (e.target as HTMLInputElement).value };
                this._editingRoutine = { ...r, tasks: newTasks };
              }}
              placeholder="list"
              title="List ID"
            />
            <input
              class="inline-input inline-input-sm"
              type="number"
              .value=${String(task.due_offset_days ?? 0)}
              @input=${(e: Event) => {
                const newTasks = [...tasks];
                newTasks[idx] = { ...task, due_offset_days: parseInt((e.target as HTMLInputElement).value) || 0 };
                this._editingRoutine = { ...r, tasks: newTasks };
              }}
              placeholder="+days"
              title="Due offset (days)"
            />
            <button class="inline-remove-btn" @click=${() => {
              const newTasks = tasks.filter((_, i) => i !== idx);
              this._editingRoutine = { ...r, tasks: newTasks };
            }}>\u2715</button>
          </div>
        `)}
        <button class="inline-add-btn" @click=${() => {
          const newTasks = [...tasks, { title: "", list_id: "inbox", due_offset_days: 0 }];
          this._editingRoutine = { ...r, tasks: newTasks };
        }}>+ Add task</button>

        <!-- Shopping items -->
        <div class="inline-list-heading">Shopping Items</div>
        ${items.map((item, idx) => html`
          <div class="inline-row">
            <input
              class="inline-input"
              .value=${item.title ?? ""}
              @input=${(e: Event) => {
                const newItems = [...items];
                newItems[idx] = { ...item, title: (e.target as HTMLInputElement).value };
                this._editingRoutine = { ...r, shopping_items: newItems };
              }}
              placeholder="Item title"
            />
            <input
              class="inline-input inline-input-sm"
              type="text"
              .value=${item.category ?? ""}
              @input=${(e: Event) => {
                const newItems = [...items];
                newItems[idx] = { ...item, category: (e.target as HTMLInputElement).value };
                this._editingRoutine = { ...r, shopping_items: newItems };
              }}
              placeholder="cat"
              title="Category"
            />
            <input
              class="inline-input inline-input-sm"
              type="number"
              .value=${String(item.quantity ?? 1)}
              @input=${(e: Event) => {
                const newItems = [...items];
                newItems[idx] = { ...item, quantity: parseFloat((e.target as HTMLInputElement).value) || 1 };
                this._editingRoutine = { ...r, shopping_items: newItems };
              }}
              placeholder="qty"
              title="Quantity"
            />
            <input
              class="inline-input inline-input-sm"
              type="text"
              .value=${item.unit ?? ""}
              @input=${(e: Event) => {
                const newItems = [...items];
                newItems[idx] = { ...item, unit: (e.target as HTMLInputElement).value };
                this._editingRoutine = { ...r, shopping_items: newItems };
              }}
              placeholder="unit"
              title="Unit (L, kg, pcs...)"
            />
            <button class="inline-remove-btn" @click=${() => {
              const newItems = items.filter((_, i) => i !== idx);
              this._editingRoutine = { ...r, shopping_items: newItems };
            }}>\u2715</button>
          </div>
        `)}
        <button class="inline-add-btn" @click=${() => {
          const newItems = [...items, { title: "", category: "groceries", quantity: 1, unit: "" }];
          this._editingRoutine = { ...r, shopping_items: newItems };
        }}>+ Add item</button>

        <div class="form-actions">
          <button class="form-btn form-btn-cancel" @click=${() => { this._editingRoutine = null; }}>Cancel</button>
          <button
            class="form-btn form-btn-save"
            ?disabled=${!(r.name ?? "").trim()}
            @click=${this._saveRoutine}
          >Save</button>
        </div>
      </div>
    `;
  }

  /* ── Actions ──────────────────────────────────────────────────────── */

  private _onOverlayClick(e: Event): void {
    if ((e.target as HTMLElement).classList.contains("overlay")) {
      this._close();
    }
  }

  private _close(): void {
    this._editingRoutine = null;
    this._confirmDeleteId = null;
    this.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true, composed: true }));
  }

  private _newRoutine(): void {
    this._isNew = true;
    this._editingRoutine = {
      name: "",
      emoji: "",
      description: "",
      shift_template_id: null,
      tasks: [],
      shopping_items: [],
    };
  }

  private _editRoutine(routine: Routine): void {
    this._isNew = false;
    this._editingRoutine = {
      ...routine,
      tasks: [...routine.tasks],
      shopping_items: [...routine.shopping_items],
    };
  }

  private async _saveRoutine(): Promise<void> {
    if (!this.hass || !this._editingRoutine) return;
    const r = this._editingRoutine;

    try {
      if (this._isNew) {
        await this.hass.callWS({
          type: "calee/create_routine",
          name: r.name ?? "",
          emoji: r.emoji ?? "",
          description: r.description ?? "",
          shift_template_id: r.shift_template_id ?? undefined,
          tasks: r.tasks ?? [],
          shopping_items: r.shopping_items ?? [],
        });
      } else {
        await this.hass.callWS({
          type: "calee/update_routine",
          routine_id: r.id!,
          name: r.name,
          emoji: r.emoji,
          description: r.description,
          shift_template_id: r.shift_template_id,
          tasks: r.tasks,
          shopping_items: r.shopping_items,
        });
      }

      this._editingRoutine = null;
      this.dispatchEvent(new CustomEvent("routine-changed", { bubbles: true, composed: true }));
    } catch (err) {
      console.error("Failed to save routine:", err);
    }
  }

  private async _doDelete(): Promise<void> {
    if (!this.hass || !this._confirmDeleteId) return;
    try {
      await this.hass.callWS({
        type: "calee/delete_routine",
        routine_id: this._confirmDeleteId,
      });
      this._confirmDeleteId = null;
      this.dispatchEvent(new CustomEvent("routine-changed", { bubbles: true, composed: true }));
    } catch (err) {
      console.error("Failed to delete routine:", err);
    }
  }
}
