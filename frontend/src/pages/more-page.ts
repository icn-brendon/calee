import { LitElement, css, html, nothing } from "lit";
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

  override updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has("initialSubView") && this.initialSubView !== this._activeSubView) {
      this._activeSubView = this.initialSubView;
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: var(--card-background-color, #fff);
    }

    .chrome {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }

    .header {
      padding: 16px 16px 12px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent), transparent 72%),
        var(--card-background-color, #fff);
      flex-shrink: 0;
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 6px;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.1;
      color: var(--primary-text-color, #212121);
      margin: 0;
    }

    .sub {
      margin-top: 6px;
      font-size: 14px;
      color: var(--secondary-text-color, #727272);
      max-width: 60ch;
    }

    .tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 12px 16px 0;
      flex-shrink: 0;
    }

    .tab {
      appearance: none;
      border: none;
      border-radius: 999px;
      padding: 9px 14px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .tab:hover {
      transform: translateY(-1px);
      color: var(--primary-text-color, #212121);
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

    .tools {
      padding: 16px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .tool-card {
      appearance: none;
      border: 1px solid var(--divider-color, #e0e0e0);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #03a9f4) 5%, transparent), transparent 70%),
        var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      font: inherit;
    }

    .tool-card:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 30%, var(--divider-color, #e0e0e0));
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

    .stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .info-card {
      border-radius: 16px;
      padding: 16px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border: 1px solid var(--divider-color, #e8e8e8);
    }

    .info-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      margin-bottom: 6px;
    }

    .info-copy {
      font-size: 13px;
      line-height: 1.5;
      color: var(--secondary-text-color, #727272);
    }

    @media (max-width: 800px) {
      .title {
        font-size: 21px;
      }

      .tools {
        grid-template-columns: 1fr;
      }
    }
  `;

  private _setSubView(view: MoreSubView): void {
    this._activeSubView = view;
    this.dispatchEvent(
      new CustomEvent("more-subview-change", {
        detail: { subView: view },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _open(action: "deleted" | "activity" | "data-center" | "calendar-manager" | "settings"): void {
    this.dispatchEvent(
      new CustomEvent(action, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderTools() {
    return html`
      <div class="stack">
        <div class="info-card">
          <div class="info-title">Utilities</div>
          <div class="info-copy">
            Move the less-frequent workflows out of your primary navigation while keeping them one tap away.
          </div>
        </div>
      </div>
      <div class="tools">
        <button class="tool-card" @click=${() => this._open("calendar-manager")}>
          <div class="tool-title">Calendar Controls</div>
          <div class="tool-copy">Manage shared calendars, privacy, and list structure without keeping a heavy sidebar open.</div>
        </button>
        <button class="tool-card" @click=${() => this._open("deleted")}>
          <div class="tool-title">Recently Deleted</div>
          <div class="tool-copy">Restore soft-deleted events and tasks from one recovery surface.</div>
        </button>
        <button class="tool-card" @click=${() => this._open("activity")}>
          <div class="tool-title">Activity</div>
          <div class="tool-copy">Review the audit stream only when you need it, instead of leaving it in core navigation.</div>
        </button>
        <button class="tool-card" @click=${() => this._open("data-center")}>
          <div class="tool-title">Data Center</div>
          <div class="tool-copy">Imports, exports, and maintenance tools stay accessible but clearly secondary.</div>
        </button>
        <button class="tool-card" @click=${() => this._open("settings")}>
          <div class="tool-title">Settings</div>
          <div class="tool-copy">Notification routing, privacy, and planner defaults stay in one consistent place.</div>
        </button>
      </div>
    `;
  }

  private _renderActiveView() {
    switch (this._activeSubView) {
      case "year":
        return html`
          <calee-year-view
            .events=${this.events}
            .calendars=${this.calendars}
            .enabledCalendarIds=${this.enabledCalendarIds}
            .selectedDate=${this.selectedDate}
          ></calee-year-view>
        `;
      case "smart":
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
      case "data-center":
      case "activity":
      case "deleted":
        return html`
          <div class="stack">
            <div class="info-card">
              <div class="info-title">Open Utility</div>
              <div class="info-copy">
                This section stays lightweight inside the page shell. Use the buttons below to open the existing dialog-based tools.
              </div>
            </div>
            ${this._renderTools()}
          </div>
        `;
      default:
        return this._renderTools();
    }
  }

  render() {
    const tabs: Array<{ key: MoreSubView; label: string }> = [
      { key: "smart", label: "Smart Views" },
      { key: "year", label: "Year" },
      { key: "data-center", label: "Tools" },
    ];

    return html`
      <div class="chrome">
        <div class="header">
          <div class="eyebrow">More</div>
          <h2 class="title">Secondary tools, not primary navigation.</h2>
          <div class="sub">
            Keep the daily planner calm. Reach for smart views, yearly planning, and maintenance tools only when you need them.
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

        <div class="content">
          ${this._renderActiveView() ?? nothing}
        </div>
      </div>
    `;
  }
}
