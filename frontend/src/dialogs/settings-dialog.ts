/**
 * <calee-settings-dialog> -- Modal for configuring panel preferences.
 *
 * Settings include:
 *  - Time format (12h / 24h)
 *  - Week starts on (Monday / Sunday)
 *  - Event pruning retention (max_event_age_days)
 *  - Currency symbol
 *  - Budget amount
 *
 * All settings are stored on the backend via HA config entry options,
 * read/written through calee/get_settings and calee/update_settings WS
 * commands. This ensures settings sync across all devices and browsers.
 *
 * Custom categories remain in localStorage (UI-specific).
 *
 * Dispatches: `settings-changed`, `dialog-close`.
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerCalendar } from "../store/types.js";

export interface CaleeSettings {
  timeFormat: "12h" | "24h";
  weekStartsOn: "monday" | "sunday";
  maxEventAgeDays: number;
  currencySymbol: string;
  budgetAmount: number | null;
  notificationsEnabled?: boolean;
  morningSummaryEnabled?: boolean;
  morningSummaryHour?: number;
  notificationTarget?: string;
  reminderCalendars?: string[];
  customCategories?: string[];
}

interface NotifyServiceOption {
  service: string;
  name: string;
}

@customElement("calee-settings-dialog")
export class CaleeSettingsDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) hass: any;

  @state() private _timeFormat: "12h" | "24h" = "12h";
  @state() private _weekStartsOn: "monday" | "sunday" = "monday";
  @state() private _maxEventAgeDays = 365;
  @state() private _currencySymbol = "$";
  @state() private _budgetAmount: number | null = null;
  @state() private _customCategories: string[] = [];
  @state() private _newCategoryText = "";
  @state() private _strictPrivacy = false;
  @state() private _notificationsEnabled = true;
  @state() private _morningSummaryEnabled = true;
  @state() private _morningSummaryHour = 7;
  @state() private _notificationTarget = "";
  @state() private _reminderCalendars: string[] = [];
  @state() private _notifyServices: NotifyServiceOption[] = [];
  @state() private _calendarOptions: PlannerCalendar[] = [];
  @state() private _saving = false;
  @state() private _loadingSettings = false;

  static styles = css`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

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

    .card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      padding: 24px;
      width: 90%;
      max-width: 460px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(12px); opacity: 0; }
    }

    h2 {
      margin: 0 0 20px;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2 svg {
      width: 20px;
      height: 20px;
      color: var(--secondary-text-color, #727272);
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 10px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
    }

    .setting-row:last-child {
      border-bottom: none;
    }

    .setting-label {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
    }

    .setting-desc {
      font-size: 12px;
      color: var(--secondary-text-color, #999);
      margin-top: 2px;
    }

    /* Toggle switch */
    .toggle-group {
      display: flex;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .toggle-opt {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--secondary-text-color, #727272);
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }

    .toggle-opt[active] {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }

    /* Number / text inputs */
    .setting-input {
      width: 80px;
      padding: 6px 10px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
      outline: none;
      text-align: right;
    }

    .setting-input:focus {
      border-color: var(--primary-color, #03a9f4);
      background: var(--card-background-color, #fff);
    }

    .setting-input.short {
      width: 60px;
    }

    .setting-input.currency {
      width: 50px;
      text-align: center;
    }

    .setting-select {
      min-width: 180px;
      padding: 8px 12px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 13px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      outline: none;
    }

    .choice-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .choice-chip {
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .choice-chip[selected] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 16%, transparent);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 35%, var(--divider-color, #e0e0e0));
      color: var(--primary-text-color, #212121);
    }

    /* Slider */
    .slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .slider-row input[type="range"] {
      width: 120px;
      accent-color: var(--primary-color, #03a9f4);
    }

    .slider-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      min-width: 50px;
      text-align: right;
    }

    /* Category tags */
    .category-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .category-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 16px;
      font-size: 13px;
      color: var(--primary-text-color, #212121);
    }

    .category-tag-label {
      font-weight: 500;
    }

    .category-tag-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
      border-radius: 50%;
      transition: color 0.15s, background 0.15s;
    }

    .category-tag-remove:hover {
      color: var(--error-color, #f44336);
      background: rgba(244, 67, 54, 0.08);
    }

    .category-add-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-add-cat {
      padding: 6px 14px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: opacity 0.15s;
      flex-shrink: 0;
    }

    .btn-add-cat:hover {
      opacity: 0.9;
    }

    /* Actions */
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .btn {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
    }

    .btn-cancel {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .btn-cancel:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .btn-save {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }

    .btn-save:hover {
      opacity: 0.9;
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  willUpdate(changed: PropertyValues): void {
    if (changed.has("open") && this.open) {
      this._loadCurrent();
    }
  }

  private async _loadCurrent(): Promise<void> {
    this._newCategoryText = "";

    // Load custom categories from localStorage (UI-specific)
    try {
      const raw = localStorage.getItem("calee-custom-categories");
      this._customCategories = raw ? JSON.parse(raw) : [];
    } catch {
      this._customCategories = [];
    }

    // Load settings from backend via WS
    if (this.hass) {
      this._loadingSettings = true;
      try {
        const [result, services, calendars] = await Promise.all([
          this.hass.callWS({ type: "calee/get_settings" }),
          this.hass.callWS({ type: "calee/notify_services" }).catch(() => []),
          this.hass.callWS({ type: "calee/calendars" }).catch(() => []),
        ]);
        this._timeFormat = result.time_format ?? "12h";
        this._weekStartsOn = result.week_start ?? "monday";
        this._maxEventAgeDays = result.max_event_age_days ?? 365;
        this._currencySymbol = result.currency ?? "$";
        this._budgetAmount = result.budget > 0 ? result.budget : null;
        this._strictPrivacy = result.strict_privacy ?? false;
        this._notificationsEnabled = result.notifications_enabled ?? true;
        this._morningSummaryEnabled = result.morning_summary_enabled ?? true;
        this._morningSummaryHour = result.morning_summary_hour ?? 7;
        this._notificationTarget = this._toNotifyServiceValue(result.notification_target ?? "");
        this._reminderCalendars = Array.isArray(result.reminder_calendars) ? result.reminder_calendars : [];
        this._notifyServices = Array.isArray(services) ? services : [];
        this._calendarOptions = Array.isArray(calendars) ? calendars : [];
      } catch {
        // Fallback defaults if WS fails
        this._timeFormat = "12h";
        this._weekStartsOn = "monday";
        this._maxEventAgeDays = 365;
        this._currencySymbol = "$";
        this._budgetAmount = null;
        this._strictPrivacy = false;
        this._notificationsEnabled = true;
        this._morningSummaryEnabled = true;
        this._morningSummaryHour = 7;
        this._notificationTarget = "";
        this._reminderCalendars = [];
        this._notifyServices = [];
        this._calendarOptions = [];
      } finally {
        this._loadingSettings = false;
      }
    }
  }

  private _toNotifyServiceValue(target: string): string {
    if (!target) return "";
    return target.startsWith("notify.") ? target : `notify.${target}`;
  }

  private _toggleReminderCalendar(calendarId: string): void {
    this._reminderCalendars = this._reminderCalendars.includes(calendarId)
      ? this._reminderCalendars.filter((id) => id !== calendarId)
      : [...this._reminderCalendars, calendarId];
  }

  private _close(): void {
    this.dispatchEvent(
      new CustomEvent("dialog-close", { bubbles: true, composed: true }),
    );
  }

  private _addCategory(): void {
    const name = this._newCategoryText.trim().toLowerCase();
    if (!name || this._customCategories.includes(name)) {
      this._newCategoryText = "";
      return;
    }
    this._customCategories = [...this._customCategories, name];
    this._newCategoryText = "";
  }

  private _removeCategory(cat: string): void {
    this._customCategories = this._customCategories.filter((c) => c !== cat);
  }

  private _onNewCategoryKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      this._addCategory();
    }
  }

  private async _save(): Promise<void> {
    this._saving = true;

    // Save custom categories to localStorage (UI-specific)
    try {
      localStorage.setItem("calee-custom-categories", JSON.stringify(this._customCategories));
    } catch {
      // ignore
    }

    // Push settings to backend via WS
    if (this.hass) {
      try {
        await this.hass.callWS({
          type: "calee/update_settings",
          max_event_age_days: this._maxEventAgeDays,
          currency: this._currencySymbol,
          budget: this._budgetAmount ?? 0,
          week_start: this._weekStartsOn,
          time_format: this._timeFormat,
          strict_privacy: this._strictPrivacy,
          notifications_enabled: this._notificationsEnabled,
          morning_summary_enabled: this._morningSummaryEnabled,
          morning_summary_hour: this._morningSummaryHour,
          notification_target: this._notificationTarget,
          reminder_calendars: this._reminderCalendars,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Calee] Failed to save settings:", err);
      }
    }

    const settings: CaleeSettings = {
      timeFormat: this._timeFormat,
      weekStartsOn: this._weekStartsOn,
      maxEventAgeDays: this._maxEventAgeDays,
      currencySymbol: this._currencySymbol,
      budgetAmount: this._budgetAmount,
      notificationsEnabled: this._notificationsEnabled,
      morningSummaryEnabled: this._morningSummaryEnabled,
      morningSummaryHour: this._morningSummaryHour,
      notificationTarget: this._notificationTarget,
      reminderCalendars: this._reminderCalendars,
      customCategories: this._customCategories,
    };

    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: settings,
        bubbles: true,
        composed: true,
      }),
    );

    this._saving = false;
    this._close();
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._close}>
        <div class="card" @click=${(e: Event) => e.stopPropagation()}>
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
            </svg>
            Settings
          </h2>

          <!-- Display -->
          <div class="section">
            <div class="section-title">Display</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Time format</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${this._timeFormat === "12h"}
                  @click=${() => { this._timeFormat = "12h"; }}
                >12h</button>
                <button
                  class="toggle-opt"
                  ?active=${this._timeFormat === "24h"}
                  @click=${() => { this._timeFormat = "24h"; }}
                >24h</button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Week starts on</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${this._weekStartsOn === "monday"}
                  @click=${() => { this._weekStartsOn = "monday"; }}
                >Monday</button>
                <button
                  class="toggle-opt"
                  ?active=${this._weekStartsOn === "sunday"}
                  @click=${() => { this._weekStartsOn = "sunday"; }}
                >Sunday</button>
              </div>
            </div>
          </div>

          <!-- Data -->
          <div class="section">
            <div class="section-title">Data</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Event retention</div>
                <div class="setting-desc">Keep events for this many days</div>
              </div>
              <div class="slider-row">
                <input
                  type="range"
                  min="30"
                  max="3650"
                  step="5"
                  .value=${String(this._maxEventAgeDays)}
                  @input=${(e: Event) => {
                    this._maxEventAgeDays = Number((e.target as HTMLInputElement).value);
                  }}
                />
                <span class="slider-value">${this._maxEventAgeDays}d</span>
              </div>
            </div>

          </div>

          <!-- Budget -->
          <div class="section">
            <div class="section-title">Budget</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Currency symbol</div>
              </div>
              <input
                type="text"
                class="setting-input currency"
                maxlength="4"
                .value=${this._currencySymbol}
                @input=${(e: Event) => {
                  this._currencySymbol = (e.target as HTMLInputElement).value || "$";
                }}
              />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Budget amount</div>
                <div class="setting-desc">Optional monthly budget</div>
              </div>
              <input
                type="number"
                class="setting-input"
                min="0"
                step="1"
                placeholder="--"
                .value=${this._budgetAmount !== null ? String(this._budgetAmount) : ""}
                @input=${(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this._budgetAmount = val ? Number(val) : null;
                }}
              />
            </div>
          </div>

          <div class="section">
            <div class="section-title">Notifications</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Event reminders</div>
                <div class="setting-desc">Enable scheduled reminder notifications for selected calendars.</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${!this._notificationsEnabled}
                  @click=${() => { this._notificationsEnabled = false; }}
                >Off</button>
                <button
                  class="toggle-opt"
                  ?active=${this._notificationsEnabled}
                  @click=${() => { this._notificationsEnabled = true; }}
                >On</button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Morning summary</div>
                <div class="setting-desc">Send one morning brief with today's planner context.</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${!this._morningSummaryEnabled}
                  @click=${() => { this._morningSummaryEnabled = false; }}
                >Off</button>
                <button
                  class="toggle-opt"
                  ?active=${this._morningSummaryEnabled}
                  @click=${() => { this._morningSummaryEnabled = true; }}
                >On</button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Morning summary hour</div>
                <div class="setting-desc">24-hour time used for the daily summary check.</div>
              </div>
              <input
                type="number"
                class="setting-input short"
                min="0"
                max="23"
                .value=${String(this._morningSummaryHour)}
                @input=${(e: Event) => {
                  const value = Number((e.target as HTMLInputElement).value);
                  this._morningSummaryHour = Number.isFinite(value) ? Math.min(23, Math.max(0, value)) : 7;
                }}
              />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Notification destination</div>
                <div class="setting-desc">Choose the Home Assistant notify service used for mobile pushes.</div>
              </div>
              <select
                class="setting-select"
                .value=${this._notificationTarget}
                @change=${(e: Event) => {
                  this._notificationTarget = (e.target as HTMLSelectElement).value;
                }}
              >
                <option value="">Default notify service</option>
                ${this._notifyServices.map(
                  (service) => html`<option value=${service.service}>${service.name}</option>`,
                )}
              </select>
            </div>

            <div class="setting-row" style="flex-direction:column;align-items:stretch;">
              <div>
                <div class="setting-label">Reminder calendars</div>
                <div class="setting-desc">Only these calendars will trigger reminders and morning summaries.</div>
              </div>
              <div class="choice-list">
                ${this._calendarOptions.map(
                  (calendar) => html`
                    <button
                      class="choice-chip"
                      ?selected=${this._reminderCalendars.includes(calendar.id)}
                      @click=${() => this._toggleReminderCalendar(calendar.id)}
                    >${calendar.name}</button>
                  `,
                )}
              </div>
            </div>
          </div>

          <!-- Privacy -->
          <div class="section">
            <div class="section-title">Privacy</div>

            <div class="setting-row">
              <div>
                <div class="setting-label">Strict privacy mode</div>
                <div class="setting-desc">New calendars/lists default to private. Unassigned resources are hidden from users without explicit roles.</div>
              </div>
              <div class="toggle-group">
                <button
                  class="toggle-opt"
                  ?active=${!this._strictPrivacy}
                  @click=${() => { this._strictPrivacy = false; }}
                >Off</button>
                <button
                  class="toggle-opt"
                  ?active=${this._strictPrivacy}
                  @click=${() => { this._strictPrivacy = true; }}
                >On</button>
              </div>
            </div>
          </div>

          <!-- Shopping Categories -->
          <div class="section">
            <div class="section-title">Shopping categories</div>

            <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px;">
              <div class="setting-desc" style="margin:0;">
                Default: Food, Household, Health, Personal, Other. Add your own below.
              </div>

              ${this._customCategories.length > 0
                ? html`
                    <div class="category-list">
                      ${this._customCategories.map(
                        (cat) => html`
                          <div class="category-tag">
                            <span class="category-tag-label">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                            <button
                              class="category-tag-remove"
                              @click=${() => this._removeCategory(cat)}
                              aria-label="Remove ${cat}"
                            >&times;</button>
                          </div>
                        `,
                      )}
                    </div>
                  `
                : nothing}

              <div class="category-add-row">
                <input
                  type="text"
                  class="setting-input"
                  style="width:auto;flex:1;text-align:left;"
                  placeholder="New category..."
                  .value=${this._newCategoryText}
                  @input=${(e: Event) => { this._newCategoryText = (e.target as HTMLInputElement).value; }}
                  @keydown=${this._onNewCategoryKeydown}
                />
                <button
                  class="btn btn-add-cat"
                  @click=${this._addCategory}
                >Add</button>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
            <button class="btn btn-save" ?disabled=${this._saving} @click=${this._save}>Save</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-settings-dialog": CaleeSettingsDialog;
  }
}
