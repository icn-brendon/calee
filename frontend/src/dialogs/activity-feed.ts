/**
 * Calee -- Activity Feed Dialog
 *
 * Shows recent audit log entries (read-only) fetched via the
 * calee/audit_log WebSocket command.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { AuditEntry } from "../store/types.js";

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

  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Action display helpers ────────────────────────────────────────────

interface ActionInfo {
  icon: string;
  label: string;
  color: string;
}

function getActionInfo(action: string): ActionInfo {
  switch (action) {
    case "create":
      return { icon: "+", label: "Created", color: "var(--success-color, #4caf50)" };
    case "update":
      return { icon: "\u270E", label: "Updated", color: "var(--info-color, #2196f3)" };
    case "delete":
      return { icon: "\u2715", label: "Deleted", color: "var(--error-color, #f44336)" };
    case "restore":
      return { icon: "\u21BA", label: "Restored", color: "var(--warning-color, #ff9800)" };
    case "complete":
      return { icon: "\u2713", label: "Completed", color: "var(--success-color, #4caf50)" };
    case "uncomplete":
      return { icon: "\u25CB", label: "Reopened", color: "var(--secondary-text-color, #727272)" };
    case "snooze":
      return { icon: "\u23F0", label: "Snoozed", color: "var(--secondary-text-color, #727272)" };
    default:
      return { icon: "\u2022", label: action, color: "var(--secondary-text-color, #727272)" };
  }
}

// ── Component ──────────────────────────────────────────────────────────

@customElement("calee-activity-feed")
export class CaleeActivityFeed extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _entries: AuditEntry[] = [];
  @state() private _loading = false;

  // ── Lifecycle ────────────────────────────────────────────────────────

  updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has("open") && this.open) {
      this._loadEntries();
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────

  private async _loadEntries(): Promise<void> {
    if (!this.hass) return;
    this._loading = true;
    try {
      const result = await this.hass.callWS({
        type: "calee/audit_log",
        limit: 50,
      });
      // API returns oldest-first; reverse to show newest first
      const entries = (result as AuditEntry[]) ?? [];
      this._entries = [...entries].reverse();
    } catch {
      this._entries = [];
    } finally {
      this._loading = false;
    }
  }

  private _close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent("dialog-close"));
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private _buildDescription(entry: AuditEntry): string {
    const info = getActionInfo(entry.action);
    if (entry.detail) {
      return `${info.label} "${entry.detail}"`;
    }
    const type = entry.resource_type || "item";
    return `${info.label} ${type}`;
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

    .entry {
      display: flex;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      align-items: flex-start;
    }

    .entry:last-child {
      border-bottom: none;
    }

    .entry-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      margin-top: 1px;
    }

    .entry-content {
      flex: 1;
      min-width: 0;
    }

    .entry-desc {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entry-time {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }

    .card-actions {
      display: flex;
      justify-content: center;
      padding: 16px 24px 20px;
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
          <div class="card-header">Activity</div>
          <div class="card-body">
            ${this._loading
              ? html`<div class="loading">Loading...</div>`
              : this._entries.length === 0
                ? html`<div class="empty">No activity yet.</div>`
                : this._entries.map((entry) => {
                    const info = getActionInfo(entry.action);
                    return html`
                      <div class="entry">
                        <div
                          class="entry-icon"
                          style="color: ${info.color}"
                        >
                          ${info.icon}
                        </div>
                        <div class="entry-content">
                          <div class="entry-desc">
                            ${this._buildDescription(entry)}
                          </div>
                          <div class="entry-time">
                            ${relativeTime(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    `;
                  })}
          </div>
          <div class="card-actions">
            <button class="close-btn" @click=${this._close}>Close</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-activity-feed": CaleeActivityFeed;
  }
}
