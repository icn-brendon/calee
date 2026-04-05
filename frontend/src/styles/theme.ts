/**
 * Calendar-specific theme constants and responsive breakpoints.
 *
 * All sizing values live here so views reference a single source of
 * truth and breakpoint changes propagate everywhere at once.
 */

import { css } from "lit";

// ── Calendar grid dimensions ─────────────────────────────────────────

/** Minimum cell height in the month grid (px). */
export const MONTH_CELL_MIN_HEIGHT = 100;

/** Header bar height containing the date navigation + view switcher (px). */
export const HEADER_HEIGHT = 56;

/** Height of a single 30-minute time slot in week/day views (px). */
export const TIME_SLOT_HEIGHT = 48;

/** Width of the time gutter (hour labels) in week/day views (px). */
export const TIME_GUTTER_WIDTH = 60;

/** Height of the all-day row in week/day views (px). */
export const ALL_DAY_ROW_HEIGHT = 32;

// ── Responsive breakpoints ───────────────────────────────────────────

/** Max width considered "mobile" (portrait phone). */
export const BREAKPOINT_MOBILE = 600;

/** Max width considered "tablet" (landscape phone / small tablet). */
export const BREAKPOINT_TABLET = 1024;

// ── Calendar theme CSS ───────────────────────────────────────────────

export const calendarThemeStyles = css`
  :host {
    /* Surface & background */
    --planner-surface: var(--card-background-color, #fff);
    --planner-background: var(--primary-background-color, #fafafa);

    /* Text */
    --planner-text-primary: var(--primary-text-color, #212121);
    --planner-text-secondary: var(--secondary-text-color, #727272);
    --planner-text-disabled: var(--disabled-text-color, #bdbdbd);

    /* Accent */
    --planner-accent: var(--primary-color, #03a9f4);
    --planner-accent-text: var(--text-primary-color, #fff);

    /* Borders & dividers */
    --planner-divider: var(--divider-color, rgba(0, 0, 0, 0.12));
    --planner-border-radius: var(--ha-card-border-radius, 12px);

    /* Calendar grid */
    --planner-cell-min-height: ${MONTH_CELL_MIN_HEIGHT}px;
    --planner-header-height: ${HEADER_HEIGHT}px;
    --planner-time-slot-height: ${TIME_SLOT_HEIGHT}px;
    --planner-time-gutter-width: ${TIME_GUTTER_WIDTH}px;
    --planner-all-day-row-height: ${ALL_DAY_ROW_HEIGHT}px;

    /* Today highlight */
    --planner-today-bg: var(--primary-color, #03a9f4);
    --planner-today-text: var(--text-primary-color, #fff);

    /* Event chip */
    --planner-event-radius: 4px;
    --planner-event-padding: 2px 6px;

    /* Sidebar / navigation */
    --planner-nav-width: 280px;
  }
`;

// ── Responsive mixins as plain CSS ───────────────────────────────────

export const responsiveStyles = css`
  /* Mobile: single-column, compact spacing */
  @media (max-width: ${BREAKPOINT_MOBILE}px) {
    :host {
      --planner-cell-min-height: 60px;
      --planner-time-slot-height: 36px;
      --planner-header-height: 48px;
      --planner-nav-width: 100%;
    }
  }

  /* Tablet: slightly reduced density */
  @media (min-width: ${BREAKPOINT_MOBILE + 1}px) and (max-width: ${BREAKPOINT_TABLET}px) {
    :host {
      --planner-cell-min-height: 80px;
      --planner-time-slot-height: 40px;
    }
  }
`;
