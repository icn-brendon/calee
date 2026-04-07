/**
 * <calee-shopping-page> -- Thin wrapper around <calee-shopping-view>.
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PlannerTask, PlannerList, TaskPreset } from "../store/types.js";

@customElement("calee-shopping-page")
export class CaleeShoppingPage extends LitElement {
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) lists: PlannerList[] = [];
  @property({ attribute: false }) presets: TaskPreset[] = [];
  @property() currency = "$";
  @property({ type: Number }) budget = 0;
  @property() toastMessage = "";

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
    const shoppingList = this.lists.find((l) => l.list_type === "shopping");
    const shoppingTasks = shoppingList
      ? this.tasks.filter((t) => t.list_id === shoppingList.id)
      : this.tasks.filter((t) => t.list_id === "shopping");

    const shoppingPresets = this.presets.filter((p) => {
      return shoppingList ? p.list_id === shoppingList.id : p.list_id === "shopping";
    });

    return html`
      <div class="page-header">
        <span class="page-title">Shopping</span>
      </div>
      <div class="content">
        <calee-shopping-view
          .tasks=${shoppingTasks}
          .presets=${shoppingPresets}
          .listId=${shoppingList?.id ?? "shopping"}
          .currency=${this.currency}
          .budget=${this.budget}
          .toastMessage=${this.toastMessage}
          @toast-shown=${this._onToastShown}
        ></calee-shopping-view>
      </div>
    `;
  }

  private _onToastShown(): void {
    this.dispatchEvent(
      new CustomEvent("toast-shown", { bubbles: true, composed: true }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-shopping-page": CaleeShoppingPage;
  }
}
