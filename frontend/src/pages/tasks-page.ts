/**
 * <calee-tasks-page> -- Thin wrapper around <calee-tasks-view> with filter chips.
 *
 * Will be expanded in Sprint 8 with filtering, sorting, and grouping.
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PlannerTask, PlannerList, TaskPreset } from "../store/types.js";

@customElement("calee-tasks-page")
export class CaleeTasksPage extends LitElement {
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) lists: PlannerList[] = [];
  @property({ attribute: false }) presets: TaskPreset[] = [];
  @property({ type: Boolean }) narrow = false;

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
    }

    .content {
      flex: 1;
      overflow: hidden;
    }
  `;

  render() {
    const standardLists = this.lists.filter((l) => l.list_type !== "shopping");
    const standardPresets = this.presets.filter((p) => {
      const shoppingIds = new Set(
        this.lists.filter((l) => l.list_type === "shopping").map((l) => l.id),
      );
      return !shoppingIds.has(p.list_id);
    });

    return html`
      <div class="page-header">
        <span class="page-title">Tasks</span>
      </div>
      <div class="content">
        <calee-tasks-view
          .tasks=${this.tasks}
          .lists=${standardLists}
          .presets=${standardPresets}
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
