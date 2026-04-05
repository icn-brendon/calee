/**
 * <calee-next-shift> — Countdown card showing time until the next upcoming
 * shift starts.
 */

import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerEvent } from "../store/types.js";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatStartTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return `in ${parts.join(" ")}`;
}

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-next-shift")
export class CaleeNextShift extends LitElement {
  @property({ type: Object }) nextShift: PlannerEvent | null = null;

  @state() private _countdown = "";
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

    .label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 8px;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .start-time {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0 0 12px;
    }

    .countdown {
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-color, #03a9f4);
      letter-spacing: -0.5px;
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
    if (changed.has("nextShift")) {
      this._tick();
    }
  }

  private _tick(): void {
    if (!this.nextShift) {
      this._countdown = "";
      return;
    }
    const ms = new Date(this.nextShift.start).getTime() - Date.now();
    this._countdown = formatCountdown(ms);
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  render() {
    if (!this.nextShift) {
      return html`<div class="empty">No upcoming shifts</div>`;
    }

    const shift = this.nextShift;

    return html`
      <div class="label">Next Shift</div>
      <div class="title">${shift.title}</div>
      <div class="start-time">${formatStartTime(shift.start)}</div>
      <div class="countdown">${this._countdown}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-next-shift": CaleeNextShift;
  }
}
