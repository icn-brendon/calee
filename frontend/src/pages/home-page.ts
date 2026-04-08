/**
 * <calee-home-page> -- Calm overview surface for the Calee panel.
 *
 * This page is intentionally simple: it summarizes the day, surfaces the next
 * few events, highlights due work, and provides quick access to shopping and
 * routines without introducing another navigation layer.
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type {
  HomeAssistant,
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  PlannerList,
  Routine,
  TaskPreset,
} from "../store/types.js";

type TaskBucket = "overdue" | "today" | "upcoming" | "later";
type HomeDestination = "calendar" | "tasks" | "shopping" | "more";

interface DatedItem {
  date: string;
  dayLabel: string;
  items: PlannerEvent[];
}

interface HeroStat {
  icon: string;
  value: string;
  label: string;
  destination: HomeDestination;
}

interface WeatherSurface {
  icon: string;
  title: string;
  subtitle: string;
}

interface ActiveEventProgress {
  event: PlannerEvent;
  progress: number;
  remainingLabel: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfDay(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime();
}

function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function isTomorrow(iso: string): boolean {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return sameDay(iso, d.toISOString());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shiftLikeText(value: string | null | undefined): boolean {
  return /\bshift\b/i.test(value ?? "");
}

function formatMinutesLabel(totalMinutes: number): string {
  if (totalMinutes <= 1) return "Ending soon";
  if (totalMinutes < 60) return `${totalMinutes}m left`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
}

function formatAmount(value: number, currency: string): string {
  const amount = Math.max(0, value);
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${currency}${text}`;
}

function calendarColor(
  calendars: Map<string, PlannerCalendar>,
  calendarId: string,
): string {
  return calendars.get(calendarId)?.color ?? "var(--primary-color, #03a9f4)";
}

function calendarName(
  calendars: Map<string, PlannerCalendar>,
  calendarId: string,
): string {
  return calendars.get(calendarId)?.name ?? calendarId;
}

function taskDueBucket(task: PlannerTask): TaskBucket {
  if (!task.due) return "later";
  const today = todayISO();
  const due = task.due.slice(0, 10);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return due <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    ? "upcoming"
    : "later";
}

function taskPriorityScore(task: PlannerTask): number {
  const bucket = taskDueBucket(task);
  if (bucket === "overdue") return 0;
  if (bucket === "today") return 1;
  if (bucket === "upcoming") return 2;
  return 3;
}

function friendlyWeatherState(state: string): string {
  return state
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function weatherIcon(state: string): string {
  const normalized = state.toLowerCase();
  if (normalized.includes("lightning") || normalized.includes("thunder")) return "⛈";
  if (normalized.includes("rain") || normalized.includes("pouring")) return "🌧";
  if (normalized.includes("snow")) return "❄";
  if (normalized.includes("fog")) return "🌫";
  if (normalized.includes("wind")) return "💨";
  if (normalized.includes("partly")) return "⛅";
  if (normalized.includes("cloud")) return "☁";
  if (normalized.includes("sun") || normalized === "clear-night" || normalized === "sunny") return "☀";
  return "⛅";
}

function weatherSurface(hass: HomeAssistant | null): WeatherSurface {
  const entities = Object.entries(hass?.states ?? {}).filter(([entityId]) => entityId.startsWith("weather."));
  const first = entities[0]?.[1];
  if (!first) {
    return {
      icon: "⛅",
      title: "No weather entity found",
      subtitle: "Add a Home Assistant weather entity to show today's forecast here.",
    };
  }

  const condition = friendlyWeatherState(first.state || "Unknown");
  const temperature = typeof first.attributes.temperature === "number"
    ? `${Math.round(first.attributes.temperature)}${String(first.attributes.temperature_unit ?? "°")}`
    : condition;

  return {
    icon: weatherIcon(first.state || ""),
    title: temperature,
    subtitle: `${condition} · Live from Home Assistant`,
  };
}

function renderPresetIcon(icon: string) {
  const trimmed = icon.trim();
  if (!trimmed) {
    return "🛒";
  }
  if (trimmed.startsWith("mdi:")) {
    return html`<ha-icon .icon=${trimmed}></ha-icon>`;
  }
  return trimmed;
}

@customElement("calee-home-page")
export class CaleeHomePage extends LitElement {
  @property({ attribute: false }) hass: HomeAssistant | null = null;
  @property({ attribute: false }) events: PlannerEvent[] = [];
  @property({ attribute: false }) tasks: PlannerTask[] = [];
  @property({ attribute: false }) calendars: Map<string, PlannerCalendar> = new Map();
  @property({ attribute: false }) lists: PlannerList[] = [];
  @property({ attribute: false }) routines: Routine[] = [];
  @property({ attribute: false }) presets: TaskPreset[] = [];
  @property({ attribute: false }) enabledCalendarIds: Set<string> = new Set();
  @property({ type: String }) currency = "$";
  @property({ type: Number }) budget = 0;
  @property({ type: String }) currentDate = todayISO();
  @property({ type: Boolean, reflect: true }) narrow = false;
  @property() weekStart: "monday" | "sunday" = "monday";
  @property({ type: Boolean }) timelineExpanded = false;
  private _clockTimer: number | null = null;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      color: var(--primary-text-color, #212121);
      background:
        radial-gradient(circle at top left, rgba(3, 169, 244, 0.08), transparent 28%),
        radial-gradient(circle at top right, rgba(76, 175, 80, 0.07), transparent 24%),
        var(--primary-background-color, #fafafa);
    }

    .shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-height: 0;
      overflow: auto;
    }

    .hero {
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
      align-items: stretch;
    }

    .hero-main,
    .hero-side,
    .panel-card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 18px;
      box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
    }

    .hero-main {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background:
        linear-gradient(135deg, rgba(3, 169, 244, 0.08), transparent 42%),
        var(--card-background-color, #fff);
    }

    .hero-kicker {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--secondary-text-color, #757575);
    }

    .hero-title {
      margin: 4px 0 6px;
      font-size: 26px;
      line-height: 1.08;
      font-weight: 700;
      letter-spacing: -0.6px;
    }

    .hero-subtitle {
      font-size: 14px;
      color: var(--secondary-text-color, #666);
      max-width: 54ch;
    }

    .hero-top {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }

    .weather-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: color-mix(in srgb, var(--secondary-background-color, #f4f4f4) 70%, transparent);
    }

    .weather-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
      color: var(--primary-color, #03a9f4);
      font-size: 18px;
      flex-shrink: 0;
    }

    .weather-main {
      min-width: 0;
      flex: 1;
    }

    .weather-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      margin: 0;
    }

    .weather-subtitle {
      margin-top: 2px;
      font-size: 12px;
      color: var(--secondary-text-color, #666);
    }

    .hero-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .live-events-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--success-color, #4caf50) 7%, transparent), transparent 70%),
        color-mix(in srgb, var(--secondary-background-color, #f4f4f4) 68%, transparent);
    }

    .live-events-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .live-events-copy {
      min-width: 0;
    }

    .live-events-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      margin: 0;
    }

    .live-events-subtitle {
      margin-top: 2px;
      font-size: 12px;
      color: var(--secondary-text-color, #666);
    }

    .live-events-list {
      display: grid;
      gap: 8px;
    }

    .live-event-button {
      width: 100%;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 14px;
      padding: 10px 12px;
      background: var(--card-background-color, #fff);
      color: inherit;
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .live-event-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 26%, var(--divider-color, #e0e0e0));
    }

    .live-event-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .live-event-title {
      min-width: 0;
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .live-event-sub {
      margin-top: 3px;
      font-size: 12px;
      color: var(--secondary-text-color, #666);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .live-progress-track {
      position: relative;
      width: 100%;
      height: 8px;
      margin-top: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
    }

    .live-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: var(--progress-color, var(--primary-color, #03a9f4));
      transition: width 0.45s ease;
    }

    .hero-stat {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: rgba(255, 255, 255, 0.85);
      color: var(--primary-text-color, #212121);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      text-align: left;
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }

    .hero-stat:hover {
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 30%, var(--divider-color, #e0e0e0));
    }

    .hero-stat-icon {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: var(--primary-color, #03a9f4);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      flex-shrink: 0;
    }

    .hero-stat-copy {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }

    .hero-stat strong {
      font-weight: 700;
    }

    .hero-side {
      padding: 16px;
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .timeline-card {
      padding: 16px;
      display: grid;
      gap: 12px;
    }

    .timeline-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .timeline-title-wrap {
      min-width: 0;
    }

    .timeline-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      margin: 0;
    }

    .timeline-range {
      margin-top: 3px;
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
    }

    .timeline-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .timeline-action:hover {
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .timeline-action svg,
    .hero-stat-icon svg,
    .section-chip-icon svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    .summary-card {
      padding: 12px;
      border-radius: 14px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border: 1px solid color-mix(in srgb, var(--divider-color, #e0e0e0) 70%, transparent);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .summary-card[clickable] {
      cursor: pointer;
    }

    .summary-card[clickable]:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
    }

    .summary-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      font-weight: 700;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      line-height: 1.25;
    }

    .summary-sub {
      margin-top: 3px;
      font-size: 12px;
      color: var(--secondary-text-color, #666);
    }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .panel-card {
      padding: 16px;
      min-height: 0;
    }

    .panel-card[data-wide="true"] {
      grid-column: 1 / -1;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .panel-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      margin: 0;
    }

    .panel-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .timeline {
      display: grid;
      gap: 10px;
    }

    .timeline-day {
      display: grid;
      gap: 8px;
    }

    .timeline-day-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #757575);
      font-weight: 700;
    }

    .timeline-day-count {
      font-size: 11px;
      font-weight: 700;
      color: var(--secondary-text-color, #757575);
    }

    .section-chip,
    .section-chip-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .section-chip:hover,
    .section-chip-link:hover {
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .section-chip-icon {
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      flex-shrink: 0;
      font-size: 10px;
    }

    .section-chip-label {
      color: var(--secondary-text-color, #666);
      font-weight: 500;
    }

    .timeline-item,
    .task-item,
    .shopping-item,
    .routine-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--primary-background-color, #fff);
      border-radius: 14px;
      padding: 10px 12px;
      text-align: left;
      color: inherit;
      font: inherit;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .timeline-item:hover,
    .task-item:hover,
    .shopping-item:hover,
    .routine-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 26%, var(--divider-color, #e0e0e0));
    }

    .event-dot,
    .task-dot,
    .shopping-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      flex-shrink: 0;
      background: var(--primary-color, #03a9f4);
    }

    .timeline-main,
    .task-main,
    .shopping-main,
    .routine-main {
      min-width: 0;
      flex: 1;
    }

    .timeline-main-row,
    .task-main-row,
    .shopping-main-row,
    .routine-main-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .timeline-title,
    .task-title,
    .shopping-title,
    .routine-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    .timeline-sub,
    .task-sub,
    .shopping-sub,
    .routine-sub {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row-icon {
      width: 28px;
      height: 28px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      flex-shrink: 0;
      font-size: 14px;
    }

    .row-icon ha-icon {
      --mdc-icon-size: 18px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--secondary-background-color, #f4f4f4) 85%, transparent);
      color: var(--secondary-text-color, #666);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .badge[data-tone="warn"] {
      background: color-mix(in srgb, var(--warning-color, #ff9800) 14%, transparent);
      color: var(--warning-color, #ff9800);
    }

    .badge[data-tone="danger"] {
      background: color-mix(in srgb, var(--error-color, #f44336) 14%, transparent);
      color: var(--error-color, #f44336);
    }

    .badge[data-tone="good"] {
      background: color-mix(in srgb, var(--success-color, #4caf50) 14%, transparent);
      color: var(--success-color, #4caf50);
    }

    .stack {
      display: grid;
      gap: 8px;
    }

    .section-empty {
      color: var(--secondary-text-color, #757575);
      font-size: 13px;
      padding: 12px 2px 4px;
    }

    .routine-grid {
      display: grid;
      gap: 8px;
    }

    .routine-emoji {
      width: 30px;
      height: 30px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, transparent);
      color: var(--primary-color, #03a9f4);
      flex-shrink: 0;
      font-size: 16px;
    }

    .shopping-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .shopping-total {
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }

    .shopping-shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .shortcut-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      color: var(--primary-text-color, #212121);
      border-radius: 999px;
      padding: 8px 12px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .shortcut-chip:hover {
      transform: translateY(-1px);
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
    }

    .shortcut-chip span:last-child {
      color: var(--secondary-text-color, #666);
      font-weight: 500;
    }

    .footer-note {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      padding: 0 4px 4px;
    }

    @media (max-width: 900px) {
      .hero,
      .grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .shell {
        padding: 12px;
        gap: 12px;
      }

      .hero-main {
        padding: 16px;
      }

      .hero-title {
        font-size: 24px;
      }

      .panel-card,
      .hero-side {
        padding: 14px;
      }
    }

    @keyframes riseIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hero-main,
    .hero-side,
    .panel-card {
      animation: riseIn 180ms ease-out both;
    }
  `;

  private get _visibleCalendars(): PlannerCalendar[] {
    const ids = this.enabledCalendarIds;
    const calendars = [...this.calendars.values()];
    return ids.size > 0 ? calendars.filter((cal) => ids.has(cal.id)) : calendars;
  }

  private get _shoppingListIds(): Set<string> {
    return new Set(this.lists.filter((list) => list.list_type === "shopping").map((list) => list.id));
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._clockTimer = window.setInterval(() => this.requestUpdate(), 60_000);
  }

  disconnectedCallback(): void {
    if (this._clockTimer != null) {
      window.clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
    super.disconnectedCallback();
  }

  private get _shoppingTasks(): PlannerTask[] {
    const shoppingIds = this._shoppingListIds;
    return this.tasks.filter((task) => shoppingIds.has(task.list_id));
  }

  private get _heroStats(): HeroStat[] {
    return [
      { icon: "◷", value: `${this._visibleCalendars.length}`, label: "calendars", destination: "calendar" },
      { icon: "✓", value: `${this._dueTasks.length}`, label: "tasks", destination: "tasks" },
      { icon: "🛒", value: `${this._shoppingSummary.count}`, label: "items", destination: "shopping" },
      { icon: "↻", value: `${this._routineCount}`, label: "routines", destination: "more" },
    ];
  }

  private get _weatherSurface(): WeatherSurface {
    return weatherSurface(this.hass);
  }

  private get _standardTasks(): PlannerTask[] {
    const shoppingIds = this._shoppingListIds;
    return this.tasks.filter((task) => !shoppingIds.has(task.list_id) && !task.completed);
  }

  private _isShiftEvent(event: PlannerEvent): boolean {
    const calendar = this.calendars.get(event.calendar_id);
    return event.calendar_id === "work_shifts"
      || shiftLikeText(calendar?.name)
      || shiftLikeText(event.calendar_id)
      || shiftLikeText(event.title);
  }

  private get _activeEventProgress(): ActiveEventProgress[] {
    const now = Date.now();
    return this.events
      .filter((event) => !event.deleted_at)
      .filter((event) => !event.all_day)
      .filter((event) => {
        if (this.enabledCalendarIds.size === 0) return true;
        return this.enabledCalendarIds.has(event.calendar_id);
      })
      .filter((event) => !this._isShiftEvent(event))
      .map((event) => {
        const start = new Date(event.start).getTime();
        const end = new Date(event.end).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
        if (start > now || end <= now) return null;
        const progress = clamp(((now - start) / (end - start)) * 100, 0, 100);
        const remainingMinutes = Math.max(0, Math.ceil((end - now) / 60_000));
        return {
          event,
          progress,
          remainingLabel: formatMinutesLabel(remainingMinutes),
        };
      })
      .filter((item): item is ActiveEventProgress => item !== null)
      .sort((a, b) => new Date(a.event.end).getTime() - new Date(b.event.end).getTime())
      .slice(0, 3);
  }

  private get _upcomingEvents(): PlannerEvent[] {
    const now = Date.now();
    const endDate = this.timelineExpanded ? addDaysISO(this.currentDate, 6) : addDaysISO(this.currentDate, 1);
    const currentStart = startOfDay(this.currentDate);
    const endStart = startOfDay(endDate);
    return this.events
      .filter((event) => !event.deleted_at)
      .filter((event) => {
        if (this.enabledCalendarIds.size === 0) return true;
        return this.enabledCalendarIds.has(event.calendar_id);
      })
      .filter((event) => {
        const eventDate = event.start.slice(0, 10);
        const eventStart = new Date(event.start).getTime();
        const eventDay = startOfDay(eventDate);
        if (eventDay < currentStart || eventDay > endStart) return false;
        if (sameDay(eventDate, this.currentDate) && eventStart < now) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, this.timelineExpanded ? 24 : 8);
  }

  private get _timelineDays(): DatedItem[] {
    const grouped = new Map<string, PlannerEvent[]>();
    for (const event of this._upcomingEvents) {
      const date = event.start.slice(0, 10);
      const bucket = grouped.get(date) ?? [];
      bucket.push(event);
      grouped.set(date, bucket);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        dayLabel: this._dayLabel(date),
        items,
      }));
  }

  private get _nextShift(): PlannerEvent | null {
    const shiftCalendars = [...this.calendars.values()]
      .filter((calendar) => calendar.id === "work_shifts" || /shift/i.test(calendar.name))
      .map((calendar) => calendar.id);
    const pool = this.events
      .filter((event) => !event.deleted_at)
      .filter((event) => {
        if (this.enabledCalendarIds.size === 0) return true;
        return this.enabledCalendarIds.has(event.calendar_id);
      })
      .filter((event) => shiftCalendars.length === 0 || shiftCalendars.includes(event.calendar_id))
      .filter((event) => new Date(event.start).getTime() >= Date.now())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return pool[0] ?? null;
  }

  private get _dueTasks(): PlannerTask[] {
    return this._standardTasks
      .slice()
      .sort((a, b) => taskPriorityScore(a) - taskPriorityScore(b) || (a.due ?? "").localeCompare(b.due ?? "") || a.title.localeCompare(b.title))
      .slice(0, 6);
  }

  private get _shoppingSummary(): {
    remaining: number;
    spent: number;
    count: number;
  } {
    const spent = this._shoppingTasks.reduce((sum, task) => sum + (task.price ?? 0), 0);
    const remaining = Math.max(0, this.budget - spent);
    return {
      spent,
      remaining,
      count: this._shoppingTasks.filter((task) => !task.completed).length,
    };
  }

  private get _shoppingShortcuts(): Array<PlannerTask | TaskPreset> {
    if (this.presets.length > 0) {
      const shoppingIds = this._shoppingListIds;
      return this.presets.filter((preset) => shoppingIds.has(preset.list_id));
    }
    return this._shoppingTasks
      .filter((task) => !task.completed)
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title))
      .slice(0, 5);
  }

  private get _routineCount(): number {
    return this.routines.length;
  }

  private _dayLabel(iso: string): string {
    const today = todayISO();
    if (sameDay(iso, today)) return "Today";
    if (isTomorrow(iso)) return "Tomorrow";
    return formatShortDate(iso);
  }

  private _dispatchEventSelect(event: PlannerEvent): void {
    this.dispatchEvent(
      new CustomEvent("event-select", {
        detail: { event },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchTaskClick(task: PlannerTask): void {
    this.dispatchEvent(
      new CustomEvent("task-click", {
        detail: { task },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchRoutineExecute(routine: Routine): void {
    this.dispatchEvent(
      new CustomEvent("routine-execute", {
        detail: { routineId: routine.id, routine },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchPresetAdd(preset: TaskPreset): void {
    this.dispatchEvent(
      new CustomEvent("preset-add", {
        detail: { presetId: preset.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchNavigate(view: HomeDestination): void {
    this.dispatchEvent(
      new CustomEvent("nav-change", {
        detail: { view },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _toggleTimeline(): void {
    this.timelineExpanded = !this.timelineExpanded;
  }

  render() {
    const shopping = this._shoppingSummary;
    const weather = this._weatherSurface;
    const timelineLabel = this.timelineExpanded ? "This week" : "Today + tomorrow";
    const timelineToggleLabel = this.timelineExpanded ? "Show today + tomorrow" : "Expand for the week";

    return html`
      <div class="shell">
        <section class="hero" aria-label="Overview summary">
          <div class="hero-main">
            <div class="hero-top">
              <div class="hero-kicker">Home</div>
              <h1 class="hero-title">${formatShortDate(this.currentDate)}</h1>
              <div class="hero-subtitle">
                Today at a glance, with the next things worth opening.
              </div>
              <div class="weather-card">
                <div class="weather-icon" aria-hidden="true">${weather.icon}</div>
                <div class="weather-main">
                  <div class="weather-title">Today's weather</div>
                  <div class="weather-subtitle">${weather.title} · ${weather.subtitle}</div>
                </div>
              </div>

              ${this._activeEventProgress.length > 0
                ? html`
                    <div class="live-events-card">
                      <div class="live-events-head">
                        <div class="live-events-copy">
                          <div class="live-events-title">Happening now</div>
                          <div class="live-events-subtitle">Live progress for current non-shift events</div>
                        </div>
                        <button class="section-chip-link" @click=${() => this._dispatchNavigate("calendar")}>
                          <span class="section-chip-icon" aria-hidden="true">◷</span>
                          <span><strong>${this._activeEventProgress.length}</strong></span>
                          <span class="section-chip-label">live</span>
                        </button>
                      </div>
                      <div class="live-events-list">
                        ${this._activeEventProgress.map(
                          ({ event, progress, remainingLabel }) => html`
                            <button class="live-event-button" @click=${() => this._dispatchEventSelect(event)}>
                              <div class="live-event-row">
                                <div class="live-event-title">${event.title}</div>
                                <span class="badge">${remainingLabel}</span>
                              </div>
                              <div class="live-event-sub">
                                ${calendarName(this.calendars, event.calendar_id)} · ${formatTime(event.start)} - ${formatTime(event.end)}
                              </div>
                              <div class="live-progress-track" aria-hidden="true">
                                <div
                                  class="live-progress-fill"
                                  style=${`width:${progress}%; --progress-color:${calendarColor(this.calendars, event.calendar_id)};`}
                                ></div>
                              </div>
                            </button>
                          `,
                        )}
                      </div>
                    </div>
                  `
                : nothing}
            </div>

            <div class="hero-stats" aria-label="Quick destinations">
              ${this._heroStats.map(
                (stat) => html`
                  <button class="hero-stat" @click=${() => this._dispatchNavigate(stat.destination)} aria-label=${`Open ${stat.label}`}>
                    <span class="hero-stat-icon" aria-hidden="true">${stat.icon}</span>
                    <span class="hero-stat-copy">
                      <strong>${stat.value}</strong>
                      <span>${stat.label}</span>
                    </span>
                  </button>
                `,
              )}
            </div>
          </div>

          <div class="hero-side panel-card timeline-card">
            <div class="timeline-head">
              <div class="timeline-title-wrap">
                <h2 class="timeline-title">Upcoming Timeline</h2>
                <div class="timeline-range">${timelineLabel}</div>
              </div>
              <button class="timeline-action" @click=${() => this._toggleTimeline()}>${timelineToggleLabel}</button>
            </div>

            <div class="panel-meta">
              <button class="section-chip-link" @click=${() => this._dispatchNavigate("calendar")}>
                <span class="section-chip-icon" aria-hidden="true">◷</span>
                <span><strong>${this._upcomingEvents.length}</strong></span>
                <span class="section-chip-label">events</span>
              </button>
            </div>

            ${this._timelineDays.length > 0
              ? html`
                  <div class="timeline">
                    ${this._timelineDays.map(
                      (day) => html`
                        <div class="timeline-day">
                          <div class="timeline-day-label">
                            <span>${day.dayLabel}</span>
                            <span class="timeline-day-count">${day.items.length}</span>
                          </div>
                          ${day.items.map(
                            (event) => html`
                              <button class="timeline-item" @click=${() => this._dispatchEventSelect(event)}>
                                <span class="event-dot" style="background:${calendarColor(this.calendars, event.calendar_id)}"></span>
                                <div class="timeline-main">
                                  <div class="timeline-title">${event.title}</div>
                                  <div class="timeline-sub">
                                    ${event.all_day ? "All day" : formatTime(event.start)}
                                    ${calendarName(this.calendars, event.calendar_id) ? html`<span> · ${calendarName(this.calendars, event.calendar_id)}</span>` : nothing}
                                  </div>
                                </div>
                                <span class="badge">${event.all_day ? "All day" : formatTime(event.start)}</span>
                              </button>
                            `,
                          )}
                        </div>
                      `,
                    )}
                  </div>
                `
              : html`<div class="section-empty">No upcoming events in the current window.</div>`}
          </div>
        </section>

        <section class="grid">
          <article class="panel-card" data-wide="true">
            <div class="panel-head">
              <h2 class="panel-title">Due Tasks</h2>
              <div class="panel-meta">
                <button class="section-chip-link" @click=${() => this._dispatchNavigate("tasks")}>
                  <span class="section-chip-icon" aria-hidden="true">✓</span>
                  <span><strong>${this._dueTasks.length}</strong></span>
                  <span class="section-chip-label">shown</span>
                </button>
              </div>
            </div>
            ${this._dueTasks.length > 0
              ? html`
                  <div class="stack">
                    ${this._dueTasks.map(
                      (task) => {
                        const bucket = taskDueBucket(task);
                        const listName = this.lists.find((list) => list.id === task.list_id)?.name ?? task.list_id;
                        return html`
                          <button class="task-item" @click=${() => this._dispatchTaskClick(task)}>
                            <span class="task-dot" style="background:${bucket === "overdue" ? "var(--error-color, #f44336)" : bucket === "today" ? "var(--warning-color, #ff9800)" : "var(--primary-color, #03a9f4)"}"></span>
                            <div class="task-main">
                              <div class="task-main-row">
                                <div class="task-title">${task.title}</div>
                                <span class="badge">${bucket === "overdue" ? "Overdue" : bucket === "today" ? "Today" : bucket === "upcoming" ? "Soon" : "Later"}</span>
                              </div>
                              <div class="task-sub">${listName}${task.due ? html` · ${task.due.slice(0, 10) === todayISO() ? "Today" : formatShortDate(task.due)}` : nothing}</div>
                            </div>
                          </button>
                        `;
                      },
                    )}
                  </div>
                `
              : html`<div class="section-empty">No pending tasks in the current standard lists.</div>`}
          </article>

          <article class="panel-card">
            <div class="panel-head">
              <h2 class="panel-title">Shopping Shortcuts</h2>
              <div class="panel-meta">
                <button class="section-chip-link" @click=${() => this._dispatchNavigate("shopping")}>
                  <span class="section-chip-icon" aria-hidden="true">🛒</span>
                  <span><strong>${shopping.count}</strong></span>
                  <span class="section-chip-label">items</span>
                </button>
              </div>
            </div>
            ${this._shoppingShortcuts.length > 0
              ? html`
                  <div class="shopping-meta">
                    <span class="badge">Budget ${formatAmount(this.budget, this.currency)}</span>
                    <span class="badge">Remaining ${formatAmount(shopping.remaining, this.currency)}</span>
                  </div>
                  <div class="stack" style="margin-top: 12px;">
                    ${this._shoppingShortcuts.map((item) => {
                      if ("icon" in item) {
                        const preset = item as TaskPreset;
                        return html`
                          <button class="shopping-item" @click=${() => this._dispatchPresetAdd(preset)}>
                            <span class="row-icon" aria-hidden="true">${renderPresetIcon(preset.icon)}</span>
                            <div class="shopping-main">
                              <div class="shopping-main-row">
                                <div class="shopping-title">${preset.title}</div>
                                <span class="badge">${preset.category || "preset"}</span>
                              </div>
                              <div class="shopping-sub">${preset.note || "Tap to add"}</div>
                            </div>
                            <span class="badge">Add</span>
                          </button>
                        `;
                      }

                      const task = item as PlannerTask;
                      return html`
                        <button class="shopping-item" @click=${() => this._dispatchTaskClick(task)}>
                          <span class="row-icon" aria-hidden="true">🛍</span>
                          <div class="shopping-main">
                            <div class="shopping-main-row">
                              <div class="shopping-title">${task.title}</div>
                              <span class="badge">${task.category || "shopping"}</span>
                            </div>
                            <div class="shopping-sub">
                              ${task.quantity ? `${task.quantity} ${task.unit || "items"}` : "Tap to edit"}
                            </div>
                          </div>
                          <span class="badge">${task.price != null ? formatAmount(task.price, this.currency) : "Open"}</span>
                        </button>
                      `;
                    })}
                  </div>
                `
              : html`<div class="section-empty">No shopping shortcuts yet.</div>`}
          </article>

          <article class="panel-card">
            <div class="panel-head">
              <h2 class="panel-title">Routines</h2>
              <div class="panel-meta">
                <button class="section-chip-link" @click=${() => this._dispatchNavigate("more")}>
                  <span class="section-chip-icon" aria-hidden="true">↻</span>
                  <span><strong>${this._routineCount}</strong></span>
                  <span class="section-chip-label">available</span>
                </button>
              </div>
            </div>
            ${this.routines.length > 0
              ? html`
                  <div class="routine-grid">
                    ${this.routines.map(
                      (routine) => html`
                        <button class="routine-item" @click=${() => this._dispatchRoutineExecute(routine)}>
                          <span class="routine-emoji">${routine.emoji || "⚡"}</span>
                          <div class="routine-main">
                            <div class="routine-main-row">
                              <div class="routine-title">${routine.name}</div>
                              <span class="badge">${routine.tasks.length} tasks</span>
                            </div>
                            <div class="routine-sub">${routine.description || "Quick routine"}</div>
                          </div>
                        </button>
                      `,
                    )}
                  </div>
                `
              : html`<div class="section-empty">No routines configured yet.</div>`}
          </article>
        </section>

        <div class="footer-note">
          Week starts ${this.weekStart}. Interactions stay shallow: tap an event, task, routine, or count chip and let the shell decide what opens next.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "calee-home-page": CaleeHomePage;
  }
}
