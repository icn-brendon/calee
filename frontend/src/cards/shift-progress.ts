/**
 * <calee-shift-progress> — Shows the currently-active shift with a progress
 * bar indicating elapsed / remaining time.
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerEvent } from "../store/types.js";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-shift-progress")
export class CaleeShiftProgress extends LitElement {
  @property({ type: Object }) currentShift: PlannerEvent | null = null;

  @state() private _pct = 0;
  @state() private _elapsed = "";
  @state() private _remaining = "";

  private _timer: ReturnType<typeof setInterval> | null = null;

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.1));
    }

    .empty {
      text-align: center;
      padding: 24px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
    }

    .time-range {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
    }

    /* ── Progress bar ────────────────────────────────────────────── */

    .bar-bg {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: var(--divider-color, #e0e0e0);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.5s ease;
    }

    /* ── Stats ───────────────────────────────────────────────────── */

    .stats {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
    }

    .pct {
      font-weight: 600;
      color: var(--primary-color, #03a9f4);
    }
  `;

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  connectedCallback(): void {
    super.connectedCallback();
    this._tick();
    this._timer = setInterval(() => this._tick(), 15_000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer) clearInterval(this._timer);
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("currentShift")) {
      this._tick();
    }
  }

  private _tick(): void {
    const shift = this.currentShift;
    if (!shift) {
      this._pct = 0;
      this._elapsed = "";
      this._remaining = "";
      return;
    }

    const now = Date.now();
    const start = new Date(shift.start).getTime();
    const end = new Date(shift.end).getTime();
    const total = end - start;
    if (total <= 0) {
      this._pct = 100;
      this._elapsed = formatDuration(0);
      this._remaining = formatDuration(0);
      return;
    }

    const elapsed = Math.max(0, Math.min(now - start, total));
    this._pct = Math.round((elapsed / total) * 100);
    this._elapsed = formatDuration(elapsed);
    this._remaining = formatDuration(Math.max(0, total - elapsed));
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  render() {
    if (!this.currentShift) {
      return html`<div class="empty">No active shift</div>`;
    }

    const shift = this.currentShift;

    return html`
      <div class="header">
        <span class="title">${shift.title}</span>
        <span class="time-range">
          ${formatTime(shift.start)} &ndash; ${formatTime(shift.end)}
        </span>
      </div>

      <div class="bar-bg">
        <div class="bar-fill" style="width:${this._pct}%"></div>
      </div>

      <div class="stats">
        <span>${this._elapsed} elapsed</span>
        <span class="pct">${this._pct}%</span>
        <span>${this._remaining} remaining</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-shift-progress": CaleeShiftProgress;
  }
}
