/**
 * <calee-tasks-view> — Task list with Inbox / Today / Upcoming tabs,
 * quick-add with date pills and recurrence selector, inline editing,
 * and visual indicators for due dates and recurrence.
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { PlannerTask, PlannerList, TaskPreset } from "../store/types.js";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function nextWeekISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === todayISO();
}

function isTomorrow(iso: string): boolean {
  return iso.slice(0, 10) === tomorrowISO();
}

function isUpcoming(iso: string): boolean {
  return iso.slice(0, 10) > todayISO();
}

function isPast(iso: string): boolean {
  return iso.slice(0, 10) < todayISO();
}

function formatDue(iso: string): string {
  const dateStr = iso.slice(0, 10);
  if (dateStr === todayISO()) return "Today";
  if (dateStr === tomorrowISO()) return "Tomorrow";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Fortnightly",
  monthly: "Monthly",
  weekdays: "Weekdays",
};

function formatRecurrence(rule: string): string {
  return RECURRENCE_LABELS[rule] ?? rule;
}

type TaskView = "inbox" | "today" | "upcoming";
type DatePill = "none" | "today" | "tomorrow" | "nextweek" | "custom";
type RecurrencePill = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "weekdays";

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-tasks-view")
export class CaleeTasksView extends LitElement {
  @property({ type: Array }) tasks: PlannerTask[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Array }) presets: TaskPreset[] = [];
  @property({ type: String }) activeView: TaskView = "inbox";

  /* Quick-add state */
  @state() private _quickAddText = "";
  @state() private _quickAddFocused = false;
  @state() private _selectedDatePill: DatePill = "none";
  @state() private _selectedRecurrence: RecurrencePill = "none";
  @state() private _customDate = "";

  /* Inline edit state */
  @state() private _editingTaskId: string | null = null;
  @state() private _editTitle = "";
  @state() private _editDatePill: DatePill = "none";
  @state() private _editCustomDate = "";
  @state() private _editRecurrence: RecurrencePill = "none";

  @query("#quick-add-input") private _inputEl!: HTMLInputElement;

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      --task-bg: var(--card-background-color, #fff);
      --task-text: var(--primary-text-color, #212121);
      --task-secondary: var(--secondary-text-color, #757575);
      --task-border: var(--divider-color, #e0e0e0);
      --task-accent: var(--primary-color, #03a9f4);
      --task-error: var(--error-color, #f44336);
    }

    /* ── Tab bar ─────────────────────────────────────────────────── */

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--task-border);
      padding-bottom: 8px;
    }

    .tab {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 16px;
      cursor: pointer;
      background: transparent;
      color: var(--task-secondary);
      border: none;
      transition: background 0.15s, color 0.15s;
    }
    .tab:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .tab[aria-selected="true"] {
      background: var(--task-accent);
      color: #fff;
    }

    /* ── Quick-add ───────────────────────────────────────────────── */

    .quick-add {
      margin-bottom: 16px;
    }
    .quick-add-input-row {
      display: flex;
      gap: 8px;
    }
    .quick-add input[type="text"] {
      flex: 1;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--task-border);
      border-radius: 8px;
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .quick-add input[type="text"]:focus {
      border-color: var(--task-accent);
    }
    .quick-add input[type="text"]::placeholder {
      color: var(--task-secondary);
    }

    /* ── Pill rows (shared) ──────────────────────────────────────── */

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .pill-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--task-secondary);
      align-self: center;
      margin-right: 4px;
    }

    .pill {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      background: transparent;
      color: var(--task-secondary);
      border: 1px solid var(--task-border);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
      user-select: none;
    }
    .pill:hover {
      border-color: var(--task-accent);
      color: var(--task-text);
    }
    .pill[aria-selected="true"] {
      background: var(--task-accent);
      color: #fff;
      border-color: var(--task-accent);
    }

    .recurrence-pill[aria-selected="true"] {
      background: color-mix(in srgb, var(--task-accent) 15%, transparent);
      color: var(--task-accent);
      border-color: var(--task-accent);
    }

    .custom-date-input {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid var(--task-border);
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .custom-date-input:focus {
      border-color: var(--task-accent);
    }

    .pills-container {
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
    }
    .pills-container.expanded {
      max-height: 120px;
      opacity: 1;
    }

    /* ── Task list ───────────────────────────────────────────────── */

    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--task-border);
      transition: background 0.15s;
      cursor: pointer;
    }
    .task-item:last-child {
      border-bottom: none;
    }
    .task-item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .task-check {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--task-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s;
      background: transparent;
      padding: 0;
      margin-top: 2px;
    }
    .task-check:hover {
      border-color: var(--task-accent);
    }
    .task-check svg {
      width: 12px;
      height: 12px;
      fill: none;
      stroke: transparent;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .task-check:hover svg {
      stroke: var(--task-accent);
    }

    .task-body {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      font-size: 14px;
      color: var(--task-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
      flex-wrap: wrap;
    }

    .due-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--task-secondary);
    }
    .due-badge.overdue {
      background: var(--task-error);
      color: #fff;
    }
    .due-badge.today {
      color: var(--task-accent);
      font-weight: 600;
    }

    .recurrence-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--task-secondary);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .recurrence-badge .repeat-icon {
      font-size: 11px;
      line-height: 1;
    }

    .meta-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--task-secondary);
      opacity: 0.5;
    }

    .linked-icon {
      width: 14px;
      height: 14px;
      fill: var(--task-secondary);
      flex-shrink: 0;
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--task-secondary);
      font-size: 14px;
    }

    /* ── Inline edit ─────────────────────────────────────────────── */

    .task-edit {
      padding: 10px 4px;
      border-bottom: 1px solid var(--task-border);
      background: var(--secondary-background-color, #fafafa);
      border-radius: 8px;
      margin-bottom: 2px;
    }

    .edit-title-input {
      width: 100%;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--task-border);
      border-radius: 6px;
      background: var(--task-bg);
      color: var(--task-text);
      outline: none;
      box-sizing: border-box;
    }
    .edit-title-input:focus {
      border-color: var(--task-accent);
    }

    .edit-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .btn {
      font-size: 12px;
      font-weight: 500;
      padding: 5px 14px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: background 0.15s, color 0.15s;
    }
    .btn-primary {
      background: var(--task-accent);
      color: #fff;
    }
    .btn-primary:hover {
      filter: brightness(1.1);
    }
    .btn-secondary {
      background: transparent;
      color: var(--task-secondary);
      border: 1px solid var(--task-border);
    }
    .btn-secondary:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    /* ── Preset quick-add ──────────────────────────────────────── */

    .presets-section {
      margin-bottom: 16px;
    }

    .presets-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--task-secondary);
      margin: 0 0 6px;
    }

    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--task-border);
      background: var(--task-bg);
      color: var(--task-text);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }

    .preset-chip:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--task-accent);
    }

    .preset-chip:active {
      background: var(--task-accent);
      color: #fff;
      border-color: var(--task-accent);
    }

    .preset-chip ha-icon,
    .preset-chip ha-svg-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
  `;

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  updated(changed: PropertyValues): void {
    if (changed.has("activeView")) {
      this._resetQuickAdd();
    }
  }

  /* ── Quick-add defaults per tab ─────────────────────────────────── */

  private get _defaultDatePill(): DatePill {
    switch (this.activeView) {
      case "today":
        return "today";
      case "upcoming":
        return "tomorrow";
      default:
        return "none";
    }
  }

  private _resetQuickAdd(): void {
    this._quickAddText = "";
    this._selectedDatePill = this._defaultDatePill;
    this._selectedRecurrence = "none";
    this._customDate = "";
  }

  /* ── Resolve due date from pill ─────────────────────────────────── */

  private _resolveDue(pill: DatePill, customDate: string): string | undefined {
    switch (pill) {
      case "today":
        return todayISO();
      case "tomorrow":
        return tomorrowISO();
      case "nextweek":
        return nextWeekISO();
      case "custom":
        return customDate || undefined;
      default:
        return undefined;
    }
  }

  /* ── Determine date pill from an existing due string ────────────── */

  private _datePillFromDue(due: string | null): { pill: DatePill; customDate: string } {
    if (!due) return { pill: "none", customDate: "" };
    const dateStr = due.slice(0, 10);
    if (dateStr === todayISO()) return { pill: "today", customDate: "" };
    if (dateStr === tomorrowISO()) return { pill: "tomorrow", customDate: "" };
    // Check if it's roughly 7 days from now (within a day)
    const nextWk = nextWeekISO();
    if (dateStr === nextWk) return { pill: "nextweek", customDate: "" };
    return { pill: "custom", customDate: dateStr };
  }

  /* ── Filtered tasks ─────────────────────────────────────────────── */

  private get _filteredTasks(): PlannerTask[] {
    const active = this.tasks.filter((t) => !t.completed && !t.deleted_at);

    switch (this.activeView) {
      case "today":
        return active.filter((t) => t.due && isToday(t.due));
      case "upcoming":
        return active
          .filter((t) => t.due && isUpcoming(t.due))
          .sort(
            (a, b) =>
              new Date(a.due!).getTime() - new Date(b.due!).getTime(),
          );
      case "inbox":
      default:
        return active;
    }
  }

  /* ── Events ─────────────────────────────────────────────────────── */

  /** Presets relevant to the current inbox view. */
  private get _inboxPresets(): TaskPreset[] {
    return this.presets.filter((p) => p.list_id === "inbox");
  }

  private _onPresetClick(preset: TaskPreset): void {
    this.dispatchEvent(
      new CustomEvent("preset-add", {
        detail: { presetId: preset.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _switchTab(view: TaskView): void {
    this.activeView = view;
    this.dispatchEvent(
      new CustomEvent("view-change", {
        detail: { view },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onComplete(task: PlannerTask, e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("task-complete", {
        detail: { taskId: task.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onQuickAddKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && this._quickAddText.trim()) {
      const due = this._resolveDue(this._selectedDatePill, this._customDate);
      const recurrence = this._selectedRecurrence !== "none" && due
        ? this._selectedRecurrence
        : undefined;

      this.dispatchEvent(
        new CustomEvent("task-quick-add", {
          detail: {
            title: this._quickAddText.trim(),
            due,
            recurrence_rule: recurrence,
          },
          bubbles: true,
          composed: true,
        }),
      );
      this._quickAddText = "";
      this._inputEl.value = "";
      this._resetQuickAdd();
    }
  }

  private _onInput(e: Event): void {
    this._quickAddText = (e.target as HTMLInputElement).value;
  }

  private _onInputFocus(): void {
    this._quickAddFocused = true;
  }

  private _onInputBlur(): void {
    // Delay hiding so pill clicks register
    setTimeout(() => {
      this._quickAddFocused = false;
    }, 200);
  }

  private _selectDatePill(pill: DatePill): void {
    this._selectedDatePill = pill;
    if (pill === "none") {
      this._selectedRecurrence = "none";
    }
  }

  private _selectRecurrence(pill: RecurrencePill): void {
    this._selectedRecurrence = pill;
  }

  private _onCustomDateChange(e: Event): void {
    this._customDate = (e.target as HTMLInputElement).value;
  }

  /* ── Inline editing ─────────────────────────────────────────────── */

  private _startEdit(task: PlannerTask): void {
    this._editingTaskId = task.id;
    this._editTitle = task.title;
    const { pill, customDate } = this._datePillFromDue(task.due);
    this._editDatePill = pill;
    this._editCustomDate = customDate;
    this._editRecurrence = (task.recurrence_rule as RecurrencePill) || "none";
  }

  private _cancelEdit(): void {
    this._editingTaskId = null;
  }

  private _saveEdit(task: PlannerTask): void {
    const due = this._resolveDue(this._editDatePill, this._editCustomDate);
    const recurrence = this._editRecurrence !== "none" && due
      ? this._editRecurrence
      : "";

    this.dispatchEvent(
      new CustomEvent("task-update", {
        detail: {
          taskId: task.id,
          version: task.version,
          title: this._editTitle.trim() || task.title,
          due: due ?? "",
          recurrence_rule: recurrence,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this._editingTaskId = null;
  }

  private _onEditTitleInput(e: Event): void {
    this._editTitle = (e.target as HTMLInputElement).value;
  }

  private _selectEditDatePill(pill: DatePill): void {
    this._editDatePill = pill;
    if (pill === "none") {
      this._editRecurrence = "none";
    }
  }

  private _selectEditRecurrence(pill: RecurrencePill): void {
    this._editRecurrence = pill;
  }

  private _onEditCustomDateChange(e: Event): void {
    this._editCustomDate = (e.target as HTMLInputElement).value;
  }

  private _onEditKeydown(e: KeyboardEvent, task: PlannerTask): void {
    if (e.key === "Enter") {
      this._saveEdit(task);
    } else if (e.key === "Escape") {
      this._cancelEdit();
    }
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  render() {
    const tabs: { key: TaskView; label: string }[] = [
      { key: "inbox", label: "Inbox" },
      { key: "today", label: "Today" },
      { key: "upcoming", label: "Upcoming" },
    ];

    const filtered = this._filteredTasks;
    const showPills = this._quickAddFocused || this._quickAddText.length > 0;
    const hasDue = this._selectedDatePill !== "none";

    return html`
      <div class="tabs" role="tablist">
        ${tabs.map(
          (t) => html`
            <button
              class="tab"
              role="tab"
              aria-selected=${this.activeView === t.key}
              @click=${() => this._switchTab(t.key)}
            >
              ${t.label}
            </button>
          `,
        )}
      </div>

      <div class="quick-add">
        <div class="quick-add-input-row">
          <input
            id="quick-add-input"
            type="text"
            placeholder="Add a task..."
            .value=${this._quickAddText}
            @input=${this._onInput}
            @keydown=${this._onQuickAddKeydown}
            @focus=${this._onInputFocus}
            @blur=${this._onInputBlur}
          />
        </div>

        <div class="pills-container ${showPills ? "expanded" : ""}">
          ${this._renderDatePills(
            this._selectedDatePill,
            this._customDate,
            (p: DatePill) => this._selectDatePill(p),
            (e: Event) => this._onCustomDateChange(e),
          )}
          ${hasDue
            ? this._renderRecurrencePills(
                this._selectedRecurrence,
                (p: RecurrencePill) => this._selectRecurrence(p),
              )
            : nothing}
        </div>
      </div>

      ${this.activeView === "inbox" && this._inboxPresets.length > 0
        ? html`
            <div class="presets-section">
              <div class="presets-label">Quick add</div>
              <div class="presets-grid">
                ${this._inboxPresets.map(
                  (p) => html`
                    <button
                      class="preset-chip"
                      @click=${() => this._onPresetClick(p)}
                      title="Add ${p.title}"
                    >
                      ${p.icon
                        ? html`<ha-icon .icon=${p.icon}></ha-icon>`
                        : nothing}
                      ${p.title}
                    </button>
                  `,
                )}
              </div>
            </div>
          `
        : nothing}

      ${filtered.length === 0
        ? html`<div class="empty">No tasks</div>`
        : html`
            <ul class="task-list">
              ${filtered.map((t) =>
                this._editingTaskId === t.id
                  ? this._renderEditRow(t)
                  : this._renderTask(t),
              )}
            </ul>
          `}
    `;
  }

  /* ── Date pills (reusable for quick-add and inline edit) ──────── */

  private _renderDatePills(
    selected: DatePill,
    customDate: string,
    onSelect: (pill: DatePill) => void,
    onCustomChange: (e: Event) => void,
  ) {
    const pills: { key: DatePill; label: string }[] = [
      { key: "today", label: "Today" },
      { key: "tomorrow", label: "Tomorrow" },
      { key: "nextweek", label: "Next week" },
      { key: "custom", label: "Custom" },
      { key: "none", label: "No date" },
    ];

    return html`
      <div class="pill-row">
        <span class="pill-label">Due</span>
        ${pills.map(
          (p) => html`
            <button
              class="pill"
              aria-selected=${selected === p.key}
              @click=${() => onSelect(p.key)}
            >
              ${p.label}
            </button>
          `,
        )}
        ${selected === "custom"
          ? html`
              <input
                type="date"
                class="custom-date-input"
                .value=${customDate}
                @change=${onCustomChange}
              />
            `
          : nothing}
      </div>
    `;
  }

  /* ── Recurrence pills (reusable) ──────────────────────────────── */

  private _renderRecurrencePills(
    selected: RecurrencePill,
    onSelect: (pill: RecurrencePill) => void,
  ) {
    const pills: { key: RecurrencePill; label: string }[] = [
      { key: "none", label: "None" },
      { key: "daily", label: "Daily" },
      { key: "weekly", label: "Weekly" },
      { key: "biweekly", label: "Fortnightly" },
      { key: "monthly", label: "Monthly" },
      { key: "weekdays", label: "Weekdays" },
    ];

    return html`
      <div class="pill-row">
        <span class="pill-label">Repeat</span>
        ${pills.map(
          (p) => html`
            <button
              class="pill recurrence-pill"
              aria-selected=${selected === p.key}
              @click=${() => onSelect(p.key)}
            >
              ${p.label}
            </button>
          `,
        )}
      </div>
    `;
  }

  /* ── Task item rendering ──────────────────────────────────────── */

  private _renderTask(task: PlannerTask) {
    const overdue = task.due ? isPast(task.due) : false;
    const dueIsToday = task.due ? isToday(task.due) : false;

    return html`
      <li class="task-item" @click=${() => this._startEdit(task)}>
        <button
          class="task-check"
          aria-label="Complete task"
          @click=${(e: Event) => this._onComplete(task, e)}
        >
          <svg viewBox="0 0 16 16">
            <polyline points="3.5,8 6.5,11 12.5,5" />
          </svg>
        </button>

        <div class="task-body">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            ${task.due
              ? html`<span class="due-badge ${overdue ? "overdue" : ""} ${dueIsToday && !overdue ? "today" : ""}">
                  ${formatDue(task.due)}
                </span>`
              : nothing}
            ${task.due && task.recurrence_rule
              ? html`<span class="meta-dot"></span>`
              : nothing}
            ${task.recurrence_rule
              ? html`<span class="recurrence-badge">
                  <span class="repeat-icon">&#x1f504;</span>
                  ${formatRecurrence(task.recurrence_rule)}
                </span>`
              : nothing}
            ${task.related_event_id
              ? html`<svg class="linked-icon" viewBox="0 0 24 24">
                  <path
                    d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z"
                  />
                </svg>`
              : nothing}
          </div>
        </div>
      </li>
    `;
  }

  /* ── Inline edit row ──────────────────────────────────────────── */

  private _renderEditRow(task: PlannerTask) {
    const editHasDue = this._editDatePill !== "none";

    return html`
      <li class="task-edit">
        <input
          type="text"
          class="edit-title-input"
          .value=${this._editTitle}
          @input=${this._onEditTitleInput}
          @keydown=${(e: KeyboardEvent) => this._onEditKeydown(e, task)}
        />

        ${this._renderDatePills(
          this._editDatePill,
          this._editCustomDate,
          (p: DatePill) => this._selectEditDatePill(p),
          (e: Event) => this._onEditCustomDateChange(e),
        )}

        ${editHasDue
          ? this._renderRecurrencePills(
              this._editRecurrence,
              (p: RecurrencePill) => this._selectEditRecurrence(p),
            )
          : nothing}

        <div class="edit-actions">
          <button class="btn btn-primary" @click=${() => this._saveEdit(task)}>
            Save
          </button>
          <button class="btn btn-secondary" @click=${this._cancelEdit}>
            Cancel
          </button>
        </div>
      </li>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-tasks-view": CaleeTasksView;
  }
}
