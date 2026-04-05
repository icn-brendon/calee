/**
 * <calee-template-manager> -- Dialog for managing shift templates.
 *
 * Allows users to add, edit, and delete shift templates.
 * Displays the template list with inline edit/delete actions.
 *
 * Dispatches:
 *  - `template-created`  { template: ShiftTemplate }
 *  - `template-deleted`  { templateId: string }
 *  - `dialog-close`      (no detail)
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ShiftTemplate } from "../store/types.js";
import type { PlannerCalendar } from "../store/types.js";
import { formatTimeRange, isOvernight } from "./template-picker.js";

/* ── Preset colors for the color picker ──────────────────────────────── */

const PRESET_COLORS = [
  "#e57373", "#f06292", "#ce93d8", "#9575cd",
  "#7986cb", "#64b5f6", "#4fc3f7", "#4dd0e1",
  "#4db6ac", "#81c784", "#aed581", "#dce775",
  "#fff176", "#ffd54f", "#ffb74d", "#ff8a65",
  "#a1887f", "#90a4ae", "#1565c0", "#ff9800",
];

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-template-manager")
export class CaleeTemplateManager extends LitElement {
  @property({ type: Array }) templates: ShiftTemplate[] = [];
  @property({ type: Array }) calendars: PlannerCalendar[] = [];
  @property({ attribute: false }) hass: any;
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _editingTemplate: Partial<ShiftTemplate> | null = null;
  @state() private _isNew = false;
  @state() private _confirmDeleteId: string | null = null;
  @state() private _saving = false;

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
      z-index: 101;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease;
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
      max-width: 520px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      animation: scaleIn 0.2s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0; }
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 4px;
    }

    .dialog-subtitle {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 20px;
    }

    /* ── Template list ───────────────────────────────────────────── */

    .template-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .template-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 8px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      transition: background 0.15s;
    }
    .template-row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }
    .template-row:last-child {
      border-bottom: none;
    }

    .tpl-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tpl-info {
      flex: 1;
      min-width: 0;
    }

    .tpl-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
    }

    .tpl-time {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .overnight-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      background: #fff3e0;
      color: #e65100;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .tpl-actions {
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
      line-height: 1;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }
    .icon-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color, #212121);
    }
    .icon-btn.danger:hover {
      background: color-mix(in srgb, var(--error-color, #f44336) 10%, transparent);
      color: var(--error-color, #f44336);
    }

    /* ── Delete confirmation ──────────────────────────────────────── */

    .confirm-delete {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: color-mix(in srgb, var(--error-color, #f44336) 6%, transparent);
      border-radius: 8px;
      margin-top: 4px;
    }

    .confirm-delete span {
      font-size: 13px;
      color: var(--primary-text-color, #212121);
      flex: 1;
    }

    .confirm-delete-btn {
      padding: 5px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: opacity 0.15s;
    }
    .confirm-yes {
      background: var(--error-color, #f44336);
      color: #fff;
    }
    .confirm-yes:hover {
      opacity: 0.9;
    }
    .confirm-no {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color, #212121);
    }

    /* ── Add button ──────────────────────────────────────────────── */

    .add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 12px 8px;
      margin-top: 4px;
      background: none;
      border: none;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      cursor: pointer;
      border-radius: 0 0 8px 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-color, #03a9f4);
      font-family: inherit;
      transition: background 0.15s;
    }
    .add-btn:hover {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    /* ── Edit form ───────────────────────────────────────────────── */

    .edit-form {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }

    .edit-form-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 16px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
    }

    .form-field:last-of-type {
      margin-bottom: 0;
    }

    .form-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
      letter-spacing: 0.2px;
    }

    .form-input {
      padding: 10px 12px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      transition: border-color 0.15s;
      outline: none;
    }
    .form-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-row .form-field {
      flex: 1;
    }

    /* ── Color picker ────────────────────────────────────────────── */

    .color-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s, transform 0.1s;
      padding: 0;
      background: none;
    }
    .color-swatch:hover {
      transform: scale(1.15);
    }
    .color-swatch.selected {
      border-color: var(--primary-text-color, #212121);
      transform: scale(1.15);
    }

    .color-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    /* ── Form actions ────────────────────────────────────────────── */

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 18px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      transition: opacity 0.15s, background 0.15s;
    }

    .btn-secondary {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color, #212121);
    }
    .btn-secondary:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .btn-primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .btn-primary:hover {
      opacity: 0.9;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Close button ────────────────────────────────────────────── */

    .close-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 16px;
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
    .close-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    /* ── Empty state ─────────────────────────────────────────────── */

    .empty {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    /* ── Mobile adjustments ──────────────────────────────────────── */

    @media (max-width: 600px) {
      .backdrop {
        align-items: flex-end;
        padding: 0;
      }

      .dialog {
        border-radius: 16px 16px 0 0;
        max-width: 100%;
        max-height: 85vh;
        padding: 20px;
      }

      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `;

  /* ── Actions ────────────────────────────────────────────────────── */

  private _close(): void {
    this._editingTemplate = null;
    this._isNew = false;
    this._confirmDeleteId = null;
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
    if (e.key === "Escape") {
      if (this._editingTemplate) {
        this._editingTemplate = null;
        this._isNew = false;
      } else {
        this._close();
      }
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeydown);
  }

  /* ── Edit/Add/Delete ────────────────────────────────────────────── */

  private _startAdd(): void {
    const defaultCal = this.calendars.length > 0 ? this.calendars[0].id : "";
    this._editingTemplate = {
      name: "",
      calendar_id: defaultCal,
      start_time: "09:00",
      end_time: "17:00",
      color: PRESET_COLORS[0],
      emoji: "",
    };
    this._isNew = true;
    this._confirmDeleteId = null;
  }

  private _startEdit(template: ShiftTemplate): void {
    this._editingTemplate = { ...template };
    this._isNew = false;
    this._confirmDeleteId = null;
  }

  private _cancelEdit(): void {
    this._editingTemplate = null;
    this._isNew = false;
  }

  private _confirmDelete(id: string): void {
    this._confirmDeleteId = id;
  }

  private _cancelDelete(): void {
    this._confirmDeleteId = null;
  }

  private async _doDelete(id: string): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.callWS({
        type: "calee/delete_template",
        template_id: id,
      });
      this.dispatchEvent(
        new CustomEvent("template-deleted", {
          detail: { templateId: id },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
    this._confirmDeleteId = null;
  }

  private async _saveTemplate(): Promise<void> {
    if (!this.hass || !this._editingTemplate) return;

    const tpl = this._editingTemplate;
    if (!tpl.name || !tpl.start_time || !tpl.end_time) return;

    this._saving = true;
    try {
      if (this._isNew) {
        const created = await this.hass.callWS({
          type: "calee/create_template",
          name: tpl.name,
          calendar_id: tpl.calendar_id || "",
          start_time: tpl.start_time,
          end_time: tpl.end_time,
          color: tpl.color || PRESET_COLORS[0],
          emoji: tpl.emoji || "",
        });
        this.dispatchEvent(
          new CustomEvent("template-created", {
            detail: { template: created },
            bubbles: true,
            composed: true,
          }),
        );
      } else if (tpl.id) {
        // Update in place — preserves the template ID so existing events
        // keep their template_id reference.
        const updated = await this.hass.callWS({
          type: "calee/update_template",
          template_id: tpl.id,
          name: tpl.name,
          calendar_id: tpl.calendar_id || "",
          start_time: tpl.start_time,
          end_time: tpl.end_time,
          color: tpl.color || PRESET_COLORS[0],
          emoji: tpl.emoji || "",
        });
        this.dispatchEvent(
          new CustomEvent("template-created", {
            detail: { template: updated },
            bubbles: true,
            composed: true,
          }),
        );
      }
    } catch (err) {
      console.error("Failed to save template:", err);
    }

    this._saving = false;
    this._editingTemplate = null;
    this._isNew = false;
  }

  private _updateField(field: string, value: string): void {
    if (!this._editingTemplate) return;
    this._editingTemplate = { ...this._editingTemplate, [field]: value };
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <h3 class="dialog-title">Manage Templates</h3>
          <p class="dialog-subtitle">Add, edit, or remove shift templates</p>

          ${this.templates.length === 0 && !this._editingTemplate
            ? html`<div class="empty">No templates yet</div>`
            : html`
                <div class="template-list">
                  ${this.templates.map((t) => this._renderTemplateRow(t))}
                </div>
              `}

          ${!this._editingTemplate
            ? html`
                <button class="add-btn" @click=${this._startAdd}>
                  + Add template
                </button>
              `
            : nothing}

          ${this._editingTemplate ? this._renderEditForm() : nothing}

          <button class="close-btn" @click=${this._close}>Close</button>
        </div>
      </div>
    `;
  }

  private _renderTemplateRow(t: ShiftTemplate) {
    const overnight = isOvernight(t.start_time, t.end_time);
    const isDeleting = this._confirmDeleteId === t.id;

    return html`
      <div>
        <div class="template-row">
          <span class="tpl-color-dot" style="background:${t.color}"></span>
          <div class="tpl-info">
            <div class="tpl-name">${t.emoji ? html`${t.emoji} ` : nothing}${t.name}</div>
            <div class="tpl-time">
              ${formatTimeRange(t.start_time, t.end_time)}
              ${overnight ? html`<span class="overnight-badge">Overnight</span>` : nothing}
            </div>
          </div>
          <div class="tpl-actions">
            <button
              class="icon-btn"
              title="Edit template"
              @click=${() => this._startEdit(t)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button
              class="icon-btn danger"
              title="Delete template"
              @click=${() => this._confirmDelete(t.id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        ${isDeleting
          ? html`
              <div class="confirm-delete">
                <span>Delete "${t.name}"?</span>
                <button class="confirm-delete-btn confirm-no" @click=${this._cancelDelete}>Cancel</button>
                <button class="confirm-delete-btn confirm-yes" @click=${() => this._doDelete(t.id)}>Delete</button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderEditForm() {
    const tpl = this._editingTemplate!;
    return html`
      <div class="edit-form">
        <h4 class="edit-form-title">${this._isNew ? "New Template" : "Edit Template"}</h4>

        <div class="form-field">
          <span class="form-label">Name</span>
          <input
            class="form-input"
            type="text"
            .value=${tpl.name ?? ""}
            @input=${(e: InputEvent) =>
              this._updateField("name", (e.target as HTMLInputElement).value)}
            placeholder="e.g. Early Shift"
            autofocus
          />
        </div>

        <div class="form-field">
          <span class="form-label">Emoji</span>
          <input
            class="form-input"
            type="text"
            .value=${tpl.emoji ?? ""}
            @input=${(e: InputEvent) =>
              this._updateField("emoji", (e.target as HTMLInputElement).value)}
            placeholder="e.g. \u2600\ufe0f"
            style="max-width: 80px;"
          />
        </div>

        <div class="form-field">
          <span class="form-label">Calendar</span>
          <select
            class="form-input"
            .value=${tpl.calendar_id ?? ""}
            @change=${(e: Event) =>
              this._updateField("calendar_id", (e.target as HTMLSelectElement).value)}
          >
            ${this.calendars.map(
              (c) => html`
                <option value=${c.id} ?selected=${c.id === tpl.calendar_id}>
                  ${c.name}
                </option>
              `,
            )}
          </select>
        </div>

        <div class="form-row">
          <div class="form-field">
            <span class="form-label">Start time</span>
            <input
              class="form-input"
              type="time"
              .value=${tpl.start_time ?? "09:00"}
              @input=${(e: InputEvent) =>
                this._updateField("start_time", (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-field">
            <span class="form-label">End time</span>
            <input
              class="form-input"
              type="time"
              .value=${tpl.end_time ?? "17:00"}
              @input=${(e: InputEvent) =>
                this._updateField("end_time", (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div class="form-field">
          <span class="form-label">Color</span>
          <div class="color-grid">
            ${PRESET_COLORS.map(
              (c) => html`
                <button
                  class="color-swatch ${c === tpl.color ? "selected" : ""}"
                  @click=${() => this._updateField("color", c)}
                  title=${c}
                >
                  <div class="color-inner" style="background:${c}"></div>
                </button>
              `,
            )}
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" @click=${this._cancelEdit}>Cancel</button>
          <button
            class="btn btn-primary"
            ?disabled=${this._saving || !tpl.name}
            @click=${this._saveTemplate}
          >
            ${this._saving ? "Saving..." : this._isNew ? "Add" : "Save"}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-template-manager": CaleeTemplateManager;
  }
}
