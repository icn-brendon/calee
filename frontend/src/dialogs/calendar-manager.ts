/**
 * <calee-calendar-manager> -- Dialog for creating, editing, and deleting
 * calendars and to-do lists.
 *
 * Dispatches `calendar-changed` and `dialog-close` custom events.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerCalendar, PlannerList } from "../store/types.js";

/* ── Preset colours for the colour picker ─────────────────────────── */

const COLOUR_OPTIONS = [
  "#e57373", "#f06292", "#ba68c8", "#9575cd",
  "#7986cb", "#64b5f6", "#4fc3f7", "#4dd0e1",
  "#4db6ac", "#81c784", "#aed581", "#dce775",
  "#fff176", "#ffd54f", "#ffb74d", "#ff8a65",
  "#a1887f", "#90a4ae",
];

@customElement("calee-calendar-manager")
export class CaleeCalendarManager extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Array }) calendars: PlannerCalendar[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _editingCalendarId: string | null = null;
  @state() private _editName = "";
  @state() private _editColor = "#64b5f6";
  @state() private _editEmoji = "";
  @state() private _addingCalendar = false;
  @state() private _newCalName = "";
  @state() private _newCalColor = "#64b5f6";
  @state() private _newCalEmoji = "";
  @state() private _editingListId: string | null = null;
  @state() private _editListName = "";
  @state() private _addingList = false;
  @state() private _newListName = "";
  @state() private _newListType = "standard";
  @state() private _confirmDeleteId: string | null = null;
  @state() private _confirmDeleteType: "calendar" | "list" | null = null;

  static styles = css`
    :host { display: none; }
    :host([open]) { display: block; }

    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
      padding: 16px;
    }
    @keyframes fadeIn { from { opacity: 0; } }

    .dialog {
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      padding: 24px;
      width: 100%; max-width: 500px; max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }

    h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--primary-text-color, #212121); }
    h3 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: var(--secondary-text-color, #757575); text-transform: uppercase; letter-spacing: 0.5px; }

    .item-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .item-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
    }

    .item-name {
      flex: 1; font-size: 14px; color: var(--primary-text-color, #212121);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .icon-btn {
      all: unset; cursor: pointer; padding: 4px; border-radius: 4px;
      font-size: 13px; color: var(--secondary-text-color, #757575);
      transition: background 0.15s;
    }
    .icon-btn:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
    .icon-btn.danger { color: var(--error-color, #f44336); }

    .edit-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0;
    }

    .edit-input {
      flex: 1; font-size: 14px; padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none; box-sizing: border-box; font-family: inherit;
    }
    .edit-input:focus { border-color: var(--primary-color, #03a9f4); }

    .color-row {
      display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0;
    }

    .color-swatch {
      width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .color-swatch.selected { border-color: var(--primary-text-color, #212121); }

    .add-btn {
      all: unset; cursor: pointer;
      font-size: 13px; font-weight: 500;
      color: var(--primary-color, #03a9f4);
      padding: 6px 0; display: block;
    }
    .add-btn:hover { text-decoration: underline; }

    .save-btn {
      padding: 4px 12px; border: none; border-radius: 6px;
      background: var(--primary-color, #03a9f4); color: #fff;
      cursor: pointer; font-size: 13px; font-weight: 500;
    }

    .cancel-btn {
      padding: 4px 12px; border: none; border-radius: 6px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
      cursor: pointer; font-size: 13px; font-weight: 500;
    }

    .close-btn {
      all: unset; cursor: pointer; padding: 4px 8px;
      font-size: 18px; color: var(--secondary-text-color, #757575);
      border-radius: 6px; transition: background 0.15s;
    }
    .close-btn:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }

    .confirm-box {
      background: color-mix(in srgb, var(--error-color, #f44336) 8%, transparent);
      border: 1px solid var(--error-color, #f44336);
      border-radius: 8px; padding: 12px; margin: 8px 0;
      font-size: 13px; color: var(--primary-text-color, #212121);
    }
    .confirm-box p { margin: 0 0 8px; }
    .confirm-actions { display: flex; gap: 8px; }
    .confirm-delete-btn {
      padding: 4px 12px; border: none; border-radius: 6px;
      background: var(--error-color, #f44336); color: #fff;
      cursor: pointer; font-size: 13px; font-weight: 500;
    }
  `;

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._onBackdropClick}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2>Manage Calendars & Lists</h2>
            <button class="close-btn" @click=${this._close}>&times;</button>
          </div>

          <h3>Calendars</h3>
          ${this.calendars.map((cal) => this._renderCalendarItem(cal))}
          ${this._addingCalendar ? this._renderAddCalendarForm() : html`
            <button class="add-btn" @click=${() => { this._addingCalendar = true; this._newCalName = ""; this._newCalColor = "#64b5f6"; this._newCalEmoji = ""; }}>+ Add calendar</button>
          `}

          <h3>Lists</h3>
          ${this.lists.map((lst) => this._renderListItem(lst))}
          ${this._addingList ? this._renderAddListForm() : html`
            <button class="add-btn" @click=${() => { this._addingList = true; this._newListName = ""; this._newListType = "standard"; }}>+ Add list</button>
          `}
        </div>
      </div>
    `;
  }

  private _renderCalendarItem(cal: PlannerCalendar) {
    if (this._confirmDeleteId === cal.id && this._confirmDeleteType === "calendar") {
      return html`
        <div class="confirm-box">
          <p>Delete <strong>${cal.name}</strong>? All events in this calendar will be deleted. This cannot be undone.</p>
          <div class="confirm-actions">
            <button class="confirm-delete-btn" @click=${() => this._doDeleteCalendar(cal.id)}>Delete</button>
            <button class="cancel-btn" @click=${() => { this._confirmDeleteId = null; this._confirmDeleteType = null; }}>Cancel</button>
          </div>
        </div>
      `;
    }

    if (this._editingCalendarId === cal.id) {
      return html`
        <div style="padding:8px 0;">
          <div class="edit-row">
            <div class="item-dot" style="background:${this._editColor}"></div>
            <input class="edit-input" .value=${this._editName} @input=${(e: Event) => { this._editName = (e.target as HTMLInputElement).value; }} placeholder="Calendar name" />
            <input class="edit-input" style="width:50px;flex:none;" .value=${this._editEmoji} @input=${(e: Event) => { this._editEmoji = (e.target as HTMLInputElement).value; }} placeholder="Emoji" />
          </div>
          <div class="color-row">
            ${COLOUR_OPTIONS.map((c) => html`
              <div class="color-swatch ${this._editColor === c ? "selected" : ""}" style="background:${c}" @click=${() => { this._editColor = c; }}></div>
            `)}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="save-btn" @click=${() => this._saveCalendar(cal.id)}>Save</button>
            <button class="cancel-btn" @click=${() => { this._editingCalendarId = null; }}>Cancel</button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="item-row">
        <div class="item-dot" style="background:${cal.color}"></div>
        <span class="item-name">${cal.emoji ? `${cal.emoji} ` : ""}${cal.name}</span>
        <button class="icon-btn" @click=${() => this._toggleCalendarPrivacy(cal)} title="${cal.is_private ? 'Make public' : 'Make private'}" style="color:${cal.is_private ? 'var(--primary-color,#03a9f4)' : 'var(--secondary-text-color,#999)'};">
          ${cal.is_private ? "\u{1F512}" : "\u{1F513}"}
        </button>
        <button class="icon-btn" @click=${() => { this._editingCalendarId = cal.id; this._editName = cal.name; this._editColor = cal.color; this._editEmoji = cal.emoji || ""; }} title="Edit">&#9998;</button>
        <button class="icon-btn danger" @click=${() => { this._confirmDeleteId = cal.id; this._confirmDeleteType = "calendar"; }} title="Delete">&#128465;</button>
      </div>
    `;
  }

  private _renderAddCalendarForm() {
    return html`
      <div style="padding:8px 0;">
        <div class="edit-row">
          <div class="item-dot" style="background:${this._newCalColor}"></div>
          <input class="edit-input" .value=${this._newCalName} @input=${(e: Event) => { this._newCalName = (e.target as HTMLInputElement).value; }} placeholder="Calendar name" />
          <input class="edit-input" style="width:50px;flex:none;" .value=${this._newCalEmoji} @input=${(e: Event) => { this._newCalEmoji = (e.target as HTMLInputElement).value; }} placeholder="Emoji" />
        </div>
        <div class="color-row">
          ${COLOUR_OPTIONS.map((c) => html`
            <div class="color-swatch ${this._newCalColor === c ? "selected" : ""}" style="background:${c}" @click=${() => { this._newCalColor = c; }}></div>
          `)}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="save-btn" @click=${this._addCalendar}>Create</button>
          <button class="cancel-btn" @click=${() => { this._addingCalendar = false; }}>Cancel</button>
        </div>
      </div>
    `;
  }

  private _renderListItem(lst: PlannerList) {
    if (this._confirmDeleteId === lst.id && this._confirmDeleteType === "list") {
      return html`
        <div class="confirm-box">
          <p>Delete <strong>${lst.name}</strong>? All tasks in this list will be deleted. This cannot be undone.</p>
          <div class="confirm-actions">
            <button class="confirm-delete-btn" @click=${() => this._doDeleteList(lst.id)}>Delete</button>
            <button class="cancel-btn" @click=${() => { this._confirmDeleteId = null; this._confirmDeleteType = null; }}>Cancel</button>
          </div>
        </div>
      `;
    }

    if (this._editingListId === lst.id) {
      return html`
        <div class="edit-row">
          <input class="edit-input" .value=${this._editListName} @input=${(e: Event) => { this._editListName = (e.target as HTMLInputElement).value; }} placeholder="List name" />
          <button class="save-btn" @click=${() => this._saveList(lst.id)}>Save</button>
          <button class="cancel-btn" @click=${() => { this._editingListId = null; }}>Cancel</button>
        </div>
      `;
    }

    return html`
      <div class="item-row">
        <span class="item-name">${lst.name}</span>
        <span style="font-size:11px;color:var(--secondary-text-color,#999);padding:2px 6px;border-radius:4px;background:var(--secondary-background-color,#f0f0f0);">${lst.list_type}</span>
        <button class="icon-btn" @click=${() => this._toggleListPrivacy(lst)} title="${lst.is_private ? 'Make public' : 'Make private'}" style="color:${lst.is_private ? 'var(--primary-color,#03a9f4)' : 'var(--secondary-text-color,#999)'};">
          ${lst.is_private ? "\u{1F512}" : "\u{1F513}"}
        </button>
        <button class="icon-btn" @click=${() => { this._editingListId = lst.id; this._editListName = lst.name; }} title="Edit">&#9998;</button>
        <button class="icon-btn danger" @click=${() => { this._confirmDeleteId = lst.id; this._confirmDeleteType = "list"; }} title="Delete">&#128465;</button>
      </div>
    `;
  }

  private _renderAddListForm() {
    return html`
      <div style="padding:8px 0;">
        <div class="edit-row">
          <input class="edit-input" .value=${this._newListName} @input=${(e: Event) => { this._newListName = (e.target as HTMLInputElement).value; }} placeholder="List name" />
          <select class="edit-input" style="flex:none;width:120px;" .value=${this._newListType} @change=${(e: Event) => { this._newListType = (e.target as HTMLSelectElement).value; }}>
            <option value="standard">Standard</option>
            <option value="shopping">Shopping</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="save-btn" @click=${this._addList}>Create</button>
          <button class="cancel-btn" @click=${() => { this._addingList = false; }}>Cancel</button>
        </div>
      </div>
    `;
  }

  // ── Actions ────────────────────────────────────────────────────────

  private async _addCalendar(): Promise<void> {
    if (!this._newCalName.trim()) return;
    try {
      await this.hass.callWS({
        type: "calee/create_calendar",
        name: this._newCalName.trim(),
        color: this._newCalColor,
        emoji: this._newCalEmoji,
      });
      this._addingCalendar = false;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to create calendar:", err);
    }
  }

  private async _saveCalendar(id: string): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/update_calendar",
        calendar_id: id,
        name: this._editName.trim() || undefined,
        color: this._editColor || undefined,
        emoji: this._editEmoji,
      });
      this._editingCalendarId = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to update calendar:", err);
    }
  }

  private async _doDeleteCalendar(id: string): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/delete_calendar",
        calendar_id: id,
      });
      this._confirmDeleteId = null;
      this._confirmDeleteType = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to delete calendar:", err);
    }
  }

  private async _addList(): Promise<void> {
    if (!this._newListName.trim()) return;
    try {
      await this.hass.callWS({
        type: "calee/create_list",
        name: this._newListName.trim(),
        list_type: this._newListType,
      });
      this._addingList = false;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to create list:", err);
    }
  }

  private async _saveList(id: string): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/update_list",
        list_id: id,
        name: this._editListName.trim() || undefined,
      });
      this._editingListId = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to update list:", err);
    }
  }

  private async _doDeleteList(id: string): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/delete_list",
        list_id: id,
      });
      this._confirmDeleteId = null;
      this._confirmDeleteType = null;
      this._fireChanged();
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  }

  private async _toggleCalendarPrivacy(cal: PlannerCalendar): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/set_calendar_private",
        calendar_id: cal.id,
        is_private: !cal.is_private,
      });
      this._fireChanged();
    } catch (err) {
      console.error("Failed to toggle calendar privacy:", err);
    }
  }

  private async _toggleListPrivacy(lst: PlannerList): Promise<void> {
    try {
      await this.hass.callWS({
        type: "calee/set_list_private",
        list_id: lst.id,
        is_private: !lst.is_private,
      });
      this._fireChanged();
    } catch (err) {
      console.error("Failed to toggle list privacy:", err);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private _fireChanged(): void {
    this.dispatchEvent(new CustomEvent("calendar-changed", { bubbles: true, composed: true }));
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true, composed: true }));
  }

  private _onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains("backdrop")) {
      this._close();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-calendar-manager": CaleeCalendarManager;
  }
}
