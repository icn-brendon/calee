/**
 * <calee-smart-views> -- Intelligent, context-aware task/event groupings.
 *
 * Sub-views (rendered as tabs):
 *  1. Before next shift -- tasks/shopping due before the next work shift
 *  2. This weekend -- events + tasks for Saturday and Sunday
 *  3. Budget watch -- shopping spend summary with progress bar
 *  4. Overdue -- all overdue tasks across all lists
 *  5. Conflicts -- overlapping events across calendars
 *
 * Reuses data already loaded in the panel (events, tasks, etc.).
 *
 * Dispatches: task-complete, task-uncomplete, event-select.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  PlannerEvent,
  PlannerTask,
  PlannerCalendar,
  PlannerList,
  Conflict,
} from "../store/types.js";

type SmartTab = "before-shift" | "weekend" | "budget" | "overdue" | "conflicts";

@customElement("calee-smart-views")
export class CaleeSmartViews extends LitElement {
  @property({ type: Array }) events: PlannerEvent[] = [];
  @property({ type: Array }) tasks: PlannerTask[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Array }) conflicts: Conflict[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ type: String }) currency = "$";
  @property({ type: Number }) budget = 0;
  @property({ type: String }) initialTab: SmartTab = "before-shift";
  @property({ type: Array }) reminderCalendars: string[] = ["work_shifts"];
  @state() private activeTab: SmartTab = "before-shift";
  @property({ type: Boolean, reflect: true }) narrow = false;

  override firstUpdated(): void {
    if (this.initialTab) {
      this.activeTab = this.initialTab;
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .tabs {
      display: flex;
      gap: 2px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      overflow-x: auto;
      flex-shrink: 0;
    }

    .tab {
      background: none;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      color: var(--secondary-text-color, #727272);
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }

    .tab:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }

    .tab[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 600;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--primary-text-color, #212121);
    }

    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    /* Task/event items */
    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      transition: background 0.15s;
      cursor: default;
    }

    .item:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }

    .item-check {
      width: 20px;
      height: 20px;
      border: 2px solid var(--divider-color, #ccc);
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s;
      background: none;
      padding: 0;
    }

    .item-check:hover {
      border-color: var(--primary-color, #03a9f4);
    }

    .item-check.done {
      background: var(--primary-color, #03a9f4);
      border-color: var(--primary-color, #03a9f4);
    }

    .item-title {
      flex: 1;
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-title.completed {
      text-decoration: line-through;
      color: var(--secondary-text-color, #999);
    }

    .item-meta {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .item-meta.overdue {
      color: var(--error-color, #f44336);
      font-weight: 500;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Countdown */
    .countdown {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
      border-radius: 10px;
      margin-bottom: 16px;
      font-size: 14px;
      color: var(--primary-text-color, #212121);
    }

    .countdown-label {
      font-weight: 500;
    }

    .countdown-value {
      font-weight: 600;
      color: var(--primary-color, #03a9f4);
    }

    /* Budget */
    .budget-card {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .budget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .budget-total {
      font-size: 24px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

    .budget-remaining {
      font-size: 14px;
      color: var(--secondary-text-color, #757575);
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--divider-color, #e0e0e0);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .category-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
    }

    .category-row:last-child {
      border-bottom: none;
    }

    .category-name {
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      text-transform: capitalize;
    }

    .category-amount {
      color: var(--secondary-text-color, #757575);
    }

    /* Conflict */
    .conflict-pair {
      background: color-mix(in srgb, var(--warning-color, #ff9800) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--warning-color, #ff9800) 25%, transparent);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }

    .conflict-event {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 4px 0;
    }

    .conflict-vs {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--warning-color, #ff9800);
      padding: 2px 0;
    }
  `;

  render() {
    return html`
      <div class="tabs">
        ${this._renderTab("before-shift", "Before next shift")}
        ${this._renderTab("weekend", "This weekend")}
        ${this._renderTab("budget", "Budget watch")}
        ${this._renderTab("overdue", "Overdue")}
        ${this._renderTab("conflicts", `Conflicts (${this.conflicts.length})`)}
      </div>
      <div class="content">
        ${this._renderActiveTab()}
      </div>
    `;
  }

  private _renderTab(id: SmartTab, label: string) {
    return html`
      <button
        class="tab"
        ?active=${this.activeTab === id}
        @click=${() => { this.activeTab = id; }}
      >${label}</button>
    `;
  }

  private _renderActiveTab() {
    switch (this.activeTab) {
      case "before-shift":
        return this._renderBeforeShift();
      case "weekend":
        return this._renderWeekend();
      case "budget":
        return this._renderBudget();
      case "overdue":
        return this._renderOverdue();
      case "conflicts":
        return this._renderConflicts();
      default:
        return nothing;
    }
  }

  // ── Before next shift ────────────────────────────────────────────

  private _renderBeforeShift() {
    const now = Date.now();
    const shiftCalendars = this.reminderCalendars.length > 0
      ? this.reminderCalendars
      : ["work_shifts"];
    const nextShift = this.events
      .filter((e) => !e.deleted_at && !e.all_day && shiftCalendars.includes(e.calendar_id) && new Date(e.start).getTime() > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

    if (!nextShift) {
      return html`<div class="empty">No upcoming work shifts found.</div>`;
    }

    const shiftStart = new Date(nextShift.start);
    const shiftIso = shiftStart.toISOString().slice(0, 10);

    // Tasks due before or on the shift date, not completed
    const dueTasks = this.tasks.filter((t) => {
      if (t.deleted_at || t.completed) return false;
      if (!t.due) return false;
      return t.due <= shiftIso;
    }).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));

    // Countdown
    const diffMs = shiftStart.getTime() - now;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const countdownStr = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;

    return html`
      <div class="countdown">
        <span class="countdown-label">Next shift starts in</span>
        <span class="countdown-value">${countdownStr}</span>
        <span style="margin-left:auto;font-size:13px;color:var(--secondary-text-color,#757575);">
          ${nextShift.title} - ${shiftStart.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          ${shiftStart.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <h3 class="section-title">Tasks due before shift (${dueTasks.length})</h3>

      ${dueTasks.length === 0
        ? html`<div class="empty">All clear -- nothing due before your shift.</div>`
        : dueTasks.map((t) => this._renderTaskItem(t))}
    `;
  }

  // ── This weekend ─────────────────────────────────────────────────

  private _renderWeekend() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    // Next Saturday
    const daysToSat = day === 6 ? 0 : (6 - day);
    const sat = new Date(now);
    sat.setDate(sat.getDate() + daysToSat);
    sat.setHours(0, 0, 0, 0);
    const sun = new Date(sat);
    sun.setDate(sun.getDate() + 1);
    const monAfter = new Date(sun);
    monAfter.setDate(monAfter.getDate() + 1);

    const satIso = sat.toISOString().slice(0, 10);
    const sunIso = sun.toISOString().slice(0, 10);
    const monIso = monAfter.toISOString().slice(0, 10);

    const weekendEvents = this.events.filter((e) => {
      if (e.deleted_at) return false;
      const eStart = e.start.slice(0, 10);
      const eEnd = e.end.slice(0, 10);
      return (eStart >= satIso && eStart < monIso) || (eEnd > satIso && eStart < monIso);
    }).sort((a, b) => a.start.localeCompare(b.start));

    const weekendTasks = this.tasks.filter((t) => {
      if (t.deleted_at || t.completed) return false;
      return t.due === satIso || t.due === sunIso;
    });

    const weekendLabel = `${sat.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${sun.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

    return html`
      <h3 class="section-title">This weekend (${weekendLabel})</h3>

      ${weekendEvents.length > 0 ? html`
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--secondary-text-color,#757575);margin-bottom:8px;">Events</div>
          ${weekendEvents.map((ev) => {
            const cal = this.calendars.get(ev.calendar_id);
            const color = cal?.color ?? "#64b5f6";
            const start = new Date(ev.start);
            const timeStr = ev.all_day ? "All day" : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
            const dayStr = start.toLocaleDateString(undefined, { weekday: "short" });
            return html`
              <div class="item" @click=${() => this._selectEvent(ev)}>
                <span class="dot" style="background:${color}"></span>
                <span class="item-title">${ev.title}</span>
                <span class="item-meta">${dayStr} ${timeStr}</span>
              </div>
            `;
          })}
        </div>
      ` : nothing}

      ${weekendTasks.length > 0 ? html`
        <div>
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--secondary-text-color,#757575);margin-bottom:8px;">Tasks</div>
          ${weekendTasks.map((t) => this._renderTaskItem(t))}
        </div>
      ` : nothing}

      ${weekendEvents.length === 0 && weekendTasks.length === 0
        ? html`<div class="empty">Nothing scheduled for this weekend.</div>`
        : nothing}
    `;
  }

  // ── Budget watch ─────────────────────────────────────────────────

  private _renderBudget() {
    const shoppingLists = new Set(
      this.lists.filter((l) => l.list_type === "shopping").map((l) => l.id),
    );
    const shoppingTasks = this.tasks.filter(
      (t) => !t.deleted_at && shoppingLists.has(t.list_id),
    );

    // Total spent (completed items with price)
    const completedWithPrice = shoppingTasks.filter((t) => t.completed && t.price != null && t.price > 0);
    const totalSpent = completedWithPrice.reduce((sum, t) => sum + (t.price ?? 0) * t.quantity, 0);

    // By category
    const byCat = new Map<string, number>();
    for (const t of completedWithPrice) {
      const cat = t.category || "other";
      byCat.set(cat, (byCat.get(cat) ?? 0) + (t.price ?? 0) * t.quantity);
    }
    const categories = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

    // Pending (not completed with price)
    const pendingWithPrice = shoppingTasks.filter((t) => !t.completed && t.price != null && t.price > 0);
    const totalPending = pendingWithPrice.reduce((sum, t) => sum + (t.price ?? 0) * t.quantity, 0);

    const budgetAmount = this.budget || 0;
    const remaining = budgetAmount > 0 ? budgetAmount - totalSpent : 0;
    const pct = budgetAmount > 0 ? Math.min((totalSpent / budgetAmount) * 100, 100) : 0;
    const barColor = pct > 90 ? "var(--error-color, #f44336)" : pct > 70 ? "var(--warning-color, #ff9800)" : "var(--primary-color, #03a9f4)";

    return html`
      <h3 class="section-title">Budget Watch</h3>

      <div class="budget-card">
        <div class="budget-header">
          <div>
            <div class="budget-total">${this.currency}${totalSpent.toFixed(2)}</div>
            <div style="font-size:12px;color:var(--secondary-text-color,#757575);">spent</div>
          </div>
          ${budgetAmount > 0 ? html`
            <div style="text-align:right;">
              <div class="budget-remaining" style="color:${remaining >= 0 ? 'var(--primary-text-color,#212121)' : 'var(--error-color,#f44336)'};">
                ${remaining >= 0 ? `${this.currency}${remaining.toFixed(2)} remaining` : `${this.currency}${Math.abs(remaining).toFixed(2)} over budget`}
              </div>
              <div style="font-size:12px;color:var(--secondary-text-color,#757575);">of ${this.currency}${budgetAmount.toFixed(2)} budget</div>
            </div>
          ` : nothing}
        </div>

        ${budgetAmount > 0 ? html`
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${barColor};"></div>
          </div>
        ` : nothing}
      </div>

      ${totalPending > 0 ? html`
        <div style="font-size:13px;color:var(--secondary-text-color,#757575);margin-bottom:16px;">
          Pending items total: ${this.currency}${totalPending.toFixed(2)}
        </div>
      ` : nothing}

      ${categories.length > 0 ? html`
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--secondary-text-color,#757575);margin-bottom:8px;">By Category</div>
          ${categories.map(([cat, amount]) => html`
            <div class="category-row">
              <span class="category-name">${cat}</span>
              <span class="category-amount">${this.currency}${amount.toFixed(2)}</span>
            </div>
          `)}
        </div>
      ` : html`<div class="empty">No shopping items with prices yet.</div>`}
    `;
  }

  // ── Overdue ──────────────────────────────────────────────────────

  private _renderOverdue() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const overdue = this.tasks
      .filter((t) => !t.deleted_at && !t.completed && t.due && t.due < todayIso)
      .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));

    return html`
      <h3 class="section-title">Overdue Tasks (${overdue.length})</h3>

      ${overdue.length === 0
        ? html`<div class="empty">No overdue tasks -- you're all caught up.</div>`
        : overdue.map((t) => {
            const dueDate = new Date(t.due + "T00:00:00");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return html`
              <div class="item">
                <button
                  class="item-check"
                  @click=${() => this._completeTask(t.id)}
                  title="Complete task"
                ></button>
                <span class="item-title">${t.title}</span>
                <span class="item-meta overdue">
                  ${diffDays === 1 ? "1 day overdue" : `${diffDays} days overdue`}
                </span>
              </div>
            `;
          })}
    `;
  }

  // ── Conflicts ────────────────────────────────────────────────────

  private _renderConflicts() {
    return html`
      <h3 class="section-title">Scheduling Conflicts (${this.conflicts.length})</h3>

      ${this.conflicts.length === 0
        ? html`<div class="empty">No conflicts detected.</div>`
        : this.conflicts.map((c) => {
            const calA = this.calendars.get(c.eventA.calendar_id);
            const calB = this.calendars.get(c.eventB.calendar_id);
            const startA = new Date(c.eventA.start);
            const endA = new Date(c.eventA.end);
            const startB = new Date(c.eventB.start);
            const endB = new Date(c.eventB.end);
            const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

            return html`
              <div class="conflict-pair">
                <div class="conflict-event" @click=${() => this._selectEvent(c.eventA)} style="cursor:pointer;">
                  <span class="dot" style="background:${calA?.color ?? '#64b5f6'}"></span>
                  <span style="font-weight:500;">${c.eventA.title}</span>
                  <span style="margin-left:auto;font-size:12px;color:var(--secondary-text-color,#757575);">${fmt(startA)} - ${fmt(endA)}</span>
                </div>
                <div class="conflict-vs">overlaps with</div>
                <div class="conflict-event" @click=${() => this._selectEvent(c.eventB)} style="cursor:pointer;">
                  <span class="dot" style="background:${calB?.color ?? '#64b5f6'}"></span>
                  <span style="font-weight:500;">${c.eventB.title}</span>
                  <span style="margin-left:auto;font-size:12px;color:var(--secondary-text-color,#757575);">${fmt(startB)} - ${fmt(endB)}</span>
                </div>
              </div>
            `;
          })}
    `;
  }

  // ── Shared item renderer ─────────────────────────────────────────

  private _renderTaskItem(t: PlannerTask) {
    const list = this.lists.find((l) => l.id === t.list_id);
    return html`
      <div class="item">
        <button
          class="item-check ${t.completed ? 'done' : ''}"
          @click=${() => t.completed ? this._uncompleteTask(t.id) : this._completeTask(t.id)}
          title="${t.completed ? 'Uncomplete' : 'Complete'}"
        >
          ${t.completed ? html`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : nothing}
        </button>
        <span class="item-title ${t.completed ? 'completed' : ''}">${t.title}</span>
        <span class="item-meta">${list?.name ?? ""} ${t.due ? `| ${t.due}` : ""}</span>
      </div>
    `;
  }

  // ── Actions ──────────────────────────────────────────────────────

  private _completeTask(taskId: string) {
    this.dispatchEvent(
      new CustomEvent("task-complete", {
        detail: { taskId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _uncompleteTask(taskId: string) {
    this.dispatchEvent(
      new CustomEvent("task-uncomplete", {
        detail: { taskId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _selectEvent(event: PlannerEvent) {
    this.dispatchEvent(
      new CustomEvent("event-select", {
        detail: { event },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-smart-views": CaleeSmartViews;
  }
}
