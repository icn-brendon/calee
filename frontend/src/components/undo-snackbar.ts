/**
 * <calee-undo-snackbar> — Bottom snackbar for undo actions.
 *
 * Shows a message with an Undo button and auto-hides after a timeout.
 * The parent dispatches an "undo" event when the user taps Undo,
 * which the shell handles to restore the item.
 *
 * Created in Sprint 8.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("calee-undo-snackbar")
export class CaleeUndoSnackbar extends LitElement {
  @property({ type: String }) message = "";
  @property({ type: Boolean, reflect: true }) open = false;

  /** Auto-hide timeout handle. */
  private _timer: ReturnType<typeof setTimeout> | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 72px; /* above bottom nav on mobile */
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      z-index: 400;
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s ease;
      pointer-events: none;
    }

    :host([open]) {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .snackbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--primary-text-color, #333);
      color: var(--text-primary-color, #fff);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      font-size: 14px;
      min-width: 240px;
      max-width: calc(100vw - 32px);
    }

    .msg {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .undo-btn {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-color, #03a9f4);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .undo-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  `;

  /* ── Show / hide ───────────────────────────────────────────────────── */

  /** Show the snackbar with a message. Auto-hides after `duration` ms. */
  show(message: string, duration = 5000): void {
    this.message = message;
    this.open = true;
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    this.open = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer) clearTimeout(this._timer);
  }

  /* ── Undo action ───────────────────────────────────────────────────── */

  private _onUndo(): void {
    this.dispatchEvent(new CustomEvent("undo", { bubbles: true, composed: true }));
    this.hide();
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  render() {
    if (!this.message) return nothing;
    return html`
      <div class="snackbar">
        <span class="msg">${this.message}</span>
        <button class="undo-btn" @click=${this._onUndo}>Undo</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-undo-snackbar": CaleeUndoSnackbar;
  }
}
