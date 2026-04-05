/**
 * Shared LitElement CSS for the Calee panel.
 *
 * Uses Home Assistant CSS custom properties so colours, fonts, and
 * spacing adapt to the user's chosen HA theme automatically.
 */

import { css } from "lit";

// ── Card styles ──────────────────────────────────────────────────────

export const cardStyles = css`
  .card {
    background: var(--card-background-color, #fff);
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(
      --ha-card-box-shadow,
      0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12),
      0 3px 1px -2px rgba(0, 0, 0, 0.2)
    );
    padding: 16px;
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
    margin-bottom: 12px;
  }

  .card-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }
`;

// ── Typography ───────────────────────────────────────────────────────

export const typographyStyles = css`
  h1,
  h2,
  h3,
  h4 {
    color: var(--primary-text-color, #212121);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    margin: 0;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 500;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 500;
  }

  h3 {
    font-size: 1rem;
    font-weight: 500;
  }

  p {
    color: var(--primary-text-color, #212121);
    line-height: 1.5;
    margin: 0 0 8px;
  }

  .secondary-text {
    color: var(--secondary-text-color, #727272);
    font-size: 0.875rem;
  }

  .disabled-text {
    color: var(--disabled-text-color, #bdbdbd);
  }
`;

// ── Spacing ──────────────────────────────────────────────────────────

export const spacingStyles = css`
  .gap-4 {
    gap: 4px;
  }
  .gap-8 {
    gap: 8px;
  }
  .gap-12 {
    gap: 12px;
  }
  .gap-16 {
    gap: 16px;
  }

  .p-8 {
    padding: 8px;
  }
  .p-12 {
    padding: 12px;
  }
  .p-16 {
    padding: 16px;
  }

  .m-0 {
    margin: 0;
  }
  .mb-8 {
    margin-bottom: 8px;
  }
  .mb-16 {
    margin-bottom: 16px;
  }
`;

// ── Layout helpers ───────────────────────────────────────────────────

export const layoutStyles = css`
  .flex {
    display: flex;
  }

  .flex-col {
    display: flex;
    flex-direction: column;
  }

  .flex-row {
    display: flex;
    flex-direction: row;
  }

  .flex-wrap {
    flex-wrap: wrap;
  }

  .flex-1 {
    flex: 1;
  }

  .items-center {
    align-items: center;
  }

  .justify-center {
    justify-content: center;
  }

  .justify-between {
    justify-content: space-between;
  }

  .justify-end {
    justify-content: flex-end;
  }

  .text-center {
    text-align: center;
  }
`;

// ── Transitions ──────────────────────────────────────────────────────

export const transitionStyles = css`
  .transition {
    transition: all 0.2s ease-in-out;
  }

  .transition-colors {
    transition:
      color 0.2s ease-in-out,
      background-color 0.2s ease-in-out,
      border-color 0.2s ease-in-out;
  }

  .transition-opacity {
    transition: opacity 0.2s ease-in-out;
  }

  .transition-transform {
    transition: transform 0.2s ease-in-out;
  }

  .fade-in {
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

// ── Buttons & interactive elements ───────────────────────────────────

export const buttonStyles = css`
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    transition:
      background-color 0.2s ease-in-out,
      opacity 0.2s ease-in-out;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .btn:active {
    opacity: 0.8;
  }

  .btn-primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  .btn-secondary {
    background: transparent;
    color: var(--primary-color, #03a9f4);
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  }

  .btn-secondary:hover {
    background: var(--secondary-background-color, #e5e5e5);
  }

  .btn-icon {
    padding: 8px;
    border-radius: 50%;
    background: transparent;
    color: var(--secondary-text-color, #727272);
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
  }

  .btn-icon:hover {
    background: var(--secondary-background-color, #e5e5e5);
  }
`;

// ── Scrollbar ────────────────────────────────────────────────────────

export const scrollStyles = css`
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.2))
      transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.2));
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
`;

// ── Aggregate export ─────────────────────────────────────────────────

export const sharedStyles = [
  cardStyles,
  typographyStyles,
  spacingStyles,
  layoutStyles,
  transitionStyles,
  buttonStyles,
  scrollStyles,
];
