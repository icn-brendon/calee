/**
 * PlannerConnection — typed wrapper around the Home Assistant WebSocket API.
 *
 * Every method maps 1:1 to a `calee/*` WS command registered
 * in custom_components/calee/websocket_api.py.
 */

import type {
  HomeAssistant,
  PlannerCalendar,
  PlannerEvent,
  PlannerTask,
  PlannerList,
  ShiftTemplate,
  TaskPreset,
  PlannerChangeEvent,
} from "./types.js";

export class PlannerConnection {
  private _hass: HomeAssistant;

  constructor(hass: HomeAssistant) {
    this._hass = hass;
  }

  /** Replace the hass reference (called when HA reconnects). */
  updateHass(hass: HomeAssistant): void {
    this._hass = hass;
  }

  // ── Read queries ──────────────────────────────────────────────────

  getCalendars(): Promise<PlannerCalendar[]> {
    return this._hass.callWS<PlannerCalendar[]>({
      type: "calee/calendars",
    });
  }

  getEvents(
    calendarId?: string,
    start?: string,
    end?: string,
  ): Promise<PlannerEvent[]> {
    const msg: Record<string, unknown> = {
      type: "calee/events",
    };
    if (calendarId) msg.calendar_id = calendarId;
    if (start) msg.start = start;
    if (end) msg.end = end;
    return this._hass.callWS<PlannerEvent[]>(msg);
  }

  getTasks(opts?: {
    listId?: string;
    view?: string;
    completed?: boolean;
    limit?: number;
  }): Promise<PlannerTask[]> {
    const msg: Record<string, unknown> = {
      type: "calee/tasks",
    };
    if (opts?.listId) msg.list_id = opts.listId;
    if (opts?.view) msg.view = opts.view;
    if (opts?.completed !== undefined) msg.completed = opts.completed;
    if (opts?.limit !== undefined) msg.limit = opts.limit;
    return this._hass.callWS<PlannerTask[]>(msg);
  }

  getLists(): Promise<PlannerList[]> {
    return this._hass.callWS<PlannerList[]>({
      type: "calee/lists",
    });
  }

  getTemplates(): Promise<ShiftTemplate[]> {
    return this._hass.callWS<ShiftTemplate[]>({
      type: "calee/templates",
    });
  }

  // ── Event mutations ───────────────────────────────────────────────

  createEvent(params: {
    calendar_id: string;
    title: string;
    start: string;
    end: string;
    note?: string;
    template_id?: string;
  }): Promise<PlannerEvent> {
    return this._hass.callWS<PlannerEvent>({
      type: "calee/create_event",
      ...params,
    });
  }

  updateEvent(params: {
    event_id: string;
    version: number;
    title?: string;
    start?: string;
    end?: string;
    note?: string;
  }): Promise<PlannerEvent> {
    return this._hass.callWS<PlannerEvent>({
      type: "calee/update_event",
      ...params,
    });
  }

  deleteEvent(eventId: string): Promise<{ success: boolean }> {
    return this._hass.callWS<{ success: boolean }>({
      type: "calee/delete_event",
      event_id: eventId,
    });
  }

  // ── Task mutations ────────────────────────────────────────────────

  createTask(params: {
    list_id: string;
    title: string;
    note?: string;
    due?: string;
  }): Promise<PlannerTask> {
    return this._hass.callWS<PlannerTask>({
      type: "calee/create_task",
      ...params,
    });
  }

  updateTask(params: {
    task_id: string;
    version: number;
    title?: string;
    note?: string;
    due?: string;
  }): Promise<PlannerTask> {
    return this._hass.callWS<PlannerTask>({
      type: "calee/update_task",
      ...params,
    });
  }

  deleteTask(taskId: string): Promise<{ success: boolean }> {
    return this._hass.callWS<{ success: boolean }>({
      type: "calee/delete_task",
      task_id: taskId,
    });
  }

  completeTask(taskId: string): Promise<PlannerTask> {
    return this._hass.callWS<PlannerTask>({
      type: "calee/complete_task",
      task_id: taskId,
    });
  }

  // ── Template mutations ────────────────────────────────────────────

  createTemplate(params: {
    name: string;
    calendar_id: string;
    start_time: string;
    end_time: string;
    color?: string;
    note?: string;
  }): Promise<ShiftTemplate> {
    return this._hass.callWS<ShiftTemplate>({
      type: "calee/create_template",
      ...params,
    });
  }

  updateTemplate(params: {
    template_id: string;
    name?: string;
    calendar_id?: string;
    start_time?: string;
    end_time?: string;
    color?: string;
    note?: string;
    emoji?: string;
  }): Promise<ShiftTemplate> {
    return this._hass.callWS<ShiftTemplate>({
      type: "calee/update_template",
      ...params,
    });
  }

  deleteTemplate(templateId: string): Promise<ShiftTemplate> {
    return this._hass.callWS<ShiftTemplate>({
      type: "calee/delete_template",
      template_id: templateId,
    });
  }

  addShiftFromTemplate(
    templateId: string,
    date: string,
  ): Promise<PlannerEvent> {
    return this._hass.callWS<PlannerEvent>({
      type: "calee/add_shift_from_template",
      template_id: templateId,
      date,
    });
  }

  // ── Preset queries & mutations ─────────────────────────────────────

  getPresets(): Promise<TaskPreset[]> {
    return this._hass.callWS<TaskPreset[]>({
      type: "calee/presets",
    });
  }

  addFromPreset(presetId: string): Promise<PlannerTask> {
    return this._hass.callWS<PlannerTask>({
      type: "calee/add_from_preset",
      preset_id: presetId,
    });
  }

  // ── Subscription ──────────────────────────────────────────────────

  /**
   * Subscribe to real-time planner change notifications.
   *
   * Returns an unsubscribe function. The callback fires whenever
   * a calendar, event, task, list, or template is created / updated /
   * deleted by any user or automation.
   */
  subscribe(
    callback: (event: PlannerChangeEvent) => void,
  ): Promise<() => void> {
    return this._hass.connection.subscribeMessage(callback, {
      type: "calee/subscribe",
    });
  }
}
