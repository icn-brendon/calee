/**
 * <calee-tasks-view> — Task list orchestrator.
 *
 * Refactored in Sprint 8: rendering responsibilities are now delegated
 * to <calee-task-item>, <calee-task-quick-add>, and
 * <calee-task-edit-sheet>. This component handles tab navigation,
 * task filtering, section rendering, and drag-reorder.
 */

import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerTask, PlannerList, TaskPreset } from "../store/types.js";
import {
  type TaskView,
  type TaskSort,
  type TaskGroup,
  type TaskGroupSection,
  isToday,
  isUpcoming,
  sortTasks,
  groupTasks,
} from "../helpers/task-helpers.js";

// Import sub-components so they register their custom elements.
import "../components/task-item.js";
import "../components/task-quick-add.js";

@customElement("calee-tasks-view")
export class CaleeTasksView extends LitElement {
  @property({ type: Array }) tasks: PlannerTask[] = [];
  @property({ type: Array }) lists: PlannerList[] = [];
  @property({ type: Array }) presets: TaskPreset[] = [];
  @property({ type: String }) activeView: TaskView = "inbox";
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property({ type: String }) sortBy: TaskSort = "manual";
  @property({ type: String }) groupBy: TaskGroup = "none";

  @state() private _renderLimit = 100;
  @state() private _confirmDeleteId: string | null = null;

  /* Drag-reorder state */
  @state() private _dragOverId: string | null = null;

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      overflow-y: auto;
      height: 100%;
      box-sizing: border-box;
    }

    /* ── Tab bar ─────────────────────────────────────────────────── */

    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      padding-bottom: 8px;
    }

    .tab {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 16px;
      cursor: pointer;
      background: transparent;
      color: var(--secondary-text-color, #757575);
      border: none;
      transition: background 0.15s, color 0.15s;
    }
    .tab:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .tab[aria-selected="true"] {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    /* ── Task list ───────────────────────────────────────────────── */

    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* ── Section headers ─────────────────────────────────────────── */

    .section-header {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      padding: 12px 4px 6px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-header:first-child {
      margin-top: 0;
    }
    .section-count {
      font-size: 11px;
      font-weight: 400;
      color: var(--secondary-text-color, #999);
    }

    /* ── Drag-over indicator ─────────────────────────────────────── */

    .drag-over {
      border-top: 2px solid var(--primary-color, #03a9f4);
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--secondary-text-color, #757575);
      font-size: 14px;
    }

    .show-more-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      color: var(--primary-color, #03a9f4);
      font-size: 14px;
      cursor: pointer;
      text-align: center;
    }
    .show-more-btn:hover {
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

    /* ── Swipe delete confirmation ─────────────────────────── */

    .confirm-delete-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-delete-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .confirm-delete-dialog p {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
      margin: 0 0 16px;
    }

    .confirm-delete-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-delete-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
    }

    .confirm-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--primary-text-color, #212121);
    }

    .confirm-confirm {
      background: var(--error-color, #f44336);
      color: #fff;
    }
  `;

  /* ── Lifecycle ──────────────────────────────────────────────────── */

  private _boundHashChange = this._checkHashForTaskId.bind(this);

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("hashchange", this._boundHashChange);
    this._checkHashForTaskId();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("hashchange", this._boundHashChange);
  }

  updated(changed: PropertyValues): void {
    if (changed.has("activeView")) {
      this._renderLimit = 100;
    }
    if (changed.has("tasks")) {
      this._checkHashForTaskId();
    }
  }

  /** If the URL hash is #/tasks/<taskId>, open the edit sheet for that task. */
  private _checkHashForTaskId(): void {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/");
    if (parts[0] === "tasks" && parts[1] && parts[1].length > 0) {
      const taskId = parts[1];
      const task = this.tasks.find((t) => t.id === taskId);
      if (task) {
        this.dispatchEvent(
          new CustomEvent("task-edit-open", {
            detail: { task },
            bubbles: true,
            composed: true,
          }),
        );
        window.location.hash = "#/tasks";
      }
    }
  }

  /* ── Filtered & sorted tasks ──────────────────────────────────── */

  private get _filteredTasks(): PlannerTask[] {
    const active = this.tasks.filter((t) => !t.completed && !t.deleted_at);

    let filtered: PlannerTask[];
    switch (this.activeView) {
      case "today":
        filtered = active.filter((t) => t.due && isToday(t.due));
        break;
      case "upcoming":
        filtered = active
          .filter((t) => t.due && isUpcoming(t.due))
          .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime());
        break;
      case "inbox":
      default:
        filtered = active;
    }

    return sortTasks(filtered, this.sortBy);
  }

  private get _sections(): TaskGroupSection[] {
    return groupTasks(this._filteredTasks, this.groupBy, this.lists);
  }

  /* ── Event forwarding from sub-components ──────────────────────── */

  private _switchTab(view: TaskView): void {
    this._renderLimit = 100;
    this.activeView = view;
    this.dispatchEvent(
      new CustomEvent("view-change", { detail: { view }, bubbles: true, composed: true }),
    );
  }

  private _onTaskClick(e: CustomEvent): void {
    const task = e.detail.task as PlannerTask;
    if (this.narrow) {
      // On mobile, open the edit sheet instead of desktop detail drawer
      this.dispatchEvent(
        new CustomEvent("task-edit-open", {
          detail: { task },
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      // On desktop, forward to the shell for detail drawer
      this.dispatchEvent(
        new CustomEvent("task-click", {
          detail: { task },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private _onSwipeDelete(e: CustomEvent): void {
    this._confirmDeleteId = e.detail.taskId;
  }

  private _confirmSwipeDelete(): void {
    if (!this._confirmDeleteId) return;
    this.dispatchEvent(
      new CustomEvent("task-delete", {
        detail: { taskId: this._confirmDeleteId },
        bubbles: true,
        composed: true,
      }),
    );
    this._confirmDeleteId = null;
  }

  private _cancelSwipeDelete(): void {
    this._confirmDeleteId = null;
  }

  /* ── Drag-reorder ──────────────────────────────────────────────── */

  private _onDragOver(e: DragEvent, taskId: string): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    this._dragOverId = taskId;
  }

  private _onDragLeave(): void {
    this._dragOverId = null;
  }

  private _onDrop(e: DragEvent, targetTaskId: string): void {
    e.preventDefault();
    const draggedId = e.dataTransfer?.getData("text/plain");
    this._dragOverId = null;

    if (!draggedId || draggedId === targetTaskId) return;

    // Guard: only reorder within the same list.
    const dragged = this.tasks.find((t) => t.id === draggedId);
    const target = this.tasks.find((t) => t.id === targetTaskId);
    if (!dragged || !target || dragged.list_id !== target.list_id) return;

    this.dispatchEvent(
      new CustomEvent("task-reorder", {
        detail: { taskId: draggedId, beforeTaskId: targetTaskId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */

  render() {
    const tabs: { key: TaskView; label: string }[] = [
      { key: "inbox", label: "Inbox" },
      { key: "today", label: "Today" },
      { key: "upcoming", label: "Upcoming" },
    ];

    const sections = this._sections;
    const totalTasks = sections.reduce((sum, s) => sum + s.tasks.length, 0);
    const isDraggable = this.sortBy === "manual" && this.groupBy === "none";

    return html`
      <div class="tabs" role="tablist">
        ${tabs.map((t) => html`
          <button
            class="tab"
            role="tab"
            aria-selected=${this.activeView === t.key}
            @click=${() => this._switchTab(t.key)}
          >
            ${t.label}
          </button>
        `)}
      </div>

      <calee-task-quick-add
        .activeView=${this.activeView}
        .presets=${this.presets}
      ></calee-task-quick-add>

      <!-- Swipe delete confirmation -->
      ${this._confirmDeleteId ? html`
        <div class="confirm-delete-overlay"
          @click=${(e: Event) => {
            if ((e.target as HTMLElement).classList.contains("confirm-delete-overlay")) {
              this._cancelSwipeDelete();
            }
          }}>
          <div class="confirm-delete-dialog">
            <p>Delete this task?</p>
            <div class="confirm-delete-actions">
              <button class="confirm-cancel" @click=${this._cancelSwipeDelete}>Cancel</button>
              <button class="confirm-confirm" @click=${this._confirmSwipeDelete}>Delete</button>
            </div>
          </div>
        </div>
      ` : nothing}

      ${totalTasks === 0
        ? html`<div class="empty">No tasks</div>`
        : html`
            ${sections.map((section) => html`
              ${section.label ? html`
                <div class="section-header">
                  ${section.label}
                  <span class="section-count">${section.tasks.length}</span>
                </div>
              ` : nothing}
              <ul class="task-list">
                ${section.tasks.slice(0, this._renderLimit).map((t) => html`
                  <li
                    class="${this._dragOverId === t.id ? "drag-over" : ""}"
                    @dragover=${(e: DragEvent) => this._onDragOver(e, t.id)}
                    @dragleave=${this._onDragLeave}
                    @drop=${(e: DragEvent) => this._onDrop(e, t.id)}
                  >
                    <calee-task-item
                      .task=${t}
                      ?narrow=${this.narrow}
                      ?draggable=${isDraggable}
                      @task-click=${this._onTaskClick}
                      @task-swipe-delete=${this._onSwipeDelete}
                    ></calee-task-item>
                  </li>
                `)}
              </ul>
            `)}
            ${totalTasks > this._renderLimit ? html`
              <button class="show-more-btn" @click=${() => { this._renderLimit += 100; }}>
                Show more (${totalTasks - this._renderLimit} remaining)
              </button>
            ` : nothing}
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-tasks-view": CaleeTasksView;
  }
}
