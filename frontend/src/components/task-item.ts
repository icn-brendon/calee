/**
 * <calee-task-item> — Single task row with checkbox, meta badges,
 * and mobile swipe actions.
 *
 * Extracted from tasks-view.ts in Sprint 8. Pure rendering component;
 * all mutation events bubble to the parent.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerTask } from "../store/types.js";
import { isPast, isToday, formatDue, formatRecurrence } from "../helpers/task-helpers.js";
import {
  swipeStyles,
  createSwipeState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  getSwipeDelta,
  type SwipeState,
} from "../helpers/swipe-actions.js";

@customElement("calee-task-item")
export class CaleeTaskItem extends LitElement {
  @property({ attribute: false }) task!: PlannerTask;
  @property({ type: Boolean }) narrow = false;
  @property({ type: Boolean }) draggable = false;

  @state() private _swipe: SwipeState = createSwipeState();

  static styles = [swipeStyles, css`
    :host {
      display: block;
    }

    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      transition: background 0.15s;
      cursor: pointer;
    }
    .task-item:last-child {
      border-bottom: none;
    }
    .task-item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .drag-handle {
      flex-shrink: 0;
      width: 16px;
      height: 20px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color, #757575);
      opacity: 0.5;
      margin-top: 2px;
      font-size: 14px;
      user-select: none;
      touch-action: none;
    }
    .drag-handle:hover {
      opacity: 1;
    }

    .task-check {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--divider-color, #e0e0e0);
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
      border-color: var(--primary-color, #03a9f4);
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
      stroke: var(--primary-color, #03a9f4);
    }

    .task-body {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      font-size: 14px;
      color: var(--primary-text-color, #212121);
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
      color: var(--secondary-text-color, #757575);
    }
    .due-badge.overdue {
      background: var(--error-color, #f44336);
      color: #fff;
    }
    .due-badge.today {
      color: var(--primary-color, #03a9f4);
      font-weight: 600;
    }

    .recurrence-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--secondary-text-color, #757575);
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
      background: var(--secondary-text-color, #757575);
      opacity: 0.5;
    }

    .linked-icon {
      width: 14px;
      height: 14px;
      fill: var(--secondary-text-color, #757575);
      flex-shrink: 0;
    }
  `];

  /* ── Swipe (mobile) ────────────────────────────────────────────────── */

  private _onTouchStart(e: TouchEvent): void {
    handleTouchStart(this._swipe, e, this.task.id);
  }

  private _onTouchMove(e: TouchEvent): void {
    handleTouchMove(this._swipe, e);
    this.requestUpdate();
  }

  private _onTouchEnd(): void {
    const result = handleTouchEnd(this._swipe);
    this.requestUpdate();
    if (!result.action) return;

    if (result.action === "complete") {
      this._fireComplete();
    } else if (result.action === "delete") {
      this.dispatchEvent(
        new CustomEvent("task-swipe-delete", {
          detail: { taskId: this.task.id },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /* ── Events ────────────────────────────────────────────────────────── */

  private _fireComplete(): void {
    this.dispatchEvent(
      new CustomEvent("task-complete", {
        detail: { taskId: this.task.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onCheckClick(e: Event): void {
    e.stopPropagation();
    this._fireComplete();
  }

  private _onClick(): void {
    this.dispatchEvent(
      new CustomEvent("task-click", {
        detail: { task: this.task },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onDragStart(e: DragEvent): void {
    if (!this.draggable) return;
    e.dataTransfer?.setData("text/plain", this.task.id);
    e.dataTransfer!.effectAllowed = "move";
    this.dispatchEvent(
      new CustomEvent("task-drag-start", {
        detail: { taskId: this.task.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  render() {
    const task = this.task;
    const overdue = task.due ? isPast(task.due) : false;
    const dueIsToday = task.due ? isToday(task.due) : false;
    const delta = getSwipeDelta(this._swipe, task.id);
    const isSwiping = this._swipe.swipingId === task.id;

    return html`
      <div class="swipe-row-wrapper ${isSwiping ? "swiping" : ""}">
        <div class="swipe-action-complete" aria-hidden="true">&#10003;</div>
        <div class="swipe-action-delete" aria-hidden="true">&#128465;</div>

        <div
          class="swipe-row-inner task-item ${isSwiping ? "dragging" : ""}"
          style="transform: translateX(${delta}px)"
          @click=${this._onClick}
          @touchstart=${(e: TouchEvent) => this._onTouchStart(e)}
          @touchmove=${(e: TouchEvent) => this._onTouchMove(e)}
          @touchend=${() => this._onTouchEnd()}
          draggable=${this.draggable ? "true" : "false"}
          @dragstart=${(e: DragEvent) => this._onDragStart(e)}
        >
          ${this.draggable ? html`<span class="drag-handle" aria-label="Drag to reorder">\u2261</span>` : nothing}

          <button
            class="task-check"
            aria-label="Complete task"
            @click=${(e: Event) => this._onCheckClick(e)}
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
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-task-item": CaleeTaskItem;
  }
}
