/**
 * <calee-bottom-nav> -- Mobile bottom navigation bar.
 *
 * Five items: Home | Calendar | + Add | Tasks | Shopping.
 * The center "Add" button opens the template picker via a custom event.
 * Dispatches `nav-change` with `{ view }` on tab selection.
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ViewType } from "../store/types.js";

@customElement("calee-bottom-nav")
export class CaleeBottomNav extends LitElement {
  @property() activeView: ViewType = "home";

  private _navigate(view: ViewType): void {
    this.dispatchEvent(
      new CustomEvent("nav-change", {
        detail: { view },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onAdd(): void {
    this.dispatchEvent(
      new CustomEvent("open-template-picker", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 52px;
      min-height: 52px;
      background: var(--card-background-color, #fff);
      border-top: 1px solid var(--divider-color, #e0e0e0);
      z-index: 4;
      padding: 0 4px;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px 8px;
      min-width: 44px;
      min-height: 44px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      font-size: 10px;
      font-weight: 500;
      font-family: inherit;
      transition: color 0.15s;
      border-radius: 8px;
    }

    button[active] {
      color: var(--primary-color, #03a9f4);
    }

    button svg {
      width: 22px;
      height: 22px;
    }

    .add-btn {
      color: var(--primary-color, #03a9f4);
    }
    .add-btn svg {
      width: 28px;
      height: 28px;
    }
  `;

  render() {
    return html`
      <button ?active=${this.activeView === "home"} @click=${() => this._navigate("home")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        Home
      </button>

      <button ?active=${this.activeView === "calendar"} @click=${() => this._navigate("calendar")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Calendar
      </button>

      <button class="add-btn" @click=${this._onAdd}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add
      </button>

      <button ?active=${this.activeView === "tasks"} @click=${() => this._navigate("tasks")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        </svg>
        Tasks
      </button>

      <button ?active=${this.activeView === "shopping"} @click=${() => this._navigate("shopping")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"></path>
        </svg>
        Shop
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-bottom-nav": CaleeBottomNav;
  }
}
