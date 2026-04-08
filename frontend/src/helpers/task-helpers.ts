/**
 * Shared date and formatting helpers for task components.
 *
 * Extracted from tasks-view.ts in Sprint 8 to avoid duplication
 * across task-item, task-quick-add, and task-edit-sheet.
 */

/* ── Date helpers ──────────────────────────────────────────────────── */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function nextWeekISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function isToday(iso: string): boolean {
  return iso.slice(0, 10) === todayISO();
}

export function isTomorrow(iso: string): boolean {
  return iso.slice(0, 10) === tomorrowISO();
}

export function isUpcoming(iso: string): boolean {
  return iso.slice(0, 10) > todayISO();
}

export function isPast(iso: string): boolean {
  return iso.slice(0, 10) < todayISO();
}

export function formatDue(iso: string): string {
  const dateStr = iso.slice(0, 10);
  if (dateStr === todayISO()) return "Today";
  if (dateStr === tomorrowISO()) return "Tomorrow";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Recurrence helpers ────────────────────────────────────────────── */

export const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Fortnightly",
  monthly: "Monthly",
  weekdays: "Weekdays",
};

export function formatRecurrence(rule: string): string {
  return RECURRENCE_LABELS[rule] ?? rule;
}

/* ── Pill types ────────────────────────────────────────────────────── */

export type DatePill = "none" | "today" | "tomorrow" | "nextweek" | "custom";
export type RecurrencePill = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "weekdays";
export type TaskView = "inbox" | "today" | "upcoming";
export type TaskSort = "manual" | "due" | "title" | "created";
export type TaskGroup = "none" | "list" | "due" | "category";

/* ── Pill resolution ───────────────────────────────────────────────── */

export function resolveDue(pill: DatePill, customDate: string): string | undefined {
  switch (pill) {
    case "today":
      return todayISO();
    case "tomorrow":
      return tomorrowISO();
    case "nextweek":
      return nextWeekISO();
    case "custom":
      return customDate || undefined;
    default:
      return undefined;
  }
}

export function datePillFromDue(due: string | null): { pill: DatePill; customDate: string } {
  if (!due) return { pill: "none", customDate: "" };
  const dateStr = due.slice(0, 10);
  if (dateStr === todayISO()) return { pill: "today", customDate: "" };
  if (dateStr === tomorrowISO()) return { pill: "tomorrow", customDate: "" };
  if (dateStr === nextWeekISO()) return { pill: "nextweek", customDate: "" };
  return { pill: "custom", customDate: dateStr };
}

/* ── Task sorting ──────────────────────────────────────────────────── */

export function sortTasks(tasks: readonly import("../store/types.js").PlannerTask[], sort: TaskSort): import("../store/types.js").PlannerTask[] {
  const arr = [...tasks];
  switch (sort) {
    case "due":
      return arr.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      });
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "created":
      return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "manual":
    default:
      // Sort by list_id first (so tasks from different lists don't interleave),
      // then by position within each list.
      return arr.sort((a, b) => {
        const listCmp = a.list_id.localeCompare(b.list_id);
        return listCmp !== 0 ? listCmp : a.position - b.position;
      });
  }
}

/* ── Task grouping ─────────────────────────────────────────────────── */

export interface TaskGroupSection {
  label: string;
  key: string;
  tasks: import("../store/types.js").PlannerTask[];
}

export function groupTasks(
  tasks: readonly import("../store/types.js").PlannerTask[],
  groupBy: TaskGroup,
  lists?: readonly import("../store/types.js").PlannerList[],
): TaskGroupSection[] {
  if (groupBy === "none") {
    return [{ label: "", key: "_all", tasks: [...tasks] }];
  }

  const map = new Map<string, import("../store/types.js").PlannerTask[]>();

  for (const t of tasks) {
    let key: string;
    switch (groupBy) {
      case "list":
        key = t.list_id;
        break;
      case "due": {
        if (!t.due) key = "No date";
        else if (isPast(t.due)) key = "Overdue";
        else if (isToday(t.due)) key = "Today";
        else if (isTomorrow(t.due)) key = "Tomorrow";
        else key = "Upcoming";
        break;
      }
      case "category":
        key = t.category || "Uncategorised";
        break;
      default:
        key = "_all";
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }

  const listNameMap = new Map<string, string>();
  if (lists) {
    for (const l of lists) listNameMap.set(l.id, l.name);
  }

  const sections: TaskGroupSection[] = [];
  for (const [key, groupTasks] of map.entries()) {
    const label = groupBy === "list" ? (listNameMap.get(key) ?? key) : key;
    sections.push({ label, key, tasks: groupTasks });
  }

  // Sort groups sensibly
  if (groupBy === "due") {
    const order = ["Overdue", "Today", "Tomorrow", "Upcoming", "No date"];
    sections.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  } else {
    sections.sort((a, b) => a.label.localeCompare(b.label));
  }

  return sections;
}
