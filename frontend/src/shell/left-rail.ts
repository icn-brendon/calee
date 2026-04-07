/**
 * <calee-left-rail> -- Desktop thin-rail navigation.
 *
 * Thin 56px rail with icons that expands on hover to show labels.
 * Sections: main nav, calendar toggles, routines, and "More".
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ViewType, MoreSubView } from "../store/types.js";
import type { PlannerCalendar, PlannerEvent, Routine, Conflict } from "../store/types.js";

interface CalendarToggle {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

@customElement("calee-left-rail")
export class CaleeLeftRail extends LitElement {
  @property() activeView: ViewType = "home";
  @property({ type: Array }) calendars: CalendarToggle[] = [];
  @property({ type: Array }) rawCalendars: PlannerCalendar[] = [];
  @property({ type: Array }) routines: Routine[] = [];
  @property({ type: Array }) conflicts: Conflict[] = [];

  @state() private _expanded = false;
  @state() private _calendarsOpen = true;
  @state() private _routinesOpen = false;
  @state() private _moreOpen = false;

  private _navigate(view: ViewType): void {
    this.dispatchEvent(
      new CustomEvent("nav-change", {
        detail: { view },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _openMore(sub: MoreSubView): void {
    this.dispatchEvent(
      new CustomEvent("open-more", {
        detail: { sub },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _toggleCalendar(id: string): void {
    this.dispatchEvent(
      new CustomEvent("toggle-calendar", {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _executeRoutine(id: string): void {
    this.dispatchEvent(
      new CustomEvent("routine-execute", {
        detail: { routineId: id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _openRoutineManager(): void {
    this.dispatchEvent(
      new CustomEvent("open-routine-manager", { bubbles: true, composed: true }),
    );
  }

  private _openCalendarManager(): void {
    this.dispatchEvent(
      new CustomEvent("open-calendar-manager", { bubbles: true, composed: true }),
    );
  }

  private _openSettings(): void {
    this.dispatchEvent(
      new CustomEvent("open-settings", { bubbles: true, composed: true }),
    );
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 56px;
      min-width: 56px;
      background: var(--sidebar-background-color, var(--card-background-color, #fff));
      border-right: 1px solid var(--divider-color, #e0e0e0);
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 3;
      transition: width 0.2s ease, min-width 0.2s ease;
      padding: 8px 0;
    }

    :host([expanded]) {
      width: 220px;
      min-width: 220px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      transition: background 0.15s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
    }

    :host(:not([expanded])) .nav-item {
      justify-content: center;
      padding: 8px 0;
    }

    :host(:not([expanded])) .nav-label,
    :host(:not([expanded])) .section-heading,
    :host(:not([expanded])) .cal-toggle-name,
    :host(:not([expanded])) .manage-link {
      display: none;
    }

    .nav-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .nav-item[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }

    .nav-item svg,
    .nav-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item[active] svg,
    .nav-item[active] .nav-icon {
      color: var(--primary-color, #03a9f4);
    }

    .nav-item-muted {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }

    .nav-item-muted svg {
      width: 18px;
      height: 18px;
    }

    .section {
      padding: 0 8px;
      margin-bottom: 4px;
    }

    .section-heading {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #727272);
      padding: 14px 8px 4px;
      margin: 0;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-heading .manage-link {
      font-size: 10px;
      font-weight: 500;
      color: var(--primary-color, #03a9f4);
      text-transform: none;
      letter-spacing: 0;
    }

    .calendar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 8px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
      font-size: 13px;
    }

    :host(:not([expanded])) .calendar-item {
      justify-content: center;
      padding: 5px 0;
    }

    .calendar-item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .calendar-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }

    .calendar-dot.hidden { opacity: 0.25; }

    .cal-toggle-name {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .divider {
      height: 1px;
      margin: 8px 12px;
      background: var(--divider-color, #e0e0e0);
    }

    :host(:not([expanded])) .divider {
      margin: 8px 6px;
    }
  `;

  render() {
    return html`
      <!-- Main navigation -->
      <div class="section">
        <button class="nav-item" ?active=${this.activeView === "home"}
          @click=${() => this._navigate("home")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span class="nav-label">Home</span>
        </button>

        <button class="nav-item" ?active=${this.activeView === "calendar"}
          @click=${() => this._navigate("calendar")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span class="nav-label">Calendar</span>
        </button>

        <button class="nav-item" ?active=${this.activeView === "tasks"}
          @click=${() => this._navigate("tasks")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
          <span class="nav-label">Tasks</span>
        </button>

        <button class="nav-item" ?active=${this.activeView === "shopping"}
          @click=${() => this._navigate("shopping")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"></path>
          </svg>
          <span class="nav-label">Shopping</span>
        </button>
      </div>

      <div class="divider"></div>

      <!-- Calendar toggles -->
      <div class="section">
        <div class="section-heading" @click=${() => { this._calendarsOpen = !this._calendarsOpen; }}>
          Calendars
          <span class="manage-link" @click=${(e: Event) => { e.stopPropagation(); this._openCalendarManager(); }}>Manage</span>
        </div>
        ${this._calendarsOpen ? this.calendars.map(
          (cal) => html`
            <div class="calendar-item" @click=${() => this._toggleCalendar(cal.id)}>
              <span class="calendar-dot ${cal.visible ? "" : "hidden"}" style="background: ${cal.color}"></span>
              <span class="cal-toggle-name">${cal.name}</span>
            </div>
          `,
        ) : nothing}
      </div>

      <!-- Routines -->
      <div class="section">
        <div class="section-heading" @click=${() => { this._routinesOpen = !this._routinesOpen; }}>
          Routines
          <span class="manage-link" @click=${(e: Event) => { e.stopPropagation(); this._openRoutineManager(); }}>Manage</span>
        </div>
        ${this._routinesOpen ? this.routines.map(
          (r) => html`
            <button class="nav-item nav-item-muted" @click=${() => this._executeRoutine(r.id)} title="${r.description || `Run ${r.name}`}">
              <span style="font-size:16px;width:20px;text-align:center;flex-shrink:0;">${r.emoji || "\u26A1"}</span>
              <span class="nav-label">${r.name}</span>
            </button>
          `,
        ) : nothing}
      </div>

      <div class="divider"></div>

      <!-- More section -->
      <div class="section">
        <div class="section-heading" @click=${() => { this._moreOpen = !this._moreOpen; }}>
          More
        </div>
        ${this._moreOpen ? html`
          <button class="nav-item nav-item-muted" @click=${() => this._openMore("year")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="3" y1="16" x2="21" y2="16"></line>
              <line x1="9" y1="4" x2="9" y2="22"></line>
              <line x1="15" y1="4" x2="15" y2="22"></line>
            </svg>
            <span class="nav-label">Year</span>
          </button>
          <button class="nav-item nav-item-muted" @click=${() => this._openMore("smart")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="nav-label">Smart Views</span>
          </button>
          <button class="nav-item nav-item-muted" @click=${() => this._openMore("data-center")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span class="nav-label">Data Center</span>
          </button>
          <button class="nav-item nav-item-muted" @click=${() => this._openMore("activity")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span class="nav-label">Activity</span>
          </button>
          <button class="nav-item nav-item-muted" @click=${() => this._openMore("deleted")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            <span class="nav-label">Recently Deleted</span>
          </button>
          ${this.conflicts.length > 0 ? html`
            <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning-color,#ff9800)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0;">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span class="nav-label" style="font-size:12px;color:var(--warning-color,#ff9800);font-weight:500;">${this.conflicts.length} conflict${this.conflicts.length === 1 ? "" : "s"}</span>
            </div>
          ` : nothing}
        ` : nothing}

        <button class="nav-item nav-item-muted" @click=${this._openSettings}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
          </svg>
          <span class="nav-label">Settings</span>
        </button>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("mouseenter", this._onMouseEnter);
    this.addEventListener("mouseleave", this._onMouseLeave);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("mouseenter", this._onMouseEnter);
    this.removeEventListener("mouseleave", this._onMouseLeave);
  }

  private _onMouseEnter = (): void => {
    this._expanded = true;
    this.setAttribute("expanded", "");
  };

  private _onMouseLeave = (): void => {
    this._expanded = false;
    this.removeAttribute("expanded");
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-left-rail": CaleeLeftRail;
  }
}
