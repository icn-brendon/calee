/**
 * <calee-task-quick-add> — Task quick-add bar with progressive disclosure.
 *
 * Shows an input field. On focus, date pills appear. After selecting a date,
 * recurrence pills appear. "More options" reveals a note textarea.
 *
 * Extracted from tasks-view.ts in Sprint 8.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { TaskPreset } from "../store/types.js";
import {
  type DatePill,
  type RecurrencePill,
  type TaskView,
  resolveDue,
} from "../helpers/task-helpers.js";

@customElement("calee-task-quick-add")
export class CaleeTaskQuickAdd extends LitElement {
  @property({ type: String }) activeView: TaskView = "inbox";
  @property({ type: Array }) presets: TaskPreset[] = [];

  @state() private _text = "";
  @state() private _focused = false;
  @state() private _datePill: DatePill = "none";
  @state() private _recurrence: RecurrencePill = "none";
  @state() private _customDate = "";
  @state() private _note = "";
  @state() private _showMore = false;

  @query("#qa-input") private _input!: HTMLInputElement;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 16px;
    }

    .input-row {
      display: flex;
      gap: 8px;
    }

    input[type="text"] {
      flex: 1;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="text"]:focus {
      border-color: var(--primary-color, #03a9f4);
    }
    input[type="text"]::placeholder {
      color: var(--secondary-text-color, #757575);
    }

    /* ── Pill rows ──────────────────────────────────────────────── */

    .pill-container {
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.2s ease, opacity 0.2s ease;
    }
    .pill-container.visible {
      max-height: 60px;
      opacity: 1;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .pill-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #757575);
      align-self: center;
      margin-right: 4px;
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
      color: var(--primary-text-color, #212121);
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
    .custom-date-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── More options ────────────────────────────────────────── */

    .more-toggle {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 0;
      margin-top: 4px;
    }
    .more-toggle:hover {
      color: var(--primary-color, #03a9f4);
    }

    .note-input {
      width: 100%;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      outline: none;
      box-sizing: border-box;
      resize: vertical;
      min-height: 36px;
      max-height: 120px;
      font-family: inherit;
      margin-top: 6px;
    }
    .note-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    /* ── Presets ──────────────────────────────────────────── */

    .presets-section {
      margin-top: 12px;
    }
    .presets-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 6px;
    }
    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }
    .preset-chip:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--primary-color, #03a9f4);
    }
    .preset-chip:active {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }
    .preset-chip ha-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
  `;

  /* ── Defaults per tab ──────────────────────────────────────────────── */

  private get _defaultDatePill(): DatePill {
    switch (this.activeView) {
      case "today": return "today";
      case "upcoming": return "tomorrow";
      default: return "none";
    }
  }

  updated(changed: import("lit").PropertyValues): void {
    if (changed.has("activeView")) {
      this._reset();
    }
  }

  private _reset(): void {
    this._text = "";
    this._datePill = this._defaultDatePill;
    this._recurrence = "none";
    this._customDate = "";
    this._note = "";
    this._showMore = false;
  }

  /* ── Handlers ──────────────────────────────────────────────────────── */

  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && this._text.trim()) {
      const due = resolveDue(this._datePill, this._customDate);
      const recurrence = this._recurrence !== "none" && due ? this._recurrence : undefined;

      const detail: Record<string, unknown> = {
        title: this._text.trim(),
        due,
        recurrence_rule: recurrence,
      };
      if (this._note.trim()) {
        detail.note = this._note.trim();
      }

      this.dispatchEvent(new CustomEvent("task-quick-add", { detail, bubbles: true, composed: true }));
      this._reset();
      this._input.value = "";
    }
  }

  private _onFocus(): void { this._focused = true; }
  private _onBlur(): void { setTimeout(() => { this._focused = false; }, 200); }
  private _onInput(e: Event): void { this._text = (e.target as HTMLInputElement).value; }

  private _onPresetClick(preset: TaskPreset): void {
    this.dispatchEvent(
      new CustomEvent("preset-add", { detail: { presetId: preset.id }, bubbles: true, composed: true }),
    );
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  render() {
    const showPills = this._focused || this._text.length > 0;
    const hasDue = this._datePill !== "none";

    return html`
      <div class="input-row">
        <input
          id="qa-input"
          type="text"
          placeholder="Add a task..."
          .value=${this._text}
          @input=${this._onInput}
          @keydown=${this._onKeydown}
          @focus=${this._onFocus}
          @blur=${this._onBlur}
        />
      </div>

      <div class="pill-container ${showPills ? "visible" : ""}">
        ${this._renderDatePills()}
      </div>

      <div class="pill-container ${showPills && hasDue ? "visible" : ""}">
        ${hasDue ? this._renderRecurrencePills() : nothing}
      </div>

      ${showPills ? html`
        <button class="more-toggle" @click=${() => { this._showMore = !this._showMore; }}>
          ${this._showMore ? "Less options" : "More options"}
        </button>
        ${this._showMore ? html`
          <textarea
            class="note-input"
            placeholder="Add a note..."
            .value=${this._note}
            @input=${(e: Event) => { this._note = (e.target as HTMLTextAreaElement).value; }}
          ></textarea>
        ` : nothing}
      ` : nothing}

      ${this.activeView === "inbox" && this.presets.length > 0 ? html`
        <div class="presets-section">
          <div class="presets-label">Quick add</div>
          <div class="presets-grid">
            ${this.presets.map((p) => html`
              <button class="preset-chip" @click=${() => this._onPresetClick(p)} title="Add ${p.title}">
                ${p.icon ? html`<ha-icon .icon=${p.icon}></ha-icon>` : nothing}
                ${p.title}
              </button>
            `)}
          </div>
        </div>
      ` : nothing}
    `;
  }

  /* ── Date pills ────────────────────────────────────────────────────── */

  private _renderDatePills() {
    const pills: { key: DatePill; label: string }[] = [
      { key: "today", label: "Today" },
      { key: "tomorrow", label: "Tomorrow" },
      { key: "nextweek", label: "Next week" },
      { key: "custom", label: "Custom" },
      { key: "none", label: "No date" },
    ];
    return html`
      <div class="pill-row">
        <span class="pill-label">Due</span>
        ${pills.map((p) => html`
          <button class="pill" aria-selected=${this._datePill === p.key}
            @click=${() => { this._datePill = p.key; if (p.key === "none") this._recurrence = "none"; }}>
            ${p.label}
          </button>
        `)}
        ${this._datePill === "custom" ? html`
          <input type="date" class="custom-date-input" .value=${this._customDate}
            @change=${(e: Event) => { this._customDate = (e.target as HTMLInputElement).value; }} />
        ` : nothing}
      </div>
    `;
  }

  /* ── Recurrence pills ──────────────────────────────────────────────── */

  private _renderRecurrencePills() {
    const pills: { key: RecurrencePill; label: string }[] = [
      { key: "none", label: "None" },
      { key: "daily", label: "Daily" },
      { key: "weekly", label: "Weekly" },
      { key: "biweekly", label: "Fortnightly" },
      { key: "monthly", label: "Monthly" },
      { key: "weekdays", label: "Weekdays" },
    ];
    return html`
      <div class="pill-row">
        <span class="pill-label">Repeat</span>
        ${pills.map((p) => html`
          <button class="pill recurrence-pill" aria-selected=${this._recurrence === p.key}
            @click=${() => { this._recurrence = p.key; }}>
            ${p.label}
          </button>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-task-quick-add": CaleeTaskQuickAdd;
  }
}
