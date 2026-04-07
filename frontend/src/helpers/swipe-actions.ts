/**
 * Shared swipe-action helpers for task and shopping item rows (mobile).
 *
 * Provides touch gesture tracking and CSS for left/right swipe reveals:
 *  - Left swipe (negative deltaX) -> Complete (green)
 *  - Right swipe (positive deltaX) -> Delete (red, with confirmation)
 *
 * Usage: call the helper functions from touchstart/touchmove/touchend
 * handlers on each row element. CSS classes are exported as a Lit `css`
 * tagged template for inclusion in the component's static styles.
 */

import { css } from "lit";

/* ── Threshold ───────────────────────────────────────────────────────── */

/** Minimum horizontal distance (px) to trigger an action. */
export const SWIPE_THRESHOLD = 80;

/* ── CSS ─────────────────────────────────────────────────────────────── */

export const swipeStyles = css`
  .swipe-row-wrapper {
    position: relative;
    overflow: hidden;
  }

  .swipe-action-complete {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 80px;
    background: #4caf50;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 22px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .swipe-action-delete {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 80px;
    background: #f44336;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 22px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .swipe-row-wrapper.swiping .swipe-action-complete,
  .swipe-row-wrapper.swiping .swipe-action-delete {
    opacity: 1;
  }

  .swipe-row-inner {
    position: relative;
    z-index: 1;
    background: var(--card-background-color, #fff);
    transition: transform 0.2s ease;
  }

  .swipe-row-inner.dragging {
    transition: none;
  }
`;

/* ── State interface ─────────────────────────────────────────────────── */

export interface SwipeState {
  touchStartX: number;
  touchStartY: number;
  touchCurrentX: number;
  swipingId: string | null;
  /** Whether horizontal intent has been confirmed (prevents vertical scroll hijack). */
  directionLocked: boolean;
}

export function createSwipeState(): SwipeState {
  return {
    touchStartX: 0,
    touchStartY: 0,
    touchCurrentX: 0,
    swipingId: null,
    directionLocked: false,
  };
}

/* ── Handlers ────────────────────────────────────────────────────────── */

export function handleTouchStart(
  state: SwipeState,
  e: TouchEvent,
  itemId: string,
): void {
  state.touchStartX = e.touches[0].clientX;
  state.touchStartY = e.touches[0].clientY;
  state.touchCurrentX = e.touches[0].clientX;
  state.swipingId = itemId;
  state.directionLocked = false;
}

/**
 * Returns the current deltaX (negative = left swipe, positive = right swipe).
 * The caller should call `requestUpdate()` after this to re-render.
 */
export function handleTouchMove(
  state: SwipeState,
  e: TouchEvent,
): number {
  if (!state.swipingId) return 0;

  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;

  if (!state.directionLocked) {
    const dx = Math.abs(currentX - state.touchStartX);
    const dy = Math.abs(currentY - state.touchStartY);
    // Need at least 8px movement to decide direction
    if (dx < 8 && dy < 8) return 0;
    if (dy > dx) {
      // Vertical scroll — abort swipe
      state.swipingId = null;
      return 0;
    }
    state.directionLocked = true;
  }

  // Prevent vertical scroll once swiping horizontally
  e.preventDefault();
  state.touchCurrentX = currentX;
  return currentX - state.touchStartX;
}

export interface SwipeResult {
  action: "complete" | "delete" | null;
  itemId: string;
}

/**
 * Returns what action (if any) was triggered, or null if the swipe
 * didn't cross the threshold. Resets swipe state.
 */
export function handleTouchEnd(state: SwipeState): SwipeResult {
  const id = state.swipingId;
  if (!id) return { action: null, itemId: "" };

  const delta = state.touchCurrentX - state.touchStartX;
  state.swipingId = null;
  state.touchStartX = 0;
  state.touchCurrentX = 0;
  state.directionLocked = false;

  if (delta < -SWIPE_THRESHOLD) {
    return { action: "complete", itemId: id };
  }
  if (delta > SWIPE_THRESHOLD) {
    return { action: "delete", itemId: id };
  }
  return { action: null, itemId: id };
}

/** Get the current translateX value for the swiping row. */
export function getSwipeDelta(state: SwipeState, itemId: string): number {
  if (state.swipingId !== itemId) return 0;
  return state.touchCurrentX - state.touchStartX;
}
