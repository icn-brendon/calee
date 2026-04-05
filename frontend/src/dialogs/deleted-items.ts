/**
 * Calee -- Recently Deleted Items Dialog
 *
 * Shows soft-deleted events and tasks with the ability to restore them.
 * Fetches data via the calee/deleted_items WebSocket command.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { DeletedItem } from "../store/types.js";

// ── Relative time formatting ──────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return "";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  // Fall back to short date
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────

@customElement("calee-deleted-items")
export class CaleeDeletedItems extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) calendars: Array<{ id: string; name: string }> = [];
  @property({ attribute: false }) lists: Array<{ id: string; name: string }> = [];

  @state() private _items: DeletedItem[] = [];
  @state() private _loading = false;
  @state() private _restoringId: string | null = null;
  @state() private _toastMessage = "";

  // ── Lifecycle ────────────────────────────────────────────────────────

  updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has("open") && this.open) {
      this._loadItems();
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────

  private async _loadItems(): Promise<void> {
    if (!this.hass) return;
    this._loading = true;
    try {
      const result = await this.hass.callWS({ type: "calee/deleted_items" });
      this._items = (result as DeletedItem[]) ?? [];
    } catch {
      this._items = [];
    } finally {
      this._loading = false;
    }
  }

  private async _restore(item: DeletedItem): Promise<void> {
    if (!this.hass || this._restoringId) return;
    this._restoringId = item.id;

    const wsType =
      item.item_type === "task" ? "calee/restore_task" : "calee/restore_event";
    const idKey = item.item_type === "task" ? "task_id" : "event_id";

    try {
      await this.hass.callWS({ type: wsType, [idKey]: item.id });
      // Remove from the list
      this._items = this._items.filter((i) => i.id !== item.id);
      this._showToast("Restored");
    } catch (err) {
      console.error("Failed to restore item:", err);
      this._showToast("Restore failed");
    } finally {
      this._restoringId = null;
    }
  }

  private _showToast(msg: string): void {
    this._toastMessage = msg;
    setTimeout(() => {
      this._toastMessage = "";
    }, 2000);
  }

  private _close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent("dialog-close"));
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private _getContainerName(item: DeletedItem): string {
    if (item.item_type === "task" && item.list_id) {
      const list = this.lists.find((l) => l.id === item.list_id);
      return list?.name ?? "";
    }
    if (item.item_type === "event" && item.calendar_id) {
      const cal = this.calendars.find((c) => c.id === item.calendar_id);
      return cal?.name ?? "";
    }
    return "";
  }

  // ── Render ───────────────────────────────────────────────────────────

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
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 101;
    }

    .card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      width: 90%;
      max-width: 440px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .card-header {
      padding: 20px 24px 12px;
      font-size: 18px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .card-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px;
      min-height: 0;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }

    .item:last-child {
      border-bottom: none;
    }

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-meta {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }

    .item-meta span + span::before {
      content: " \00b7 ";
    }

    .restore-btn {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .restore-btn:hover {
      opacity: 0.9;
    }

    .restore-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .card-footer {
      padding: 12px 24px 8px;
      flex-shrink: 0;
    }

    .footer-note {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      text-align: center;
      padding: 8px 0 4px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }

    .card-actions {
      display: flex;
      justify-content: center;
      padding: 8px 24px 20px;
      flex-shrink: 0;
    }

    .close-btn {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
      border: none;
      border-radius: 8px;
      padding: 8px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .close-btn:hover {
      background: var(--divider-color, #e0e0e0);
    }

    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
    }

    .loading {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 14px;
    }

    .toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-text-color, #212121);
      color: var(--card-background-color, #fff);
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 200;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: toast-in 0.2s ease;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Mobile: bottom sheet style */
    @media (max-width: 600px) {
      .backdrop {
        align-items: flex-end;
      }

      .card {
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        max-height: 85vh;
      }
    }
  `;

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._close}>
        <div class="card" @click=${(e: Event) => e.stopPropagation()}>
          <div class="card-header">Recently Deleted</div>
          <div class="card-body">
            ${this._loading
              ? html`<div class="loading">Loading...</div>`
              : this._items.length === 0
                ? html`<div class="empty">No recently deleted items.</div>`
                : this._items.map(
                    (item) => html`
                      <div class="item">
                        <div class="item-info">
                          <div class="item-title">${item.title}</div>
                          <div class="item-meta">
                            <span>${item.item_type === "task" ? "task" : "shift"}</span>
                            <span>deleted ${relativeTime(item.deleted_at)}</span>
                            ${this._getContainerName(item)
                              ? html`<span>${this._getContainerName(item)}</span>`
                              : nothing}
                          </div>
                        </div>
                        <button
                          class="restore-btn"
                          ?disabled=${this._restoringId === item.id}
                          @click=${() => this._restore(item)}
                        >
                          ${this._restoringId === item.id ? "..." : "Restore"}
                        </button>
                      </div>
                    `
                  )}
          </div>
          <div class="card-footer">
            <div class="footer-note">
              Items are permanently removed after 30 days.
            </div>
          </div>
          <div class="card-actions">
            <button class="close-btn" @click=${this._close}>Close</button>
          </div>
        </div>
      </div>
      ${this._toastMessage
        ? html`<div class="toast">${this._toastMessage}</div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-deleted-items": CaleeDeletedItems;
  }
}
