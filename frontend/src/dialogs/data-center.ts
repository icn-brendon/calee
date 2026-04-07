/**
 * <calee-data-center> -- Export, import history, and recent changes dialog.
 *
 * Tabs:
 *  1. Export -- JSON, CSV, ICS download buttons (client-side generation)
 *  2. Import history -- past imports from audit log
 *  3. Recent changes -- last 50 audit log entries
 *
 * Dispatches: dialog-close.
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  PlannerList,
  ShiftTemplate,
  Routine,
  AuditEntry,
} from "../store/types.js";

type DataTab = "export" | "imports" | "changes";

@customElement("calee-data-center")
export class CaleeDataCenter extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) hass: any;
  @property({ type: Array }) events: PlannerEvent[] = [];
  @property({ type: Array }) tasks: PlannerTask[] = [];
  @property({ type: Array }) calendars: PlannerCalendar[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Array }) templates: ShiftTemplate[] = [];
  @property({ type: Array }) routines: Routine[] = [];

  @state() private _tab: DataTab = "export";
  @state() private _auditLog: AuditEntry[] = [];
  @state() private _loadingAudit = false;

  static styles = css`
    :host { display: none; }
    :host([open]) { display: block; }

    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
      padding: 16px;
    }
    @keyframes fadeIn { from { opacity: 0; } }

    .card {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 16px;
      padding: 24px;
      width: 90%; max-width: 560px; max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    h2 {
      margin: 0 0 16px;
      font-size: 18px;
      font-weight: 600;
      display: flex; align-items: center; gap: 8px;
    }

    h2 svg { width: 20px; height: 20px; color: var(--secondary-text-color, #727272); }

    .tabs {
      display: flex;
      gap: 2px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      padding-bottom: 8px;
    }

    .tab {
      background: none; border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px; font-weight: 500;
      cursor: pointer;
      color: var(--secondary-text-color, #727272);
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }
    .tab:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
    .tab[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 600;
    }

    .export-grid {
      display: flex; flex-direction: column; gap: 10px;
    }

    .export-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
      background: var(--secondary-background-color, rgba(0,0,0,0.03));
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
      font-family: inherit;
      text-align: left;
    }
    .export-btn:hover {
      background: var(--primary-background-color, #f5f5f5);
    }

    .export-icon {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700;
      flex-shrink: 0;
    }

    .export-info { flex: 1; }
    .export-title { font-size: 14px; font-weight: 600; color: var(--primary-text-color, #212121); }
    .export-desc { font-size: 12px; color: var(--secondary-text-color, #757575); margin-top: 2px; }

    .log-entry {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
      font-size: 13px;
    }
    .log-entry:last-child { border-bottom: none; }

    .log-action {
      font-size: 11px; font-weight: 600;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .log-action.create { background: color-mix(in srgb, #4caf50 15%, transparent); color: #2e7d32; }
    .log-action.update { background: color-mix(in srgb, #2196f3 15%, transparent); color: #1565c0; }
    .log-action.delete { background: color-mix(in srgb, #f44336 15%, transparent); color: #c62828; }
    .log-action.restore { background: color-mix(in srgb, #ff9800 15%, transparent); color: #e65100; }
    .log-action.complete { background: color-mix(in srgb, #4caf50 15%, transparent); color: #2e7d32; }

    .log-detail {
      flex: 1;
      color: var(--primary-text-color, #212121);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .log-time {
      font-size: 11px;
      color: var(--secondary-text-color, #999);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .empty {
      text-align: center;
      padding: 24px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .close-btn {
      padding: 8px 20px;
      border: none; border-radius: 8px;
      background: var(--secondary-background-color, rgba(0,0,0,0.04));
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      font-size: 14px; font-weight: 500;
      font-family: inherit;
      margin-top: 16px;
      float: right;
    }
    .close-btn:hover { background: var(--divider-color, #e0e0e0); }
  `;

  willUpdate(changed: PropertyValues): void {
    if (changed.has("open") && this.open) {
      this._loadAuditLog();
    }
  }

  private async _loadAuditLog(): Promise<void> {
    if (!this.hass) return;
    this._loadingAudit = true;
    try {
      this._auditLog = (await this.hass.callWS({ type: "calee/audit_log" })) ?? [];
    } catch {
      this._auditLog = [];
    } finally {
      this._loadingAudit = false;
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._close}>
        <div class="card" @click=${(e: Event) => e.stopPropagation()}>
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            Data Center
          </h2>

          <div class="tabs">
            <button class="tab" ?active=${this._tab === "export"} @click=${() => { this._tab = "export"; }}>Export</button>
            <button class="tab" ?active=${this._tab === "imports"} @click=${() => { this._tab = "imports"; }}>Import history</button>
            <button class="tab" ?active=${this._tab === "changes"} @click=${() => { this._tab = "changes"; }}>Recent changes</button>
          </div>

          ${this._tab === "export" ? this._renderExport() : nothing}
          ${this._tab === "imports" ? this._renderImports() : nothing}
          ${this._tab === "changes" ? this._renderChanges() : nothing}

          <button class="close-btn" @click=${this._close}>Close</button>
        </div>
      </div>
    `;
  }

  // ── Export ────────────────────────────────────────────────────────

  private _renderExport() {
    return html`
      <div class="export-grid">
        <button class="export-btn" @click=${this._exportJSON}>
          <div class="export-icon" style="background:color-mix(in srgb,#2196f3 15%,transparent);color:#1565c0;">{ }</div>
          <div class="export-info">
            <div class="export-title">JSON (export all data)</div>
            <div class="export-desc">All calendars, events, tasks, templates, routines, and settings</div>
          </div>
        </button>

        <button class="export-btn" @click=${this._exportCSV}>
          <div class="export-icon" style="background:color-mix(in srgb,#4caf50 15%,transparent);color:#2e7d32;">CSV</div>
          <div class="export-info">
            <div class="export-title">CSV (events only)</div>
            <div class="export-desc">Spreadsheet-friendly format with all event fields</div>
          </div>
        </button>

        <button class="export-btn" @click=${this._exportICS}>
          <div class="export-icon" style="background:color-mix(in srgb,#9c27b0 15%,transparent);color:#6a1b9a;">ICS</div>
          <div class="export-info">
            <div class="export-title">ICS (iCalendar)</div>
            <div class="export-desc">Import into Apple Calendar, Google Calendar, Outlook</div>
          </div>
        </button>
      </div>
    `;
  }

  private async _exportJSON(): Promise<void> {
    // Fetch ALL events and tasks directly from the backend (not the
    // panel's date-range-filtered copies) to ensure a complete export.
    let allEvents: unknown[] = [];
    let allTasks: unknown[] = [];
    let presets: unknown[] = [];
    let settings: Record<string, unknown> = {};
    let auditSummary: { total: number; recent: unknown[] } = { total: 0, recent: [] };

    try {
      allEvents = (await this.hass.callWS({ type: "calee/events" })) ?? [];
    } catch {
      // Fall back to the panel's currently loaded events.
      allEvents = this.events;
    }
    try {
      allTasks = (await this.hass.callWS({ type: "calee/tasks" })) ?? [];
    } catch {
      // Fall back to the panel's currently loaded tasks.
      allTasks = this.tasks;
    }
    try {
      presets = (await this.hass.callWS({ type: "calee/presets" })) ?? [];
    } catch {
      // Presets endpoint may not exist on older backends.
    }
    try {
      settings = (await this.hass.callWS({ type: "calee/get_settings" })) ?? {};
    } catch {
      // Settings endpoint may not exist on older backends.
    }
    try {
      const log: unknown[] = (await this.hass.callWS({ type: "calee/audit_log" })) ?? [];
      auditSummary = { total: log.length, recent: log.slice(-20) };
    } catch {
      // Audit log endpoint may not exist on older backends.
    }

    const data = {
      exported_at: new Date().toISOString(),
      calendars: this.calendars,
      events: allEvents,
      tasks: allTasks,
      lists: this.lists,
      templates: this.templates,
      routines: this.routines,
      presets,
      settings,
      audit_summary: auditSummary,
    };
    this._downloadFile(
      JSON.stringify(data, null, 2),
      "application/json",
      `calee-export-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  private async _exportCSV(): Promise<void> {
    // Fetch ALL events from backend for a complete export.
    let allEvents: PlannerEvent[] = [];
    try {
      allEvents = (await this.hass.callWS({ type: "calee/events" })) ?? [];
    } catch {
      allEvents = this.events;
    }

    const headers = ["id", "calendar_id", "title", "start", "end", "all_day", "note", "source", "recurrence_rule", "created_at"];
    const rows = allEvents
      .filter((e) => !e.deleted_at)
      .map((e) =>
        headers.map((h) => {
          const val = (e as any)[h] ?? "";
          const str = String(val);
          // Escape CSV
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(","),
      );
    const csv = [headers.join(","), ...rows].join("\n");
    this._downloadFile(csv, "text/csv", `calee-events-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private async _exportICS(): Promise<void> {
    // Fetch ALL events from backend for a complete export.
    let allEvents: PlannerEvent[] = [];
    try {
      allEvents = (await this.hass.callWS({ type: "calee/events" })) ?? [];
    } catch {
      allEvents = this.events;
    }

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Calee//Planner//EN",
      "CALSCALE:GREGORIAN",
    ];

    for (const ev of allEvents.filter((e) => !e.deleted_at)) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${ev.id}@calee`);
      lines.push(`SUMMARY:${this._icsEscape(ev.title)}`);

      if (ev.all_day) {
        lines.push(`DTSTART;VALUE=DATE:${ev.start.replace(/-/g, "").slice(0, 8)}`);
        lines.push(`DTEND;VALUE=DATE:${ev.end.replace(/-/g, "").slice(0, 8)}`);
      } else {
        lines.push(`DTSTART:${this._toIcsDate(ev.start)}`);
        lines.push(`DTEND:${this._toIcsDate(ev.end)}`);
      }

      if (ev.note) {
        lines.push(`DESCRIPTION:${this._icsEscape(ev.note)}`);
      }
      if (ev.recurrence_rule) {
        lines.push(`RRULE:${ev.recurrence_rule}`);
      }
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    this._downloadFile(lines.join("\r\n"), "text/calendar", `calee-events-${new Date().toISOString().slice(0, 10)}.ics`);
  }

  private _icsEscape(str: string): string {
    return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  private _toIcsDate(iso: string): string {
    const stripped = iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    // Only append "Z" if the original timestamp is explicitly UTC.
    const isUTC = iso.endsWith("Z") || iso.includes("+00:00") || iso.includes("+0000");
    return stripped.slice(0, 15) + (isUTC ? "Z" : "");
  }

  private _downloadFile(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Import history ───────────────────────────────────────────────

  private _renderImports() {
    const imports = this._auditLog.filter(
      (entry) =>
        entry.detail &&
        (entry.detail.startsWith("Imported") ||
          entry.detail.includes("source=")),
    );

    if (imports.length === 0) {
      return html`<div class="empty">No imports found in the audit log.</div>`;
    }

    return html`
      ${imports.slice(-50).reverse().map((entry) => html`
        <div class="log-entry">
          <span class="log-action create">import</span>
          <span class="log-detail">${entry.detail || `${entry.resource_type} ${entry.resource_id}`}</span>
          <span class="log-time">${this._formatTime(entry.timestamp)}</span>
        </div>
      `)}
    `;
  }

  // ── Recent changes ───────────────────────────────────────────────

  private _renderChanges() {
    if (this._loadingAudit) {
      return html`<div class="empty">Loading...</div>`;
    }

    const recent = this._auditLog.slice(-50).reverse();

    if (recent.length === 0) {
      return html`<div class="empty">No activity recorded yet.</div>`;
    }

    return html`
      ${recent.map((entry) => html`
        <div class="log-entry">
          <span class="log-action ${entry.action}">${entry.action}</span>
          <span class="log-detail">${entry.detail || `${entry.resource_type} ${entry.resource_id}`}</span>
          <span class="log-time">${this._formatTime(entry.timestamp)}</span>
        </div>
      `)}
    `;
  }

  private _formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffH < 1) {
        const diffM = Math.floor(diffMs / (1000 * 60));
        return diffM <= 0 ? "just now" : `${diffM}m ago`;
      }
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7) return `${diffD}d ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-data-center": CaleeDataCenter;
  }
}
