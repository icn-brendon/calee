import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "../views/smart-views.js";
import "../views/year-view.js";

import type {
  Conflict,
  MoreSubView,
  PlannerCalendar,
  PlannerEvent,
  PlannerList,
  PlannerTask,
} from "../store/types.js";

@customElement("calee-more-page")
export class CaleeMorePage extends LitElement {
  @property({ type: Array }) events: PlannerEvent[] = [];
  @property({ type: Array }) tasks: PlannerTask[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Array }) conflicts: Conflict[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ attribute: false }) selectedDate: Date = new Date();
  @property({ type: String }) currency = "$";
  @property({ type: Number }) budget = 0;
  @property({ type: Array }) reminderCalendars: string[] = ["work_shifts"];
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property({ type: String }) initialSubView: MoreSubView = "smart";

  @state() private _activeSubView: MoreSubView = "smart";

  override connectedCallback(): void {
    super.connectedCallback();
    this._activeSubView = this.initialSubView;
  }

  override willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has("initialSubView") && this.initialSubView !== this._activeSubView) {
      this._activeSubView = this.initialSubView;
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: var(--card-background-color, #fff);
    }

    .header {
      padding: 18px 16px 12px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent), transparent 74%),
        var(--card-background-color, #fff);
      flex-shrink: 0;
    }

    .eyebrow {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--secondary-text-color, #727272);
    }

    h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
      color: var(--primary-text-color, #212121);
    }

    .sub {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.45;
      color: var(--secondary-text-color, #727272);
      max-width: 64ch;
    }

    .tabs {
      display: flex;
      gap: 8px;
      padding: 12px 16px 0;
      overflow-x: auto;
      flex-shrink: 0;
    }

    .tab {
      appearance: none;
      border: none;
      border-radius: 999px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--secondary-text-color, #727272);
      padding: 9px 14px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .tab:hover {
      color: var(--primary-text-color, #212121);
      transform: translateY(-1px);
    }

    .tab[active] {
      color: var(--primary-color, #03a9f4);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
    }

    .content {
      min-height: 0;
      flex: 1;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .note {
      padding: 16px;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border: 1px solid var(--divider-color, #e8e8e8);
    }

    .note-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      margin-bottom: 6px;
    }

    .note-copy {
      font-size: 13px;
      line-height: 1.5;
      color: var(--secondary-text-color, #727272);
    }

    .tools {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 0 16px 16px;
    }

    .tool {
      appearance: none;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 16px;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #03a9f4) 5%, transparent), transparent 70%),
        var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      padding: 16px;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      font: inherit;
    }

    .tool:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 35%, var(--divider-color, #e0e0e0));
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
    }

    .tool-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .tool-copy {
      font-size: 13px;
      line-height: 1.45;
      color: var(--secondary-text-color, #727272);
    }

    @media (max-width: 800px) {
      h2 {
        font-size: 21px;
      }

      .tools {
        grid-template-columns: 1fr;
      }
    }
  `;

  private _setSubView(subView: MoreSubView): void {
    this._activeSubView = subView;
    this.dispatchEvent(
      new CustomEvent("more-subview-change", {
        detail: { subView },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _emit(name: "open-settings" | "open-deleted" | "open-activity" | "open-data-center" | "open-calendar-manager"): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderTools() {
    return html`
      <div class="stack">
        <div class="note">
          <div class="note-title">Secondary tools, not primary navigation</div>
          <div class="note-copy">
            Keep the daily planner calm. Smart views, yearly planning, audit history, and maintenance tools stay grouped here instead of crowding the main shell.
          </div>
        </div>
      </div>
      <div class="tools">
        <button class="tool" @click=${() => this._emit("open-calendar-manager")}>
          <div class="tool-title">Calendar Controls</div>
          <div class="tool-copy">Manage calendars, list structure, and privacy without carrying a full sidebar into the mobile shell.</div>
        </button>
        <button class="tool" @click=${() => this._emit("open-deleted")}>
          <div class="tool-title">Recently Deleted</div>
          <div class="tool-copy">Recover tasks and events from one deliberate restore surface.</div>
        </button>
        <button class="tool" @click=${() => this._emit("open-activity")}>
          <div class="tool-title">Activity</div>
          <div class="tool-copy">Inspect planner history only when needed, instead of leaving it in the everyday navigation model.</div>
        </button>
        <button class="tool" @click=${() => this._emit("open-data-center")}>
          <div class="tool-title">Data Center</div>
          <div class="tool-copy">Imports, exports, and maintenance stay available without dominating the shell.</div>
        </button>
        <button class="tool" @click=${() => this._emit("open-settings")}>
          <div class="tool-title">Settings</div>
          <div class="tool-copy">Notification routing, privacy defaults, and planner preferences stay centralized.</div>
        </button>
      </div>
    `;
  }

  private _renderBody() {
    if (this._activeSubView === "year") {
      return html`
        <calee-year-view
          .events=${this.events}
          .calendars=${this.calendars}
          .enabledCalendarIds=${this.enabledCalendarIds}
          .selectedDate=${this.selectedDate}
        ></calee-year-view>
      `;
    }

    if (this._activeSubView === "smart") {
      return html`
        <calee-smart-views
          .events=${this.events}
          .tasks=${this.tasks}
          .lists=${this.lists}
          .conflicts=${this.conflicts}
          .calendars=${this.calendars}
          .currency=${this.currency}
          .budget=${this.budget}
          .reminderCalendars=${this.reminderCalendars}
          ?narrow=${this.narrow}
        ></calee-smart-views>
      `;
    }

    return this._renderTools();
  }

  render() {
    const tabs: Array<{ key: MoreSubView; label: string }> = [
      { key: "smart", label: "Smart Views" },
      { key: "year", label: "Year" },
      { key: "data-center", label: "Tools" },
    ];

    return html`
      <div class="header">
        <div class="eyebrow">More</div>
        <h2>Utilities and planning views.</h2>
        <div class="sub">
          Daily planning stays focused on Home, Calendar, Tasks, and Shopping. The less frequent surfaces live here.
        </div>
      </div>

      <div class="tabs">
        ${tabs.map(
          (tab) => html`
            <button
              class="tab"
              ?active=${this._activeSubView === tab.key}
              @click=${() => this._setSubView(tab.key)}
            >
              ${tab.label}
            </button>
          `,
        )}
      </div>

      <div class="content">${this._renderBody()}</div>
    `;
  }
}
