import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import type {
  PlannerCalendar,
  PlannerEvent,
  PlannerList,
  PlannerTask,
  Routine,
} from "../store/types.js";

interface TimelineItem {
  key: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  color: string;
}

interface DueTaskGroup {
  title: string;
  count: number;
  tasks: PlannerTask[];
}

@customElement("calee-home-page")
export class CaleeHomePage extends LitElement {
  @property({ type: Array }) events: PlannerEvent[] = [];
  @property({ type: Array }) tasks: PlannerTask[] = [];
  @property({ type: Array }) calendars: PlannerCalendar[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Array }) routines: Routine[] = [];
  @property({ type: String }) currency = "$";
  @property({ type: Number }) budget = 0;
  @property({ type: Boolean, reflect: true }) narrow = false;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      overflow: auto;
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--primary-color, #03a9f4) 14%, transparent), transparent 34%),
        radial-gradient(circle at top right, color-mix(in srgb, var(--warning-color, #ffb74d) 12%, transparent), transparent 28%),
        linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #03a9f4) 4%, transparent), transparent 160px),
        var(--primary-background-color, #fafafa);
    }

    .shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      box-sizing: border-box;
    }

    .hero {
      border-radius: 24px;
      padding: 20px;
      color: var(--primary-text-color, #212121);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent), transparent 60%),
        var(--card-background-color, #fff);
      border: 1px solid color-mix(in srgb, var(--primary-color, #03a9f4) 16%, var(--divider-color, #e0e0e0));
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.06);
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 6px;
    }

    .hero h1 {
      margin: 0;
      font-size: clamp(24px, 3vw, 34px);
      line-height: 1.05;
      letter-spacing: -0.03em;
    }

    .hero-copy {
      margin-top: 8px;
      max-width: 70ch;
      font-size: 14px;
      line-height: 1.55;
      color: var(--secondary-text-color, #727272);
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .card {
      padding: 14px 16px;
      border-radius: 18px;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04);
    }

    .card-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 8px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.1;
      color: var(--primary-text-color, #212121);
    }

    .card-sub {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.45;
      color: var(--secondary-text-color, #727272);
    }

    .content {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 16px;
      min-height: 0;
    }

    .panel {
      min-width: 0;
      border-radius: 22px;
      padding: 16px;
      background: color-mix(in srgb, var(--card-background-color, #fff) 92%, transparent);
      border: 1px solid var(--divider-color, #e0e0e0);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04);
    }

    .panel-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .panel-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }

    .panel-note {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }

    .timeline,
    .task-list,
    .routine-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .timeline-item,
    .task-item,
    .routine-item {
      appearance: none;
      border: none;
      text-align: left;
      width: 100%;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      color: inherit;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
      font: inherit;
    }

    .timeline-item:hover,
    .task-item:hover,
    .routine-item:hover {
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 7%, var(--secondary-background-color, rgba(0, 0, 0, 0.03)));
    }

    .rail {
      width: 10px;
      align-self: stretch;
      border-radius: 999px;
      background: var(--primary-color, #03a9f4);
      flex-shrink: 0;
    }

    .timeline-body,
    .task-body,
    .routine-body {
      min-width: 0;
      flex: 1;
    }

    .timeline-title,
    .task-title,
    .routine-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .timeline-subtitle,
    .task-subtitle,
    .routine-subtitle {
      margin-top: 4px;
      font-size: 12px;
      line-height: 1.45;
      color: var(--secondary-text-color, #727272);
    }

    .timeline-time,
    .task-meta {
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      appearance: none;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 999px;
      padding: 9px 12px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }

    .chip:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 30%, var(--divider-color, #e0e0e0));
    }

    .empty {
      padding: 18px 14px;
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border-radius: 16px;
    }

    .footer-note {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      padding: 0 2px 8px;
    }

    @media (max-width: 1100px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .content {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 700px) {
      .shell {
        padding: 12px;
      }

      .hero {
        padding: 16px;
        border-radius: 20px;
      }

      .cards {
        grid-template-columns: 1fr;
      }
    }
  `;

  private get _calMap(): Map<string, PlannerCalendar> {
    return new Map(this.calendars.map((cal) => [cal.id, cal]));
  }

  private get _listMap(): Map<string, PlannerList> {
    return new Map(this.lists.map((list) => [list.id, list]));
  }

  private get _now(): Date {
    return new Date();
  }

  private _isFutureEvent(event: PlannerEvent): boolean {
    return !event.deleted_at && new Date(event.start).getTime() > this._now.getTime();
  }

  private _isDueTask(task: PlannerTask): boolean {
    if (task.deleted_at || task.completed) return false;
    if (!task.due) return false;
    const due = new Date(task.due + "T00:00:00").getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due <= today.getTime();
  }

  private _timelineItems(): TimelineItem[] {
    const sorted = this.events
      .filter((event) => this._isFutureEvent(event))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);

    return sorted.map((event) => {
      const calendar = this._calMap.get(event.calendar_id);
      const start = new Date(event.start);
      const timeLabel = event.all_day
        ? "All day"
        : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return {
        key: event.id,
        title: event.title,
        subtitle: calendar?.name ?? "Calendar",
        timeLabel,
        color: calendar?.color ?? "var(--primary-color, #03a9f4)",
      };
    });
  }

  private _dueGroups(): DueTaskGroup[] {
    const due = this.tasks.filter((task) => this._isDueTask(task));
    const byList = new Map<string, PlannerTask[]>();
    for (const task of due) {
      const bucket = byList.get(task.list_id) ?? [];
      bucket.push(task);
      byList.set(task.list_id, bucket);
    }

    return Array.from(byList.entries())
      .map(([listId, tasks]) => ({
        title: this._listMap.get(listId)?.name ?? listId,
        count: tasks.length,
        tasks: tasks.slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private _remainingBudget(): number {
    if (this.budget <= 0) return 0;
    const shoppingTotal = this.tasks
      .filter((task) => {
        const list = this._listMap.get(task.list_id);
        return list?.list_type === "shopping" && !task.deleted_at && !task.completed;
      })
      .reduce((sum, task) => sum + (task.price ?? 0), 0);
    return Math.max(0, this.budget - shoppingTotal);
  }

  private _emit(name: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onEventSelect(event: PlannerEvent): void {
    this._emit("event-select", { event });
  }

  private _onTaskClick(task: PlannerTask): void {
    this._emit("task-click", { task });
  }

  private _onRoutineExecute(routine: Routine): void {
    this._emit("routine-execute", { routineId: routine.id });
  }

  private _navigate(view: string): void {
    this._emit("navigate-view", { view });
  }

  render() {
    const timeline = this._timelineItems();
    const dueGroups = this._dueGroups();
    const nextEvent = timeline[0] ?? null;
    const dueCount = dueGroups.reduce((sum, group) => sum + group.count, 0);
    const routineCount = this.routines.length;
    const remainingBudget = this._remainingBudget();

    return html`
      <div class="shell">
        <section class="hero">
          <div class="eyebrow">Home</div>
          <h1>A quiet overview of today.</h1>
          <div class="hero-copy">
            Keep the planner calm: see the next shift, the nearest due tasks, the shopping budget, and the routines you actually use.
          </div>
        </section>

        <section class="cards" aria-label="Planner summary">
          <div class="card">
            <div class="card-label">Next Event</div>
            <div class="card-value">${nextEvent?.timeLabel ?? "None"}</div>
            <div class="card-sub">
              ${nextEvent ? `${nextEvent.title} · ${nextEvent.subtitle}` : "No upcoming events found."}
            </div>
          </div>
          <div class="card">
            <div class="card-label">Due Tasks</div>
            <div class="card-value">${dueCount}</div>
            <div class="card-sub">Grouped by list so the page stays readable.</div>
          </div>
          <div class="card">
            <div class="card-label">Budget Left</div>
            <div class="card-value">${this.currency}${Math.round(remainingBudget)}</div>
            <div class="card-sub">Shopping-only tasks reduce the running total.</div>
          </div>
          <div class="card">
            <div class="card-label">Routines</div>
            <div class="card-value">${routineCount}</div>
            <div class="card-sub">Shortcuts for the repeat work you already trust.</div>
          </div>
        </section>

        <section class="content">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Upcoming Timeline</h2>
                <div class="panel-note">The next five visible events, sorted by time.</div>
              </div>
              <button class="chip" @click=${() => this._navigate("calendar")}>Open Calendar</button>
            </div>

            ${timeline.length > 0
              ? html`
                  <div class="timeline">
                    ${timeline.map(
                      (item) => html`
                        <button class="timeline-item" @click=${() => {
                          const event = this.events.find((ev) => ev.id === item.key);
                          if (event) this._onEventSelect(event);
                        }}>
                          <span class="rail" style="background:${item.color}"></span>
                          <div class="timeline-body">
                            <div class="timeline-title">${item.title}</div>
                            <div class="timeline-subtitle">${item.subtitle}</div>
                          </div>
                          <div class="timeline-time">${item.timeLabel}</div>
                        </button>
                      `,
                    )}
                  </div>
                `
              : html`<div class="empty">No upcoming events are visible right now.</div>`}
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Due Tasks</h2>
                <div class="panel-note">Due today or overdue, grouped by list.</div>
              </div>
              <button class="chip" @click=${() => this._navigate("tasks")}>Open Tasks</button>
            </div>

            ${dueGroups.length > 0
              ? html`
                  <div class="task-list">
                    ${dueGroups.map(
                      (group) => html`
                        <div class="panel" style="padding:12px;background:var(--secondary-background-color, rgba(0,0,0,0.03));">
                          <div class="panel-header" style="margin-bottom:10px;">
                            <div>
                              <h3 class="panel-title">${group.title}</h3>
                              <div class="panel-note">${group.count} task${group.count === 1 ? "" : "s"}</div>
                            </div>
                          </div>
                          <div class="task-list">
                            ${group.tasks.map(
                              (task) => html`
                                <button class="task-item" @click=${() => this._onTaskClick(task)}>
                                  <div class="task-body">
                                    <div class="task-title">${task.completed ? html`<s>${task.title}</s>` : task.title}</div>
                                    <div class="task-subtitle">
                                      ${task.category || "General"}${task.price != null ? ` · ${this.currency}${task.price}` : ""}
                                    </div>
                                  </div>
                                  <div class="task-meta">${task.due ?? ""}</div>
                                </button>
                              `,
                            )}
                          </div>
                        </div>
                      `,
                    )}
                  </div>
                `
              : html`<div class="empty">No due tasks. The list is clear.</div>`}
          </div>
        </section>

        <section class="content" style="grid-template-columns: 1fr 1fr;">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Shopping Shortcuts</h2>
                <div class="panel-note">Quick routes into the shopping flow.</div>
              </div>
              <button class="chip" @click=${() => this._navigate("shopping")}>Open Shopping</button>
            </div>
            <div class="chip-row">
              ${this.lists
                .filter((list) => list.list_type === "shopping")
                .map(
                  (list) => html`
                    <button class="chip" @click=${() => this._navigate("shopping")}>
                      ${list.name}
                    </button>
                  `,
                )}
              ${this.tasks.filter((task) => {
                const list = this._listMap.get(task.list_id);
                return list?.list_type === "shopping" && !task.completed && !task.deleted_at;
              }).slice(0, 6).map(
                (task) => html`
                  <button class="chip" @click=${() => this._onTaskClick(task)}>
                    ${task.title}
                  </button>
                `,
              )}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Routines</h2>
                <div class="panel-note">Repeatable actions you can fire quickly.</div>
              </div>
            </div>
            ${this.routines.length > 0
              ? html`
                  <div class="routine-list">
                    ${this.routines.map(
                      (routine) => html`
                        <button class="routine-item" @click=${() => this._onRoutineExecute(routine)}>
                          <div class="routine-body">
                            <div class="routine-title">${routine.emoji || "•"} ${routine.name}</div>
                            <div class="routine-subtitle">${routine.description || "No description"}</div>
                          </div>
                          <div class="task-meta">${routine.tasks.length} tasks</div>
                        </button>
                      `,
                    )}
                  </div>
                `
              : html`<div class="empty">No routines have been configured yet.</div>`}
          </div>
        </section>

        <div class="footer-note">
          Home is intentionally lighter than the old sidebar-first shell. The main screen stays focused on the next thing to do.
        </div>
      </div>
    `;
  }
}
