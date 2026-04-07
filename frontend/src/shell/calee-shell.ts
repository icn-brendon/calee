import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

type ShellSection = "home" | "calendar" | "tasks" | "shopping" | "more";

@customElement("calee-shell")
export class CaleeShell extends LitElement {
  @property({ type: String }) section: ShellSection = "home";
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property({ type: Boolean, reflect: true }) collapsed = false;

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
      width: var(--shell-rail-width, 72px);
      min-width: var(--shell-rail-width, 72px);
    }

    .rail {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color, #e0e0e0);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #03a9f4) 7%, transparent), transparent 24%),
        var(--sidebar-background-color, var(--card-background-color, #fff));
      transition: width 0.2s ease, min-width 0.2s ease, transform 0.25s ease;
      box-sizing: border-box;
      overflow: hidden;
    }

    :host([collapsed]) {
      width: 72px;
      min-width: 72px;
    }

    :host(:not([collapsed])) {
      width: 188px;
      min-width: 188px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px 14px;
      color: var(--primary-text-color, #212121);
    }

    .brand-mark {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 14%, transparent);
      color: var(--primary-color, #03a9f4);
      font-weight: 800;
      font-size: 14px;
      flex-shrink: 0;
    }

    .brand-copy {
      min-width: 0;
    }

    .brand-name {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.1;
    }

    .brand-sub {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }

    :host([collapsed]) .brand-copy {
      display: none;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 0;
      flex: 1;
    }

    .nav-btn {
      appearance: none;
      border: none;
      background: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font: inherit;
      text-align: left;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .nav-btn:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    .nav-btn[active] {
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
      color: var(--primary-color, #03a9f4);
    }

    .nav-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
    }

    .nav-icon svg {
      width: 20px;
      height: 20px;
    }

    .nav-label {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.1px;
    }

    .nav-hint {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      margin-top: 1px;
    }

    :host([collapsed]) .nav-label,
    :host([collapsed]) .nav-hint {
      display: none;
    }

    .spacer {
      flex: 1;
      min-height: 8px;
    }

    .rail-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }

    .rail-action {
      appearance: none;
      border: none;
      background: none;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font: inherit;
      text-align: left;
    }

    .rail-action:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color, #212121);
    }

    :host([collapsed]) .rail-action .nav-label {
      display: none;
    }

    .bottom-nav {
      display: none;
    }

    @media (max-width: 767px) {
      :host {
        width: 0;
        min-width: 0;
      }

      .rail {
        display: none;
      }

      .bottom-nav {
        display: flex;
        align-items: center;
        justify-content: space-around;
        gap: 4px;
        height: 56px;
        min-height: 56px;
        padding: 0 8px calc(env(safe-area-inset-bottom, 0px) + 0px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
        background: var(--card-background-color, #fff);
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.04);
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 20;
        box-sizing: border-box;
      }

      .bottom-btn {
        appearance: none;
        border: none;
        background: none;
        color: var(--secondary-text-color, #727272);
        cursor: pointer;
        border-radius: 12px;
        padding: 6px 8px;
        min-width: 56px;
        min-height: 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        font: inherit;
      }

      .bottom-btn[active] {
        color: var(--primary-color, #03a9f4);
      }

      .bottom-btn svg {
        width: 22px;
        height: 22px;
      }

      .bottom-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1px;
      }
    }
  `;

  private _emit(type: string, detail?: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _sectionIcon(section: ShellSection): string {
    switch (section) {
      case "home":
        return "M3 11.5L12 4l9 7.5V21H3zM9 21v-7h6v7";
      case "calendar":
        return "M7 2v3M17 2v3M3 8h18M5 5h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z";
      case "tasks":
        return "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11";
      case "shopping":
        return "M6 6h15l-2 9H8L6 6zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z";
      case "more":
        return "M12 6v.01M12 12v.01M12 18v.01";
    }
  }

  render() {
    const sections: Array<{ key: ShellSection; label: string; hint: string }> = [
      { key: "home", label: "Home", hint: "Overview" },
      { key: "calendar", label: "Calendar", hint: "Plan" },
      { key: "tasks", label: "Tasks", hint: "Do" },
      { key: "shopping", label: "Shopping", hint: "Buy" },
      { key: "more", label: "More", hint: "Tools" },
    ];

    return html`
      <nav class="rail" aria-label="Primary">
        <div class="brand">
          <div class="brand-mark">C</div>
          <div class="brand-copy">
            <div class="brand-name">Calee</div>
            <div class="brand-sub">Planner</div>
          </div>
        </div>

        <div class="nav">
          ${sections.map(
            (section) => html`
              <button
                class="nav-btn"
                ?active=${this.section === section.key}
                @click=${() => this._emit("section-change", { section: section.key })}
              >
                <span class="nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${this._sectionIcon(section.key)}"></path>
                  </svg>
                </span>
                <span>
                  <div class="nav-label">${section.label}</div>
                  <div class="nav-hint">${section.hint}</div>
                </span>
              </button>
            `,
          )}

          <div class="spacer"></div>

          <div class="rail-actions">
            <button class="rail-action" @click=${() => this._emit("add-click")}>
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
              </span>
              <span class="nav-label">Add event</span>
            </button>

            <button class="rail-action" @click=${() => this._emit("toggle-collapse")}>
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg>
              </span>
              <span class="nav-label">${this.collapsed ? "Expand rail" : "Collapse rail"}</span>
            </button>
          </div>
        </div>
      </nav>

      <nav class="bottom-nav" aria-label="Primary">
        ${sections.map(
          (section) => html`
            <button
              class="bottom-btn"
              ?active=${this.section === section.key}
              @click=${() => this._emit("section-change", { section: section.key })}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="${this._sectionIcon(section.key)}"></path>
              </svg>
              <span class="bottom-label">${section.label}</span>
            </button>
          `,
        )}
      </nav>
    `;
  }
}
