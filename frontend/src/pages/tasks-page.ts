/**
 * <calee-tasks-page> — Tasks page wrapper with sort/group controls.
 *
 * Expanded in Sprint 8: adds sort and group toolbar, delegates
 * rendering to <calee-tasks-view>.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { PlannerTask, PlannerList, TaskPreset } from "../store/types.js";
import type { TaskSort, TaskGroup } from "../helpers/task-helpers.js";

@customElement("calee-tasks-page")
export class CaleeTasksPage extends LitElement {
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) lists: PlannerList[] = [];
  @property({ attribute: false }) presets: TaskPreset[] = [];
  @property({ type: Boolean }) narrow = false;

  @state() private _sortBy: TaskSort = "manual";
  @state() private _groupBy: TaskGroup = "none";
  @state() private _showToolbar = false;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      height: 36px;
      min-height: 36px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
    }

    .page-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      flex: 1;
    }

    .toolbar-toggle {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: var(--secondary-text-color, #757575);
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .toolbar-toggle:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    .toolbar-toggle.active {
      color: var(--primary-color, #03a9f4);
    }

    /* ── Sort/group toolbar ────────────────────────────────────── */

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 16px;
      background: var(--secondary-background-color, #fafafa);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.2s ease, opacity 0.2s ease, padding 0.2s ease;
    }
    .toolbar.visible {
      max-height: 50px;
      opacity: 1;
      padding: 8px 16px;
    }

    .toolbar-section {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toolbar-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #757575);
    }

    .chip {
      font-size: 12px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 12px;
      cursor: pointer;
      background: transparent;
      color: var(--secondary-text-color, #757575);
      border: 1px solid var(--divider-color, #e0e0e0);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .chip:hover {
      border-color: var(--primary-color, #03a9f4);
    }
    .chip[aria-selected="true"] {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }

    .content {
      flex: 1;
      overflow: hidden;
    }
  `;

  render() {
    const standardLists = this.lists.filter((l) => l.list_type !== "shopping");
    const shoppingIds = new Set(
      this.lists.filter((l) => l.list_type === "shopping").map((l) => l.id),
    );
    const standardPresets = this.presets.filter((p) => !shoppingIds.has(p.list_id));

    return html`
      <div class="page-header">
        <span class="page-title">Tasks</span>
        <button
          class="toolbar-toggle ${this._showToolbar ? "active" : ""}"
          @click=${() => { this._showToolbar = !this._showToolbar; }}
          title="Sort & group"
          aria-label="Toggle sort and group toolbar"
        >
          &#x2630;
        </button>
      </div>

      <div class="toolbar ${this._showToolbar ? "visible" : ""}">
        <div class="toolbar-section">
          <span class="toolbar-label">Sort</span>
          ${(["manual", "due", "title", "created"] as TaskSort[]).map((s) => html`
            <button class="chip" aria-selected=${this._sortBy === s}
              @click=${() => { this._sortBy = s; }}>
              ${{ manual: "Manual", due: "Due date", title: "Title", created: "Newest" }[s]}
            </button>
          `)}
        </div>

        <div class="toolbar-section">
          <span class="toolbar-label">Group</span>
          ${(["none", "list", "due", "category"] as TaskGroup[]).map((g) => html`
            <button class="chip" aria-selected=${this._groupBy === g}
              @click=${() => { this._groupBy = g; }}>
              ${{ none: "None", list: "List", due: "Due date", category: "Category" }[g]}
            </button>
          `)}
        </div>
      </div>

      <div class="content">
        <calee-tasks-view
          .tasks=${this.tasks}
          .lists=${standardLists}
          .presets=${standardPresets}
          .sortBy=${this._sortBy}
          .groupBy=${this._groupBy}
          ?narrow=${this.narrow}
        ></calee-tasks-view>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-tasks-page": CaleeTasksPage;
  }
}
