/**
 * <calee-shopping-view> — Shopping-list view with category grouping,
 * recurring "always" items, price tracking, budget progress, and
 * collapsible completed section.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { PlannerTask, TaskPreset } from "../store/types.js";
import {
  swipeStyles,
  createSwipeState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  getSwipeDelta,
  type SwipeState,
} from "../helpers/swipe-actions.js";

/* ── Category metadata ─────────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  food: { label: "Food", icon: "\uD83C\uDF4E" },
  groceries: { label: "Groceries", icon: "\uD83D\uDED2" },
  household: { label: "Household", icon: "\uD83C\uDFE0" },
  health: { label: "Health", icon: "\uD83D\uDC8A" },
  personal: { label: "Personal", icon: "\uD83E\uDDF4" },
  other: { label: "Other", icon: "\uD83D\uDCE6" },
};

const CATEGORY_ORDER = ["food", "groceries", "household", "health", "personal", "other"];

function categoryLabel(cat: string): string {
  const lower = cat.toLowerCase();
  return CATEGORY_META[lower]?.label ?? (cat || "Uncategorised");
}

function categoryIcon(cat: string): string {
  const lower = cat.toLowerCase();
  return CATEGORY_META[lower]?.icon ?? "\uD83D\uDCE6";
}

function categorySortKey(cat: string): number {
  const idx = CATEGORY_ORDER.indexOf(cat.toLowerCase());
  return idx >= 0 ? idx : CATEGORY_ORDER.length;
}

/* ── Component ───────────────────────────────────────────────────────── */

@customElement("calee-shopping-view")
export class CaleeShoppingView extends LitElement {
  /** Tasks pre-filtered to the shopping list by the parent. */
  @property({ type: Array }) tasks: PlannerTask[] = [];

  /** Available quick-add presets for this list. */
  @property({ type: Array }) presets: TaskPreset[] = [];

  /** The ID of the shopping list for creating presets. */
  @property({ type: String }) listId = "shopping";

  /** Currency symbol from options. */
  @property({ type: String }) currency = "$";

  /** Budget limit from options (0 = no budget). */
  @property({ type: Number }) budget = 0;

  @state() private _quickAddText = "";
  @state() private _selectedCategory = "";
  @state() private _completedOpen = false;
  @state() private _collapsedSections = new Set<string>();
  @state() private _showCustomCategoryInput = false;
  @state() private _customCategoryText = "";
  @state() private _showPresetForm = false;
  @state() private _presetFormCategory = "";
  @state() private _presetFormTitle = "";
  @state() private _presetFormEmoji = "";
  @state() private _confirmDeletePresetId: string | null = null;

  /** Number of pending items to render; grows when user taps "Show more". */
  @state() private _pendingRenderLimit = 100;

  /* Swipe state (mobile) */
  private _swipe: SwipeState = createSwipeState();
  @state() private _confirmSwipeDeleteId: string | null = null;

  @query("#quick-add-input") private _inputEl!: HTMLInputElement;

  static styles = [swipeStyles, css`
    :host {
      display: block;
      padding: 16px;
      --shop-bg: var(--card-background-color, #fff);
      --shop-text: var(--primary-text-color, #212121);
      --shop-secondary: var(--secondary-text-color, #757575);
      --shop-border: var(--divider-color, #e0e0e0);
      --shop-accent: var(--primary-color, #03a9f4);
      --shop-done: var(--disabled-text-color, #bdbdbd);
      --shop-success: #4caf50;
      --shop-warn: #ff9800;
      --shop-over: #f44336;
    }

    /* ── Quick-add ───────────────────────────────────────────────── */

    .quick-add {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .quick-add input {
      flex: 1;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .quick-add input:focus {
      border-color: var(--shop-accent);
    }
    .quick-add input::placeholder {
      color: var(--shop-secondary);
    }
    .quick-add select {
      font-size: 13px;
      padding: 8px 10px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      cursor: pointer;
      min-width: 100px;
    }
    .quick-add select:focus {
      border-color: var(--shop-accent);
    }

    /* ── Custom category input ──────────────────────────────── */

    .custom-category-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      align-items: center;
    }

    .custom-category-input {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--shop-accent);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      font-family: inherit;
    }

    .custom-category-input:focus {
      border-color: var(--shop-accent);
    }

    .custom-category-ok {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      background: var(--shop-accent);
      color: #fff;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .custom-category-ok:hover {
      opacity: 0.9;
    }

    .custom-category-cancel {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }

    .custom-category-cancel:hover {
      background: var(--shop-border);
    }

    /* ── Section ─────────────────────────────────────────────── */

    .section {
      margin-bottom: 12px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 4px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--shop-secondary);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .section-header:hover {
      color: var(--shop-text);
    }

    .section-icon {
      font-size: 16px;
      line-height: 1;
    }

    .section-label {
      flex: 1;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .section-count {
      font-weight: 400;
      font-size: 12px;
      color: var(--shop-done);
    }

    .chevron {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
      fill: currentColor;
      flex-shrink: 0;
    }
    .chevron.open {
      transform: rotate(90deg);
    }

    /* ── Item list ───────────────────────────────────────────────── */

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 4px;
      border-bottom: 1px solid var(--shop-border);
      transition: background 0.15s;
    }
    .item:last-child {
      border-bottom: none;
    }
    .item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .checkbox {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid var(--shop-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      padding: 0;
      transition: border-color 0.15s, background 0.15s;
    }
    .checkbox:hover {
      border-color: var(--shop-accent);
    }
    .checkbox svg {
      width: 12px;
      height: 12px;
      fill: none;
      stroke: transparent;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .checkbox:hover svg {
      stroke: var(--shop-accent);
    }

    .checkbox.checked {
      background: var(--shop-accent);
      border-color: var(--shop-accent);
    }
    .checkbox.checked svg {
      stroke: #fff;
    }

    .item-title {
      flex: 1;
      font-size: 14px;
      color: var(--shop-text);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .recurring-badge {
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      title: "Recurring item";
    }

    .item-price {
      flex-shrink: 0;
      width: 72px;
    }
    .item-price input {
      width: 100%;
      font-size: 13px;
      padding: 4px 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: var(--shop-secondary);
      text-align: right;
      outline: none;
      transition: border-color 0.15s, background 0.15s;
      font-family: inherit;
    }
    .item-price input:focus {
      border-color: var(--shop-accent);
      background: var(--shop-bg);
      color: var(--shop-text);
    }
    .item-price input::placeholder {
      color: var(--shop-done);
    }

    /* ── Budget / totals bar ─────────────────────────────────── */

    .totals {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      background: var(--secondary-background-color, #f5f5f5);
    }

    .total-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
      color: var(--shop-text);
      margin-bottom: 8px;
    }
    .total-line:last-child {
      margin-bottom: 0;
    }

    .budget-text {
      font-size: 12px;
      font-weight: 400;
      color: var(--shop-secondary);
    }

    .progress-bar {
      height: 8px;
      border-radius: 4px;
      background: var(--shop-border);
      overflow: hidden;
      margin-top: 6px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background-color 0.3s ease;
    }

    .progress-fill.ok { background: var(--shop-success); }
    .progress-fill.warn { background: var(--shop-warn); }
    .progress-fill.over { background: var(--shop-over); }

    .percent-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--shop-secondary);
      margin-top: 4px;
      text-align: right;
    }

    /* ── Completed section ───────────────────────────────────────── */

    .completed-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      padding: 8px 4px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--shop-secondary);
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .completed-header:hover {
      color: var(--shop-text);
    }

    .completed-count {
      font-weight: 400;
      color: var(--shop-done);
    }

    .completed-items .item-title {
      text-decoration: line-through;
      color: var(--shop-done);
    }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--shop-secondary);
      font-size: 14px;
    }

    .show-more-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border: 1px solid var(--shop-border);
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

    /* ── Preset quick-add ──────────────────────────────────────── */

    .presets-section {
      margin-bottom: 16px;
    }

    .presets-category {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--shop-secondary);
      margin: 12px 0 6px;
    }

    .presets-category:first-child {
      margin-top: 0;
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
      border: 1px solid var(--shop-border);
      background: var(--shop-bg);
      color: var(--shop-text);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }

    .preset-chip:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--shop-accent);
    }

    .preset-chip:active {
      background: var(--shop-accent);
      color: #fff;
      border-color: var(--shop-accent);
    }

    .preset-chip ha-icon,
    .preset-chip ha-svg-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }

    .preset-icon {
      width: 16px;
      height: 16px;
      fill: currentColor;
      flex-shrink: 0;
    }

    /* ── Preset management ────────────────────────────────────── */

    .preset-chip-wrapper {
      position: relative;
      display: inline-flex;
    }

    .preset-delete-btn {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid var(--shop-border);
      background: var(--card-background-color, #fff);
      color: var(--shop-secondary);
      font-size: 10px;
      line-height: 1;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 1;
      transition: background 0.15s, color 0.15s;
    }

    .preset-chip-wrapper:hover .preset-delete-btn {
      display: flex;
    }

    .preset-delete-btn:hover {
      background: var(--error-color, #f44336);
      border-color: var(--error-color, #f44336);
      color: #fff;
    }

    .preset-add-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px dashed var(--shop-border);
      background: transparent;
      color: var(--shop-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      font-family: inherit;
    }

    .preset-add-chip:hover {
      border-color: var(--shop-accent);
      color: var(--shop-accent);
      background: color-mix(in srgb, var(--shop-accent) 8%, transparent);
    }

    .preset-form {
      margin: 12px 0;
      padding: 16px;
      border: 1px solid var(--shop-border);
      border-radius: 12px;
      background: var(--card-background-color, #fff);
    }

    .preset-form-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--shop-text);
      margin: 0 0 12px;
    }

    .preset-form-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      align-items: center;
    }

    .preset-form-row label {
      font-size: 12px;
      font-weight: 500;
      color: var(--shop-secondary);
      width: 60px;
      flex-shrink: 0;
    }

    .preset-emoji-input {
      width: 48px;
      font-size: 20px;
      text-align: center;
      padding: 4px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      outline: none;
      font-family: inherit;
    }

    .preset-emoji-input:focus {
      border-color: var(--shop-accent);
    }

    .preset-text-input {
      flex: 1;
      font-size: 14px;
      padding: 6px 10px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      font-family: inherit;
    }

    .preset-text-input:focus {
      border-color: var(--shop-accent);
    }

    .preset-form select {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--shop-border);
      border-radius: 8px;
      background: var(--shop-bg);
      color: var(--shop-text);
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }

    .preset-form select:focus {
      border-color: var(--shop-accent);
    }

    .emoji-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }

    .emoji-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--shop-border);
      border-radius: 6px;
      background: transparent;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
      padding: 0;
    }

    .emoji-btn:hover {
      background: var(--secondary-background-color, #f5f5f5);
      border-color: var(--shop-accent);
    }

    .emoji-btn[active] {
      background: color-mix(in srgb, var(--shop-accent) 15%, transparent);
      border-color: var(--shop-accent);
    }

    .preset-form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .preset-form-btn {
      font-size: 13px;
      font-weight: 500;
      padding: 6px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
    }

    .preset-form-btn:hover {
      opacity: 0.9;
    }

    .preset-form-btn-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
    }

    .preset-form-btn-add {
      background: var(--shop-accent);
      color: #fff;
    }

    .preset-form-btn-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

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
      color: var(--shop-text);
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
      transition: opacity 0.15s;
    }

    .confirm-delete-actions button:hover {
      opacity: 0.9;
    }

    .confirm-delete-cancel {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
    }

    .confirm-delete-confirm {
      background: var(--error-color, #f44336);
      color: #fff;
    }

    /* ── Swipe delete confirmation (separate from preset delete) ── */

    .swipe-confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .swipe-confirm-dialog {
      background: var(--card-background-color, #fff);
      border-radius: 12px;
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .swipe-confirm-dialog p {
      font-size: 14px;
      color: var(--shop-text);
      margin: 0 0 16px;
    }

    .swipe-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .swipe-confirm-actions button {
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s;
    }

    .swipe-confirm-actions button:hover {
      opacity: 0.9;
    }

    .swipe-cancel-btn {
      background: var(--secondary-background-color, #f0f0f0);
      color: var(--shop-text);
    }

    .swipe-delete-btn {
      background: var(--error-color, #f44336);
      color: #fff;
    }
  `];

  /* ── Computed ────────────────────────────────────────────────────── */

  /** All non-deleted, non-completed tasks. */
  private get _pending(): PlannerTask[] {
    return this.tasks.filter((t) => !t.completed && !t.deleted_at);
  }

  /** All non-deleted, completed tasks. */
  private get _completed(): PlannerTask[] {
    return this.tasks.filter((t) => t.completed && !t.deleted_at);
  }

  /** Recurring "always" items that are pending. */
  private get _alwaysItems(): PlannerTask[] {
    return this._pending.filter((t) => t.is_recurring);
  }

  /** Non-recurring pending items grouped by category. */
  private get _groupedPending(): Map<string, PlannerTask[]> {
    const groups = new Map<string, PlannerTask[]>();
    for (const t of this._pending) {
      if (t.is_recurring) continue; // shown in "Always" section
      const cat = t.category || "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(t);
    }
    // Sort categories by predefined order
    const sorted = new Map<string, PlannerTask[]>();
    const keys = Array.from(groups.keys()).sort(
      (a, b) => categorySortKey(a) - categorySortKey(b),
    );
    for (const k of keys) {
      sorted.set(k, groups.get(k)!);
    }
    return sorted;
  }

  /** Total price of all pending items that have a price. */
  private get _totalPrice(): number {
    return this._pending.reduce((sum, t) => sum + (t.price ?? 0), 0);
  }

  /** Group presets by category for rendering. */
  private get _groupedPresets(): Map<string, TaskPreset[]> {
    const groups = new Map<string, TaskPreset[]>();
    for (const p of this.presets) {
      const cat = p.category || "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return groups;
  }

  /** Available categories for the dropdown (built-in + custom from tasks + saved). */
  private get _categoryOptions(): string[] {
    const cats = new Set<string>();
    // Add categories from existing tasks
    for (const t of this.tasks) {
      if (t.category) cats.add(t.category);
    }
    // Add built-in defaults
    for (const key of CATEGORY_ORDER) {
      cats.add(key);
    }
    // Add custom categories saved in localStorage
    try {
      const raw = localStorage.getItem("calee-custom-categories");
      if (raw) {
        const custom: string[] = JSON.parse(raw);
        for (const c of custom) {
          if (c) cats.add(c);
        }
      }
    } catch {
      // ignore
    }
    return Array.from(cats).sort(
      (a, b) => categorySortKey(a) - categorySortKey(b),
    );
  }

  /* ── Events ─────────────────────────────────────────────────────── */

  private _completeItem(task: PlannerTask): void {
    this.dispatchEvent(
      new CustomEvent("task-complete", {
        detail: { taskId: task.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _uncompleteItem(task: PlannerTask): void {
    this.dispatchEvent(
      new CustomEvent("task-uncomplete", {
        detail: { taskId: task.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onInput(e: Event): void {
    this._quickAddText = (e.target as HTMLInputElement).value;
  }

  private _onCategoryChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    if (val === "__new__") {
      this._showCustomCategoryInput = true;
      this._customCategoryText = "";
      // Reset the dropdown to show "Category" placeholder
      (e.target as HTMLSelectElement).value = "";
      this._selectedCategory = "";
    } else {
      this._selectedCategory = val;
      this._showCustomCategoryInput = false;
    }
  }

  private _onCustomCategoryInput(e: Event): void {
    this._customCategoryText = (e.target as HTMLInputElement).value;
  }

  private _onCustomCategoryKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      this._commitCustomCategory();
    } else if (e.key === "Escape") {
      this._showCustomCategoryInput = false;
      this._customCategoryText = "";
    }
  }

  private _commitCustomCategory(): void {
    const name = this._customCategoryText.trim().toLowerCase();
    if (!name) {
      this._showCustomCategoryInput = false;
      return;
    }
    // Save custom category to localStorage
    try {
      const raw = localStorage.getItem("calee-custom-categories");
      const existing: string[] = raw ? JSON.parse(raw) : [];
      if (!existing.includes(name)) {
        existing.push(name);
        localStorage.setItem("calee-custom-categories", JSON.stringify(existing));
      }
    } catch {
      // ignore
    }
    this._selectedCategory = name;
    this._showCustomCategoryInput = false;
    this._customCategoryText = "";
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

  private _openPresetForm(category: string): void {
    this._showPresetForm = true;
    this._presetFormCategory = category;
    this._presetFormTitle = "";
    this._presetFormEmoji = "";
  }

  private _closePresetForm(): void {
    this._showPresetForm = false;
    this._presetFormCategory = "";
    this._presetFormTitle = "";
    this._presetFormEmoji = "";
  }

  private _submitPresetForm(): void {
    const title = this._presetFormTitle.trim();
    if (!title) return;

    const icon = this._presetFormEmoji || "";
    const category = this._presetFormCategory || "other";

    this.dispatchEvent(
      new CustomEvent("preset-create", {
        detail: {
          title,
          category,
          icon,
          list_id: this.listId,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this._closePresetForm();
  }

  private _requestDeletePreset(presetId: string): void {
    this._confirmDeletePresetId = presetId;
  }

  private _confirmDeletePreset(): void {
    if (!this._confirmDeletePresetId) return;
    this.dispatchEvent(
      new CustomEvent("preset-delete", {
        detail: { presetId: this._confirmDeletePresetId },
        bubbles: true,
        composed: true,
      }),
    );
    this._confirmDeletePresetId = null;
  }

  private _cancelDeletePreset(): void {
    this._confirmDeletePresetId = null;
  }

  private _onQuickAddKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && this._quickAddText.trim()) {
      let title = this._quickAddText.trim();
      let category = this._selectedCategory;

      // Support "Category: Item" prefix syntax — match built-in + custom categories
      const colonIdx = title.indexOf(":");
      if (colonIdx > 0 && colonIdx < 20) {
        const prefix = title.slice(0, colonIdx).trim().toLowerCase();
        const allCats = this._categoryOptions;
        if (CATEGORY_ORDER.includes(prefix) || Object.keys(CATEGORY_META).includes(prefix) || allCats.includes(prefix)) {
          category = prefix;
          title = title.slice(colonIdx + 1).trim();
        }
      }

      if (!title) return;

      this.dispatchEvent(
        new CustomEvent("task-quick-add", {
          detail: { title, category },
          bubbles: true,
          composed: true,
        }),
      );
      this._quickAddText = "";
      this._inputEl.value = "";
    }
  }

  private _onPriceChange(task: PlannerTask, e: Event): void {
    const input = e.target as HTMLInputElement;
    const raw = input.value.trim();
    const price = raw ? parseFloat(raw) : null;

    if (price !== null && isNaN(price)) return;

    this.dispatchEvent(
      new CustomEvent("task-price-update", {
        detail: { taskId: task.id, price, version: task.version },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _toggleSection(key: string): void {
    const next = new Set(this._collapsedSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this._collapsedSections = next;
  }

  private _showMorePending(): void {
    this._pendingRenderLimit += 100;
  }

  /* ── Swipe handlers (mobile) ───────────────────────────────────── */

  private _onTouchStart(e: TouchEvent, itemId: string): void {
    handleTouchStart(this._swipe, e, itemId);
  }

  private _onTouchMove(e: TouchEvent): void {
    handleTouchMove(this._swipe, e);
    this.requestUpdate();
  }

  private _onTouchEnd(_e: TouchEvent): void {
    const result = handleTouchEnd(this._swipe);
    this.requestUpdate();
    if (!result.action) return;

    if (result.action === "complete") {
      const task = this.tasks.find((t) => t.id === result.itemId);
      if (task) {
        if (task.completed) {
          this._uncompleteItem(task);
        } else {
          this._completeItem(task);
        }
      }
    } else if (result.action === "delete") {
      this._confirmSwipeDeleteId = result.itemId;
    }
  }

  private _confirmSwipeDelete(): void {
    if (!this._confirmSwipeDeleteId) return;
    this.dispatchEvent(
      new CustomEvent("task-delete", {
        detail: { taskId: this._confirmSwipeDeleteId },
        bubbles: true,
        composed: true,
      }),
    );
    this._confirmSwipeDeleteId = null;
  }

  private _cancelSwipeDelete(): void {
    this._confirmSwipeDeleteId = null;
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  render() {
    const pending = this._pending;
    const completed = this._completed;
    const alwaysItems = this._alwaysItems;
    const grouped = this._groupedPending;

    return html`
      <!-- Quick-add bar -->
      <div class="quick-add">
        <input
          id="quick-add-input"
          type="text"
          placeholder="Add an item..."
          .value=${this._quickAddText}
          @input=${this._onInput}
          @keydown=${this._onQuickAddKeydown}
        />
        <select
          @change=${this._onCategoryChange}
          .value=${this._selectedCategory}
          title="Category"
        >
          <option value="">Category</option>
          ${this._categoryOptions.map(
            (cat) => html`
              <option value=${cat} ?selected=${this._selectedCategory === cat}>
                ${categoryLabel(cat)}
              </option>
            `,
          )}
          <option value="__new__">+ New category</option>
        </select>
      </div>
      ${this._showCustomCategoryInput
        ? html`
            <div class="custom-category-row">
              <input
                type="text"
                class="custom-category-input"
                placeholder="Category name..."
                .value=${this._customCategoryText}
                @input=${this._onCustomCategoryInput}
                @keydown=${this._onCustomCategoryKeydown}
                autofocus
              />
              <button class="custom-category-ok" @click=${this._commitCustomCategory}>Add</button>
              <button class="custom-category-cancel" @click=${() => {
                this._showCustomCategoryInput = false;
                this._customCategoryText = "";
              }}>Cancel</button>
            </div>
          `
        : nothing}

      <!-- Presets -->
      <div class="presets-section">
        ${this.presets.length > 0
          ? Array.from(this._groupedPresets.entries()).map(
              ([category, presets]) => html`
                <div class="presets-category">${category}</div>
                <div class="presets-grid">
                  ${presets.map(
                    (p) => html`
                      <div class="preset-chip-wrapper">
                        <button
                          class="preset-chip"
                          @click=${() => this._onPresetClick(p)}
                          title="Add ${p.title}"
                        >
                          ${p.icon
                            ? p.icon.startsWith("mdi:")
                              ? html`<ha-icon .icon=${p.icon}></ha-icon>`
                              : html`<span>${p.icon}</span>`
                            : nothing}
                          ${p.title}
                        </button>
                        <button
                          class="preset-delete-btn"
                          @click=${(e: Event) => {
                            e.stopPropagation();
                            this._requestDeletePreset(p.id);
                          }}
                          title="Remove preset"
                        >
                          \u2715
                        </button>
                      </div>
                    `,
                  )}
                  <button
                    class="preset-add-chip"
                    @click=${() => this._openPresetForm(category)}
                    title="Add a preset to ${category}"
                  >
                    + Add
                  </button>
                </div>
              `,
            )
          : nothing}
        ${this.presets.length === 0
          ? html`
              <div class="presets-grid">
                <button
                  class="preset-add-chip"
                  @click=${() => this._openPresetForm("groceries")}
                  title="Add a preset"
                >
                  + Add preset
                </button>
              </div>
            `
          : nothing}
      </div>

      <!-- Preset add form -->
      ${this._showPresetForm ? this._renderPresetForm() : nothing}

      <!-- Swipe delete confirmation -->
      ${this._confirmSwipeDeleteId
        ? html`
            <div
              class="swipe-confirm-overlay"
              @click=${(e: Event) => {
                if ((e.target as HTMLElement).classList.contains("swipe-confirm-overlay")) {
                  this._cancelSwipeDelete();
                }
              }}
            >
              <div class="swipe-confirm-dialog">
                <p>Delete this item?</p>
                <div class="swipe-confirm-actions">
                  <button class="swipe-cancel-btn" @click=${this._cancelSwipeDelete}>Cancel</button>
                  <button class="swipe-delete-btn" @click=${this._confirmSwipeDelete}>Delete</button>
                </div>
              </div>
            </div>
          `
        : nothing}

      <!-- Delete confirmation -->
      ${this._confirmDeletePresetId
        ? html`
            <div
              class="confirm-delete-overlay"
              @click=${(e: Event) => {
                if ((e.target as HTMLElement).classList.contains("confirm-delete-overlay")) {
                  this._cancelDeletePreset();
                }
              }}
            >
              <div class="confirm-delete-dialog">
                <p>Remove this preset?</p>
                <div class="confirm-delete-actions">
                  <button class="confirm-delete-cancel" @click=${this._cancelDeletePreset}>
                    Cancel
                  </button>
                  <button class="confirm-delete-confirm" @click=${this._confirmDeletePreset}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          `
        : nothing}

      <!-- Empty state -->
      ${pending.length === 0 && completed.length === 0
        ? html`<div class="empty">Shopping list is empty</div>`
        : nothing}

      <!-- Always / recurring items -->
      ${alwaysItems.length > 0
        ? this._renderSection(
            "always",
            "\uD83D\uDD04",
            "Always",
            alwaysItems,
          )
        : nothing}

      <!-- Category groups (capped to _pendingRenderLimit total items) -->
      ${(() => {
        let remaining = this._pendingRenderLimit - alwaysItems.length;
        return Array.from(grouped.entries()).map(([cat, items]) => {
          if (remaining <= 0) return nothing;
          const visible = items.slice(0, remaining);
          remaining -= visible.length;
          return this._renderSection(
            cat,
            categoryIcon(cat),
            categoryLabel(cat),
            visible,
          );
        });
      })()}

      ${pending.length > this._pendingRenderLimit
        ? html`
            <button
              class="show-more-btn"
              @click=${this._showMorePending}
            >
              Show more (${pending.length - this._pendingRenderLimit} remaining)
            </button>
          `
        : nothing}

      <!-- Budget / totals -->
      ${this._renderTotals()}

      <!-- Completed section -->
      ${completed.length > 0
        ? html`
            <button
              class="completed-header"
              @click=${() => (this._completedOpen = !this._completedOpen)}
            >
              <svg
                class="chevron ${this._completedOpen ? "open" : ""}"
                viewBox="0 0 24 24"
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
              Completed
              <span class="completed-count">(${completed.length})</span>
            </button>

            ${this._completedOpen
              ? html`
                  <ul class="item-list completed-items">
                    ${completed.slice(0, this._pendingRenderLimit).map((t) => this._renderItem(t, true))}
                  </ul>
                  ${completed.length > this._pendingRenderLimit
                    ? html`
                        <button
                          class="show-more-btn"
                          @click=${this._showMorePending}
                        >
                          Show more completed (${completed.length - this._pendingRenderLimit} remaining)
                        </button>
                      `
                    : nothing}
                `
              : nothing}
          `
        : nothing}
    `;
  }

  private _renderPresetForm() {
    const COMMON_EMOJI = [
      "\uD83E\uDD5B", "\uD83C\uDF5E", "\uD83E\uDD5A", "\uD83C\uDF57", "\uD83C\uDF4E", "\uD83E\uDD66",
      "\uD83E\uDDC0", "\uD83E\uDD69", "\uD83C\uDF55", "\uD83C\uDF54", "\uD83C\uDF2E", "\uD83C\uDF63",
      "\uD83E\uDDC3", "\uD83E\uDD64", "\u2615", "\uD83E\uDDF9", "\uD83E\uDDF4", "\uD83E\uDDFC",
      "\uD83E\uDDBD", "\uD83E\uDEA5",
    ];

    return html`
      <div class="preset-form">
        <div class="preset-form-title">New Preset</div>

        <div class="emoji-grid">
          ${COMMON_EMOJI.map(
            (emoji) => html`
              <button
                type="button"
                class="emoji-btn"
                ?active=${this._presetFormEmoji === emoji}
                @click=${() => (this._presetFormEmoji = emoji)}
              >
                ${emoji}
              </button>
            `,
          )}
        </div>

        <div class="preset-form-row">
          <label>Emoji</label>
          <input
            type="text"
            class="preset-emoji-input"
            maxlength="2"
            .value=${this._presetFormEmoji}
            @input=${(e: Event) =>
              (this._presetFormEmoji = (e.target as HTMLInputElement).value)}
            placeholder="\uD83D\uDED2"
          />
        </div>

        <div class="preset-form-row">
          <label>Title</label>
          <input
            type="text"
            class="preset-text-input"
            .value=${this._presetFormTitle}
            @input=${(e: Event) =>
              (this._presetFormTitle = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") this._submitPresetForm();
              if (e.key === "Escape") this._closePresetForm();
            }}
            placeholder="Item name"
            autofocus
          />
        </div>

        <div class="preset-form-row">
          <label>Category</label>
          <select
            .value=${this._presetFormCategory}
            @change=${(e: Event) =>
              (this._presetFormCategory = (e.target as HTMLSelectElement).value)}
          >
            ${this._categoryOptions.map(
              (cat) => html`
                <option value=${cat} ?selected=${this._presetFormCategory === cat}>
                  ${categoryLabel(cat)}
                </option>
              `,
            )}
          </select>
        </div>

        <div class="preset-form-actions">
          <button
            class="preset-form-btn preset-form-btn-cancel"
            @click=${this._closePresetForm}
          >
            Cancel
          </button>
          <button
            class="preset-form-btn preset-form-btn-add"
            ?disabled=${!this._presetFormTitle.trim()}
            @click=${this._submitPresetForm}
          >
            Add
          </button>
        </div>
      </div>
    `;
  }

  private _renderSection(
    key: string,
    icon: string,
    label: string,
    items: PlannerTask[],
  ) {
    const collapsed = this._collapsedSections.has(key);
    return html`
      <div class="section">
        <button
          class="section-header"
          @click=${() => this._toggleSection(key)}
        >
          <svg
            class="chevron ${collapsed ? "" : "open"}"
            viewBox="0 0 24 24"
          >
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
          <span class="section-icon">${icon}</span>
          <span class="section-label">${label}</span>
          <span class="section-count">(${items.length})</span>
        </button>
        ${collapsed
          ? nothing
          : html`
              <ul class="item-list">
                ${items.map((t) => this._renderItem(t, false))}
              </ul>
            `}
      </div>
    `;
  }

  private _renderItem(task: PlannerTask, done: boolean) {
    const delta = getSwipeDelta(this._swipe, task.id);
    const isSwiping = this._swipe.swipingId === task.id;

    return html`
      <li class="swipe-row-wrapper ${isSwiping ? "swiping" : ""}">
        <div class="swipe-action-complete" aria-hidden="true">&#10003;</div>
        <div class="swipe-action-delete" aria-hidden="true">&#128465;</div>

        <div
          class="swipe-row-inner item ${isSwiping ? "dragging" : ""}"
          style="transform: translateX(${delta}px)"
          @touchstart=${(e: TouchEvent) => this._onTouchStart(e, task.id)}
          @touchmove=${(e: TouchEvent) => this._onTouchMove(e)}
          @touchend=${(e: TouchEvent) => this._onTouchEnd(e)}
        >
          <button
            class="checkbox ${done ? "checked" : ""}"
            aria-label="${done ? "Undo" : "Complete"} item"
            @click=${() => (done ? this._uncompleteItem(task) : this._completeItem(task))}
          >
            <svg viewBox="0 0 16 16">
              <polyline points="3.5,8 6.5,11 12.5,5" />
            </svg>
          </button>
          ${task.is_recurring && !done
            ? html`<span class="recurring-badge" title="Recurring item">\uD83D\uDD04</span>`
            : nothing}
          <span class="item-title">${task.title}</span>
          ${!done
            ? html`
                <span class="item-price">
                  <input
                    type="text"
                    inputmode="decimal"
                    placeholder="${this.currency}"
                    .value=${task.price != null ? task.price.toFixed(2) : ""}
                    @change=${(e: Event) => this._onPriceChange(task, e)}
                    aria-label="Price"
                  />
                </span>
              `
            : nothing}
        </div>
      </li>
    `;
  }

  private _renderTotals() {
    const total = this._totalPrice;
    const hasBudget = this.budget > 0;
    const hasAnyPrice = this._pending.some((t) => t.price != null && t.price > 0);

    if (!hasAnyPrice && !hasBudget) return nothing;

    const percent = hasBudget ? Math.round((total / this.budget) * 100) : 0;
    const progressClass = percent <= 75 ? "ok" : percent <= 100 ? "warn" : "over";
    const clampedPercent = Math.min(percent, 100);

    return html`
      <div class="totals">
        <div class="total-line">
          <span>Total</span>
          <span>
            ${this.currency}${total.toFixed(2)}
            ${hasBudget
              ? html` <span class="budget-text">/ ${this.currency}${this.budget.toFixed(2)} budget</span>`
              : nothing}
          </span>
        </div>
        ${hasBudget
          ? html`
              <div class="progress-bar">
                <div
                  class="progress-fill ${progressClass}"
                  style="width: ${clampedPercent}%"
                ></div>
              </div>
              <div class="percent-label">${percent}%</div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-shopping-view": CaleeShoppingView;
  }
}
