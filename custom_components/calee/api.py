"""Internal API / business logic coordinator for Calee.

This module is the single source of truth for all write operations.
Both HA service calls and WebSocket mutation commands route through here.

Each method: validate input -> check permissions -> mutate store ->
record audit -> fire bus event (for WS subscribers) -> save.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, date, datetime, timedelta

from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError

from .const import (
    ATTR_CALENDAR_ID,
    ATTR_DATE,
    ATTR_EVENT_ID,
    ATTR_EXTERNAL_ID,
    ATTR_IMPORT_DATA,
    ATTR_LIST_ID,
    ATTR_PRESET_CATEGORY,
    ATTR_PRESET_ICON,
    ATTR_PRESET_ID,
    ATTR_SHIFT_END,
    ATTR_SHIFT_NOTE,
    ATTR_SHIFT_START,
    ATTR_SHIFT_TITLE,
    ATTR_SNOOZE_MINUTES,
    ATTR_SOURCE,
    ATTR_TASK_ID,
    ATTR_TEMPLATE_COLOR,
    ATTR_TEMPLATE_END_TIME,
    ATTR_TEMPLATE_ID,
    ATTR_TEMPLATE_NAME,
    ATTR_TEMPLATE_START_TIME,
    ATTR_VERSION,
    DOMAIN,
    SERVICE_ADD_FROM_PRESET,
    SERVICE_ADD_SHIFT,
    SERVICE_ADD_SHIFT_FROM_TEMPLATE,
    SERVICE_ADD_TASK,
    SERVICE_COMPLETE_TASK,
    SERVICE_CREATE_PRESET,
    SERVICE_CREATE_ROUTINE,
    SERVICE_CREATE_TEMPLATE,
    SERVICE_DELETE_PRESET,
    SERVICE_DELETE_ROUTINE,
    SERVICE_DELETE_SHIFT,
    SERVICE_DELETE_TASK,
    SERVICE_DELETE_TEMPLATE,
    SERVICE_EXECUTE_ROUTINE,
    SERVICE_IMPORT_CSV,
    SERVICE_IMPORT_ICS,
    SERVICE_LINK_TASK_TO_EVENT,
    SERVICE_RESTORE_SHIFT,
    SERVICE_RESTORE_TASK,
    SERVICE_SET_CALENDAR_PRIVATE,
    SERVICE_SET_LIST_PRIVATE,
    SERVICE_SNOOZE_REMINDER,
    SERVICE_UNCOMPLETE_TASK,
    SERVICE_UNLINK_TASK_FROM_EVENT,
    SERVICE_UPDATE_ROUTINE,
    SERVICE_UPDATE_SHIFT,
    SERVICE_UPDATE_TASK,
    SERVICE_UPDATE_TEMPLATE,
    SERVICE_UPSERT_SHIFT,
    AuditAction,
)
from .db.base import AbstractPlannerStore
from .importer import ImportResult, parse_csv, parse_ics
from .models import PlannerEvent, PlannerTask, Routine, ShiftTemplate, TaskPreset, _new_id
from .permissions import async_require_write
from .recurrence import next_due_date, parse_recurrence

_LOGGER = logging.getLogger(__name__)


class PlannerAPI:
    """Central coordinator for all planner mutations."""

    def __init__(self, hass: HomeAssistant, store: AbstractPlannerStore) -> None:
        self._hass = hass
        self._store = store

    # ── Service registration ─────────────────────────────────────────

    async def async_register_services(self) -> None:
        """Register all calee.* service actions."""
        self._hass.services.async_register(
            DOMAIN, SERVICE_ADD_SHIFT, self._handle_add_shift
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UPSERT_SHIFT, self._handle_upsert_shift
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UPDATE_SHIFT, self._handle_update_shift
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_DELETE_SHIFT, self._handle_delete_shift
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_ADD_TASK, self._handle_add_task
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_COMPLETE_TASK, self._handle_complete_task
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UNCOMPLETE_TASK, self._handle_uncomplete_task
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UPDATE_TASK, self._handle_update_task
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_DELETE_TASK, self._handle_delete_task
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_SNOOZE_REMINDER, self._handle_snooze_reminder
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_CREATE_TEMPLATE, self._handle_create_template
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UPDATE_TEMPLATE, self._handle_update_template
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_DELETE_TEMPLATE, self._handle_delete_template
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_ADD_SHIFT_FROM_TEMPLATE, self._handle_add_shift_from_template
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_LINK_TASK_TO_EVENT, self._handle_link_task_to_event
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UNLINK_TASK_FROM_EVENT, self._handle_unlink_task_from_event
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_IMPORT_CSV, self._handle_import_csv
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_IMPORT_ICS, self._handle_import_ics
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_CREATE_PRESET, self._handle_create_preset
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_DELETE_PRESET, self._handle_delete_preset
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_ADD_FROM_PRESET, self._handle_add_from_preset
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_RESTORE_SHIFT, self._handle_restore_shift
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_RESTORE_TASK, self._handle_restore_task
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_SET_CALENDAR_PRIVATE, self._handle_set_calendar_private
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_SET_LIST_PRIVATE, self._handle_set_list_private
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_CREATE_ROUTINE, self._handle_create_routine
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_UPDATE_ROUTINE, self._handle_update_routine
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_DELETE_ROUTINE, self._handle_delete_routine
        )
        self._hass.services.async_register(
            DOMAIN, SERVICE_EXECUTE_ROUTINE, self._handle_execute_routine
        )

    async def async_unregister_services(self) -> None:
        """Remove all calee.* services."""
        for service in (
            SERVICE_ADD_SHIFT,
            SERVICE_UPSERT_SHIFT,
            SERVICE_UPDATE_SHIFT,
            SERVICE_DELETE_SHIFT,
            SERVICE_ADD_TASK,
            SERVICE_COMPLETE_TASK,
            SERVICE_UNCOMPLETE_TASK,
            SERVICE_UPDATE_TASK,
            SERVICE_DELETE_TASK,
            SERVICE_SNOOZE_REMINDER,
            SERVICE_CREATE_TEMPLATE,
            SERVICE_UPDATE_TEMPLATE,
            SERVICE_DELETE_TEMPLATE,
            SERVICE_ADD_SHIFT_FROM_TEMPLATE,
            SERVICE_LINK_TASK_TO_EVENT,
            SERVICE_UNLINK_TASK_FROM_EVENT,
            SERVICE_IMPORT_CSV,
            SERVICE_IMPORT_ICS,
            SERVICE_CREATE_PRESET,
            SERVICE_DELETE_PRESET,
            SERVICE_ADD_FROM_PRESET,
            SERVICE_RESTORE_SHIFT,
            SERVICE_RESTORE_TASK,
            SERVICE_SET_CALENDAR_PRIVATE,
            SERVICE_SET_LIST_PRIVATE,
            SERVICE_CREATE_ROUTINE,
            SERVICE_UPDATE_ROUTINE,
            SERVICE_DELETE_ROUTINE,
            SERVICE_EXECUTE_ROUTINE,
        ):
            self._hass.services.async_remove(DOMAIN, service)

    # ── Shift operations ─────────────────────────────────────────────

    async def async_add_shift(
        self,
        calendar_id: str,
        title: str,
        start: str,
        end: str,
        note: str = "",
        template_id: str | None = None,
        recurrence_rule: str | None = None,
        user_id: str | None = None,
    ) -> PlannerEvent:
        """Create a new shift event."""
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", calendar_id
        )

        # Validate recurrence rule if provided.
        if recurrence_rule:
            try:
                parse_recurrence(recurrence_rule)
            except ValueError as exc:
                raise HomeAssistantError(
                    f"Invalid recurrence rule: {exc}"
                ) from exc

        event = PlannerEvent(
            calendar_id=calendar_id,
            title=title,
            start=start,
            end=end,
            note=note,
            template_id=template_id,
            recurrence_rule=recurrence_rule,
            source="manual",
        )
        await self._store.async_put_event(event)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Added shift '{title}' to {calendar_id}",
        )

        self._fire_change("create", "event", event.id)
        await self._store.async_save()
        return event

    async def async_upsert_shift(
        self,
        calendar_id: str,
        external_id: str,
        source: str,
        title: str,
        start: str,
        end: str,
        note: str = "",
        user_id: str | None = None,
    ) -> PlannerEvent:
        """Create or update a shift by external_id + source (idempotent)."""
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", calendar_id
        )

        # Look for existing event with same source + external_id.
        existing = self._store.find_event_by_source(source, external_id)

        now = datetime.now(UTC).isoformat()

        if existing:
            existing.calendar_id = calendar_id
            existing.title = title
            existing.start = start
            existing.end = end
            existing.note = note
            existing.updated_at = now
            existing.version += 1
            existing.deleted_at = None  # restore if soft-deleted

            await self._store.async_put_event(existing)
            self._store.record_audit(
                user_id=user_id or "",
                action=AuditAction.UPDATE,
                resource_type="event",
                resource_id=existing.id,
                detail=f"Upserted shift '{title}' (source={source})",
            )
            self._fire_change("update", "event", existing.id)
            await self._store.async_save()
            return existing

        event = PlannerEvent(
            calendar_id=calendar_id,
            title=title,
            start=start,
            end=end,
            note=note,
            source=source,
            external_id=external_id,
        )
        await self._store.async_put_event(event)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Upserted (new) shift '{title}' (source={source})",
        )
        self._fire_change("create", "event", event.id)
        await self._store.async_save()
        return event

    async def async_update_shift(
        self,
        event_id: str,
        version: int,
        title: str | None = None,
        start: str | None = None,
        end: str | None = None,
        note: str | None = None,
        recurrence_rule: str | None = None,
        user_id: str | None = None,
    ) -> PlannerEvent:
        """Update an existing shift (optimistic locking)."""
        event = self._store.get_event(event_id)
        if event is None or event.deleted_at is not None:
            raise HomeAssistantError(f"Event '{event_id}' not found")

        if event.version != version:
            raise HomeAssistantError(
                f"Version conflict: expected {version}, current is {event.version}. "
                "Reload and try again."
            )

        await async_require_write(
            self._hass, self._store, user_id, "calendar", event.calendar_id
        )

        if title is not None:
            event.title = title
        if start is not None:
            event.start = start
        if end is not None:
            event.end = end
        if note is not None:
            event.note = note
        if recurrence_rule is not None:
            # Validate, then set (empty string clears the rule).
            if recurrence_rule:
                try:
                    parse_recurrence(recurrence_rule)
                except ValueError as exc:
                    raise HomeAssistantError(
                        f"Invalid recurrence rule: {exc}"
                    ) from exc
            event.recurrence_rule = recurrence_rule if recurrence_rule else None

        event.updated_at = datetime.now(UTC).isoformat()
        event.version += 1

        await self._store.async_put_event(event)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Updated shift '{event.title}'",
        )
        self._fire_change("update", "event", event.id)
        await self._store.async_save()
        return event

    async def async_delete_shift(
        self,
        event_id: str,
        user_id: str | None = None,
    ) -> PlannerEvent:
        """Soft-delete a shift event."""
        event = self._store.get_event(event_id)
        if event is None:
            raise HomeAssistantError(f"Event '{event_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", event.calendar_id
        )

        self._store.soft_delete_event(event_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.DELETE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Deleted shift '{event.title}'",
        )
        self._fire_change("delete", "event", event.id)
        await self._store.async_save()
        return event

    async def async_restore_shift(
        self,
        event_id: str,
        user_id: str | None = None,
    ) -> PlannerEvent:
        """Restore a soft-deleted shift event."""
        event = self._store.get_event(event_id)
        if event is None:
            raise HomeAssistantError(f"Event '{event_id}' not found")
        if event.deleted_at is None:
            raise HomeAssistantError(f"Event '{event_id}' is not deleted")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", event.calendar_id
        )

        self._store.restore_event(event_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.RESTORE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Restored shift '{event.title}'",
        )
        self._fire_change("restore", "event", event.id)
        await self._store.async_save()
        return event

    # ── Task operations ──────────────────────────────────────────────

    async def async_add_task(
        self,
        list_id: str,
        title: str,
        note: str = "",
        due: str | None = None,
        related_event_id: str | None = None,
        recurrence_rule: str | None = None,
        category: str = "",
        is_recurring: bool = False,
        recur_reset_hour: int = 0,
        quantity: float = 1.0,
        unit: str = "",
        price: float | None = None,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Create a new task in a to-do list.

        For shopping lists, if an active task with the same title already
        exists the quantity is incremented instead of creating a duplicate.
        The returned task carries ``_merged = True`` so the caller can
        distinguish a merge from a fresh creation.
        """
        planner_list = self._store.get_list(list_id)
        if planner_list is None:
            raise HomeAssistantError(f"List '{list_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "list", list_id
        )

        # ── Duplicate merge (shopping lists only) ───────────────────
        if planner_list.list_type == "shopping":
            existing_tasks = self._store.get_active_tasks(list_id=list_id)
            title_lower = title.strip().lower()
            for existing in existing_tasks:
                if (
                    existing.title.strip().lower() == title_lower
                    and not existing.completed
                    and existing.deleted_at is None
                ):
                    existing.quantity += quantity
                    existing.updated_at = datetime.now(UTC).isoformat()
                    existing.version += 1
                    # Preserve unit if the incoming item has one and the
                    # existing one does not.
                    if unit and not existing.unit:
                        existing.unit = unit
                    await self._store.async_put_task(existing)
                    self._store.record_audit(
                        user_id=user_id or "",
                        action=AuditAction.UPDATE,
                        resource_type="task",
                        resource_id=existing.id,
                        detail=(
                            f"Merged duplicate '{title}' — "
                            f"quantity now {existing.quantity}"
                        ),
                    )
                    self._fire_change("update", "task", existing.id)
                    await self._store.async_save()
                    # Tag the task so callers know this was a merge.
                    existing._merged = True  # type: ignore[attr-defined]
                    return existing

        task = PlannerTask(
            list_id=list_id,
            title=title,
            note=note,
            due=due,
            related_event_id=related_event_id,
            recurrence_rule=recurrence_rule,
            category=category,
            is_recurring=is_recurring,
            recur_reset_hour=recur_reset_hour,
            quantity=quantity,
            unit=unit,
            price=price,
        )
        await self._store.async_put_task(task)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Added task '{title}' to {list_id}",
        )
        self._fire_change("create", "task", task.id)
        await self._store.async_save()
        return task

    async def async_complete_task(
        self,
        task_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Mark a task as completed."""
        task = self._store.get_task(task_id)
        if task is None or task.deleted_at is not None:
            raise HomeAssistantError(f"Task '{task_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "list", task.list_id
        )

        task.completed = True
        task.updated_at = datetime.now(UTC).isoformat()
        task.version += 1

        await self._store.async_put_task(task)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.COMPLETE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Completed task '{task.title}'",
        )
        self._fire_change("complete", "task", task.id)
        await self._store.async_save()
        return task

    async def async_uncomplete_task(
        self,
        task_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Mark a completed task as not completed."""
        task = self._store.get_task(task_id)
        if task is None or task.deleted_at is not None:
            raise HomeAssistantError(f"Task '{task_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "list", task.list_id
        )

        task.completed = False
        task.updated_at = datetime.now(UTC).isoformat()
        task.version += 1

        await self._store.async_put_task(task)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UNCOMPLETE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Uncompleted task '{task.title}'",
        )
        self._fire_change("uncomplete", "task", task.id)
        await self._store.async_save()
        return task

    async def async_update_task(
        self,
        task_id: str,
        version: int,
        title: str | None = None,
        note: str | None = None,
        due: str | None = None,
        recurrence_rule: str | None = None,
        list_id: str | None = None,
        completed: bool | None = None,
        category: str | None = None,
        is_recurring: bool | None = None,
        recur_reset_hour: int | None = None,
        quantity: float | None = None,
        unit: str | None = None,
        price: float | None = None,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Update an existing task (optimistic locking)."""
        task = self._store.get_task(task_id)
        if task is None or task.deleted_at is not None:
            raise HomeAssistantError(f"Task '{task_id}' not found")

        if task.version != version:
            raise HomeAssistantError(
                f"Version conflict: expected {version}, current is {task.version}. "
                "Reload and try again."
            )

        await async_require_write(
            self._hass, self._store, user_id, "list", task.list_id
        )

        # If moving to a different list, verify it exists.
        if list_id is not None and list_id != task.list_id:
            if self._store.get_list(list_id) is None:
                raise HomeAssistantError(f"List '{list_id}' not found")
            await async_require_write(
                self._hass, self._store, user_id, "list", list_id
            )
            task.list_id = list_id

        if title is not None:
            task.title = title
        if note is not None:
            task.note = note
        if due is not None:
            task.due = due
        if recurrence_rule is not None:
            task.recurrence_rule = recurrence_rule if recurrence_rule else None
        if completed is not None:
            task.completed = completed
        if category is not None:
            task.category = category
        if is_recurring is not None:
            task.is_recurring = is_recurring
        if recur_reset_hour is not None:
            task.recur_reset_hour = recur_reset_hour
        if quantity is not None:
            task.quantity = quantity
        if unit is not None:
            task.unit = unit
        if price is not None:
            task.price = price

        task.updated_at = datetime.now(UTC).isoformat()
        task.version += 1

        await self._store.async_put_task(task)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Updated task '{task.title}'",
        )
        self._fire_change("update", "task", task.id)
        await self._store.async_save()
        return task

    async def async_delete_task(
        self,
        task_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Soft-delete a task."""
        task = self._store.get_task(task_id)
        if task is None:
            raise HomeAssistantError(f"Task '{task_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "list", task.list_id
        )

        self._store.soft_delete_task(task_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.DELETE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Deleted task '{task.title}'",
        )
        self._fire_change("delete", "task", task.id)
        await self._store.async_save()
        return task

    async def async_restore_task(
        self,
        task_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Restore a soft-deleted task."""
        task = self._store.get_task(task_id)
        if task is None:
            raise HomeAssistantError(f"Task '{task_id}' not found")
        if task.deleted_at is None:
            raise HomeAssistantError(f"Task '{task_id}' is not deleted")

        await async_require_write(
            self._hass, self._store, user_id, "list", task.list_id
        )

        self._store.restore_task(task_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.RESTORE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Restored task '{task.title}'",
        )
        self._fire_change("restore", "task", task.id)
        await self._store.async_save()
        return task

    # ── Template operations ─────────────────────────────────────────

    async def async_create_template(
        self,
        name: str,
        calendar_id: str,
        start_time: str,
        end_time: str,
        color: str = "#64b5f6",
        note: str = "",
        emoji: str = "",
        user_id: str | None = None,
    ) -> ShiftTemplate:
        """Create a new shift template."""
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", calendar_id
        )

        template = ShiftTemplate(
            id=_new_id(),
            name=name,
            calendar_id=calendar_id,
            start_time=start_time,
            end_time=end_time,
            color=color,
            note=note,
            emoji=emoji,
        )
        await self._store.async_put_template(template)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="template",
            resource_id=template.id,
            detail=f"Created template '{name}'",
        )

        self._fire_change("create", "template", template.id)
        await self._store.async_save()
        return template

    async def async_update_template(
        self,
        template_id: str,
        name: str | None = None,
        calendar_id: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        color: str | None = None,
        note: str | None = None,
        emoji: str | None = None,
        user_id: str | None = None,
    ) -> ShiftTemplate:
        """Update an existing shift template (preserves the template ID)."""
        template = self._store.get_template(template_id)
        if template is None:
            raise HomeAssistantError(f"Template '{template_id}' not found")

        target_calendar = calendar_id if calendar_id is not None else template.calendar_id
        if self._store.get_calendar(target_calendar) is None:
            raise HomeAssistantError(f"Calendar '{target_calendar}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", target_calendar
        )

        # Apply only the fields that were explicitly provided.
        updated = ShiftTemplate(
            id=template.id,
            name=name if name is not None else template.name,
            calendar_id=target_calendar,
            start_time=start_time if start_time is not None else template.start_time,
            end_time=end_time if end_time is not None else template.end_time,
            color=color if color is not None else template.color,
            note=note if note is not None else template.note,
            emoji=emoji if emoji is not None else template.emoji,
        )
        await self._store.async_put_template(updated)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="template",
            resource_id=updated.id,
            detail=f"Updated template '{updated.name}'",
        )

        self._fire_change("update", "template", updated.id)
        await self._store.async_save()
        return updated

    async def async_delete_template(
        self,
        template_id: str,
        user_id: str | None = None,
    ) -> ShiftTemplate:
        """Delete a shift template."""
        template = self._store.get_template(template_id)
        if template is None:
            raise HomeAssistantError(f"Template '{template_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", template.calendar_id
        )

        await self._store.async_remove_template(template_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.DELETE,
            resource_type="template",
            resource_id=template.id,
            detail=f"Deleted template '{template.name}'",
        )

        self._fire_change("delete", "template", template.id)
        await self._store.async_save()
        return template

    async def async_add_shift_from_template(
        self,
        template_id: str,
        shift_date: str,
        recurrence_rule: str | None = None,
        user_id: str | None = None,
    ) -> PlannerEvent:
        """Create a shift event from a template for a given date.

        If the template is overnight (end_time < start_time), the end
        datetime is set to the following day.
        """
        template = self._store.get_template(template_id)
        if template is None:
            raise HomeAssistantError(f"Template '{template_id}' not found")

        if self._store.get_calendar(template.calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{template.calendar_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", template.calendar_id
        )

        # Validate recurrence rule if provided.
        if recurrence_rule:
            try:
                parse_recurrence(recurrence_rule)
            except ValueError as exc:
                raise HomeAssistantError(
                    f"Invalid recurrence rule: {exc}"
                ) from exc

        target_date = date.fromisoformat(shift_date)
        start_dt = datetime.combine(target_date, datetime.strptime(template.start_time, "%H:%M").time())
        end_date = target_date + timedelta(days=1) if template.is_overnight else target_date
        end_dt = datetime.combine(end_date, datetime.strptime(template.end_time, "%H:%M").time())

        event = PlannerEvent(
            calendar_id=template.calendar_id,
            title=template.name,
            start=start_dt.isoformat(),
            end=end_dt.isoformat(),
            note=template.note,
            template_id=template.id,
            recurrence_rule=recurrence_rule,
            source="template",
        )
        await self._store.async_put_event(event)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Added shift from template '{template.name}' on {shift_date}",
        )

        self._fire_change("create", "event", event.id)
        await self._store.async_save()
        return event

    # ── Reminder snooze ──────────────────────────────────────────────

    async def async_snooze_reminder(
        self,
        event_id: str,
        minutes: int,
        user_id: str | None = None,
    ) -> None:
        """Record a snooze for a shift reminder.

        Snooze state is persisted so the notification system knows not
        to re-fire within the snooze window.  The actual re-notification
        scheduling is handled by the notify module (Milestone 4).
        """
        event = self._store.get_event(event_id)
        if event is None:
            raise HomeAssistantError(f"Event '{event_id}' not found")

        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.SNOOZE,
            resource_type="event",
            resource_id=event.id,
            detail=f"Snoozed reminder {minutes}min for '{event.title}'",
        )
        self._fire_change("snooze", "event", event.id)
        await self._store.async_save()

    # ── Recurring task processing ───────────────────────────────────

    async def async_process_recurring_shopping_items(self) -> int:
        """Reset completed "always items" whose reset hour has arrived.

        Returns the count of items that were reset.
        """
        now = datetime.now(UTC)
        current_hour = now.hour
        reset_count = 0

        all_tasks = list(self._store.get_active_tasks())

        for task in all_tasks:
            if not task.is_recurring:
                continue
            if not task.completed:
                continue
            if task.recur_reset_hour != current_hour:
                continue

            task.completed = False
            task.updated_at = now.isoformat()
            task.version += 1
            await self._store.async_put_task(task)
            self._store.record_audit(
                user_id="",
                action=AuditAction.UNCOMPLETE,
                resource_type="task",
                resource_id=task.id,
                detail=(
                    f"Auto-reset recurring item '{task.title}' "
                    f"at hour {current_hour}"
                ),
            )
            self._fire_change("uncomplete", "task", task.id)
            reset_count += 1

        if reset_count:
            await self._store.async_save()
            _LOGGER.info("Auto-reset %d recurring shopping item(s)", reset_count)

        return reset_count

    async def async_process_recurring_tasks(self) -> list[PlannerTask]:
        """Scan completed recurring tasks and spawn the next occurrence.

        Returns the list of newly created tasks.
        """
        new_tasks: list[PlannerTask] = []

        # Snapshot task list to avoid mutating while iterating.
        all_tasks = list(self._store.get_active_tasks())

        for task in all_tasks:
            if not task.completed:
                continue
            if not task.recurrence_rule:
                continue
            if not task.due:
                continue

            try:
                pattern = parse_recurrence(task.recurrence_rule)
                new_due = next_due_date(task.due, pattern)
            except (ValueError, TypeError):
                _LOGGER.warning(
                    "Skipping task %s: invalid recurrence rule %r",
                    task.id,
                    task.recurrence_rule,
                )
                continue

            new_task = PlannerTask(
                list_id=task.list_id,
                title=task.title,
                note=task.note,
                completed=False,
                due=new_due,
                recurrence_rule=task.recurrence_rule,
            )
            await self._store.async_put_task(new_task)
            self._store.record_audit(
                user_id="",
                action=AuditAction.CREATE,
                resource_type="task",
                resource_id=new_task.id,
                detail=(
                    f"Recurring task '{new_task.title}' "
                    f"spawned from {task.id} (due {new_due})"
                ),
            )

            # Clear the recurrence rule from the completed (source) task so
            # it is not processed again on the next run.
            task.recurrence_rule = None
            task.updated_at = datetime.now(UTC).isoformat()
            task.version += 1
            await self._store.async_put_task(task)

            self._fire_change("create", "task", new_task.id)
            new_tasks.append(new_task)

        if new_tasks:
            await self._store.async_save()
            _LOGGER.info("Spawned %d recurring task(s)", len(new_tasks))

        return new_tasks

    # ── Task-event linking ──────────────────────────────────────────

    async def async_link_task_to_event(
        self,
        task_id: str,
        event_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Link a task to a calendar event."""
        task = self._store.get_task(task_id)
        if task is None or task.deleted_at is not None:
            raise HomeAssistantError(f"Task '{task_id}' not found")

        event = self._store.get_event(event_id)
        if event is None or event.deleted_at is not None:
            raise HomeAssistantError(f"Event '{event_id}' not found")

        task.related_event_id = event_id
        task.updated_at = datetime.now(UTC).isoformat()
        task.version += 1

        await self._store.async_put_task(task)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Linked task '{task.title}' to event '{event_id}'",
        )
        self._fire_change("update", "task", task.id)
        await self._store.async_save()
        return task

    async def async_unlink_task_from_event(
        self,
        task_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Remove the event link from a task."""
        task = self._store.get_task(task_id)
        if task is None or task.deleted_at is not None:
            raise HomeAssistantError(f"Task '{task_id}' not found")

        task.related_event_id = None
        task.updated_at = datetime.now(UTC).isoformat()
        task.version += 1

        await self._store.async_put_task(task)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="task",
            resource_id=task.id,
            detail=f"Unlinked task '{task.title}' from event",
        )
        self._fire_change("update", "task", task.id)
        await self._store.async_save()
        return task

    # ── Preset operations ─────────────────────────────────────────────

    async def async_create_preset(
        self,
        title: str,
        list_id: str,
        category: str = "",
        icon: str = "",
        note: str = "",
        user_id: str | None = None,
    ) -> TaskPreset:
        """Create a new task preset."""
        if self._store.get_list(list_id) is None:
            raise HomeAssistantError(f"List '{list_id}' not found")

        preset = TaskPreset(
            title=title,
            list_id=list_id,
            category=category,
            icon=icon,
            note=note,
        )
        await self._store.async_put_preset(preset)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="preset",
            resource_id=preset.id,
            detail=f"Created preset '{title}'",
        )
        self._fire_change("create", "preset", preset.id)
        await self._store.async_save()
        return preset

    async def async_delete_preset(
        self,
        preset_id: str,
        user_id: str | None = None,
    ) -> TaskPreset:
        """Delete a task preset."""
        preset = self._store.get_preset(preset_id)
        if preset is None:
            raise HomeAssistantError(f"Preset '{preset_id}' not found")

        await self._store.async_remove_preset(preset_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.DELETE,
            resource_type="preset",
            resource_id=preset.id,
            detail=f"Deleted preset '{preset.title}'",
        )
        self._fire_change("delete", "preset", preset.id)
        await self._store.async_save()
        return preset

    async def async_add_from_preset(
        self,
        preset_id: str,
        user_id: str | None = None,
    ) -> PlannerTask:
        """Create a task from an existing preset (one-tap quick-add)."""
        preset = self._store.get_preset(preset_id)
        if preset is None:
            raise HomeAssistantError(f"Preset '{preset_id}' not found")

        return await self.async_add_task(
            list_id=preset.list_id,
            title=preset.title,
            note=preset.note,
            category=preset.category,
            user_id=user_id,
        )

    # ── Routine operations ──────────────────────────────────────────────

    async def async_create_routine(
        self,
        name: str,
        emoji: str = "",
        description: str = "",
        shift_template_id: str | None = None,
        tasks: list[dict] | None = None,
        shopping_items: list[dict] | None = None,
        user_id: str | None = None,
    ) -> Routine:
        """Create a new routine."""
        routine = Routine(
            name=name,
            emoji=emoji,
            description=description,
            shift_template_id=shift_template_id,
            tasks=tasks or [],
            shopping_items=shopping_items or [],
        )
        await self._store.async_put_routine(routine)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="routine",
            resource_id=routine.id,
            detail=f"Created routine '{name}'",
        )
        self._fire_change("create", "routine", routine.id)
        await self._store.async_save()
        return routine

    async def async_update_routine(
        self,
        routine_id: str,
        name: str | None = None,
        emoji: str | None = None,
        description: str | None = None,
        shift_template_id: str | None = ...,  # type: ignore[assignment]
        tasks: list[dict] | None = None,
        shopping_items: list[dict] | None = None,
        user_id: str | None = None,
    ) -> Routine:
        """Update an existing routine."""
        routine = self._store.get_routine(routine_id)
        if routine is None:
            raise HomeAssistantError(f"Routine '{routine_id}' not found")

        if name is not None:
            routine.name = name
        if emoji is not None:
            routine.emoji = emoji
        if description is not None:
            routine.description = description
        if shift_template_id is not ...:
            routine.shift_template_id = shift_template_id
        if tasks is not None:
            routine.tasks = tasks
        if shopping_items is not None:
            routine.shopping_items = shopping_items

        await self._store.async_put_routine(routine)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="routine",
            resource_id=routine.id,
            detail=f"Updated routine '{routine.name}'",
        )
        self._fire_change("update", "routine", routine.id)
        await self._store.async_save()
        return routine

    async def async_delete_routine(
        self,
        routine_id: str,
        user_id: str | None = None,
    ) -> Routine:
        """Delete a routine."""
        routine = self._store.get_routine(routine_id)
        if routine is None:
            raise HomeAssistantError(f"Routine '{routine_id}' not found")

        await self._store.async_remove_routine(routine_id)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.DELETE,
            resource_type="routine",
            resource_id=routine.id,
            detail=f"Deleted routine '{routine.name}'",
        )
        self._fire_change("delete", "routine", routine.id)
        await self._store.async_save()
        return routine

    async def async_execute_routine(
        self,
        routine_id: str,
        target_date: str,
        user_id: str | None = None,
    ) -> dict:
        """Execute a routine: create shift, tasks, and shopping items.

        Returns a summary dict with the created resource IDs.
        """
        routine = self._store.get_routine(routine_id)
        if routine is None:
            raise HomeAssistantError(f"Routine '{routine_id}' not found")

        result: dict = {
            "routine_id": routine_id,
            "routine_name": routine.name,
            "shift_id": None,
            "task_ids": [],
            "shopping_item_ids": [],
        }

        # 1. Create shift from template (if configured).
        if routine.shift_template_id:
            try:
                event = await self.async_add_shift_from_template(
                    template_id=routine.shift_template_id,
                    shift_date=target_date,
                    user_id=user_id,
                )
                result["shift_id"] = event.id
            except HomeAssistantError as exc:
                _LOGGER.warning(
                    "Routine '%s': failed to create shift: %s",
                    routine.name,
                    exc,
                )

        # 2. Create tasks.
        try:
            dt = date.fromisoformat(target_date)
        except ValueError as exc:
            raise HomeAssistantError(
                f"Invalid date format '{target_date}': expected ISO 8601 date (YYYY-MM-DD)"
            ) from exc
        for task_def in routine.tasks:
            offset = task_def.get("due_offset_days", 0)
            due_date = (dt + timedelta(days=offset)).isoformat()
            try:
                task = await self.async_add_task(
                    list_id=task_def.get("list_id", "inbox"),
                    title=task_def.get("title", ""),
                    due=due_date,
                    user_id=user_id,
                )
                result["task_ids"].append(task.id)
            except HomeAssistantError as exc:
                _LOGGER.warning(
                    "Routine '%s': failed to create task '%s': %s",
                    routine.name,
                    task_def.get("title"),
                    exc,
                )

        # 3. Create shopping items (uses duplicate merge automatically).
        shopping_list = None
        for lst in self._store.get_lists().values():
            if lst.list_type == "shopping":
                shopping_list = lst
                break
        shopping_list_id = shopping_list.id if shopping_list else "shopping"

        for item_def in routine.shopping_items:
            try:
                raw_qty = item_def.get("quantity", 1.0)
                try:
                    qty = float(raw_qty)
                except (TypeError, ValueError):
                    qty = 1.0
                qty = max(0.1, qty)

                task = await self.async_add_task(
                    list_id=shopping_list_id,
                    title=item_def.get("title", ""),
                    category=item_def.get("category", ""),
                    quantity=qty,
                    unit=item_def.get("unit", ""),
                    user_id=user_id,
                )
                result["shopping_item_ids"].append(task.id)
            except HomeAssistantError as exc:
                _LOGGER.warning(
                    "Routine '%s': failed to create shopping item '%s': %s",
                    routine.name,
                    item_def.get("title"),
                    exc,
                )

        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.CREATE,
            resource_type="routine",
            resource_id=routine.id,
            detail=f"Executed routine '{routine.name}' for {target_date}",
        )
        self._fire_change("execute", "routine", routine.id)
        await self._store.async_save()

        return result

    # ── Privacy controls ──────────────────────────────────────────────

    async def async_set_calendar_private(
        self,
        calendar_id: str,
        is_private: bool,
        user_id: str | None = None,
    ) -> None:
        """Toggle the privacy flag on a calendar."""
        cal = self._store.get_calendar(calendar_id)
        if cal is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "calendar", calendar_id
        )

        cal.is_private = is_private
        await self._store.async_put_calendar(cal)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="calendar",
            resource_id=calendar_id,
            detail=f"Set calendar '{cal.name}' private={is_private}",
        )
        self._fire_change("update", "calendar", calendar_id)
        await self._store.async_save()

    async def async_set_list_private(
        self,
        list_id: str,
        is_private: bool,
        user_id: str | None = None,
    ) -> None:
        """Toggle the privacy flag on a to-do list."""
        lst = self._store.get_list(list_id)
        if lst is None:
            raise HomeAssistantError(f"List '{list_id}' not found")

        await async_require_write(
            self._hass, self._store, user_id, "list", list_id
        )

        lst.is_private = is_private
        await self._store.async_put_list(lst)
        self._store.record_audit(
            user_id=user_id or "",
            action=AuditAction.UPDATE,
            resource_type="list",
            resource_id=list_id,
            detail=f"Set list '{lst.name}' private={is_private}",
        )
        self._fire_change("update", "list", list_id)
        await self._store.async_save()

    # ── Recurring event expansion ──────────────────────────────────

    def expand_recurring_events(
        self,
        start_date: date,
        end_date: date,
        calendar_id: str | None = None,
    ) -> list[PlannerEvent]:
        """Generate virtual event instances from recurring events in a date range.

        Returns both non-recurring events within the range and expanded
        virtual instances of recurring events.  Virtual instances carry
        the parent event's id prefixed with the occurrence date so the
        frontend can distinguish them.
        """
        all_events = self._store.get_active_events(calendar_id=calendar_id)
        result: list[PlannerEvent] = []

        for ev in all_events:
            if not ev.recurrence_rule:
                # Non-recurring: include if it overlaps the range.
                try:
                    ev_start = datetime.fromisoformat(ev.start).date() if ev.start else None
                    ev_end = datetime.fromisoformat(ev.end).date() if ev.end else ev_start
                except (ValueError, TypeError):
                    ev_start = ev_end = None

                if ev_start is None:
                    result.append(ev)
                    continue
                if ev_end >= start_date and ev_start <= end_date:
                    result.append(ev)
                continue

            # Recurring event: expand occurrences.
            try:
                pattern = parse_recurrence(ev.recurrence_rule)
            except ValueError:
                result.append(ev)
                continue

            # Compute event duration so we can replicate it for each occurrence.
            try:
                ev_start_dt = datetime.fromisoformat(ev.start)
                ev_end_dt = datetime.fromisoformat(ev.end)
                duration = ev_end_dt - ev_start_dt
            except (ValueError, TypeError):
                result.append(ev)
                continue

            # Walk from the original start date forward, generating
            # occurrences up to end_date.
            current_date_str = ev.start[:10]  # YYYY-MM-DD
            max_iterations = 400  # safety cap

            for _ in range(max_iterations):
                try:
                    occ_date = date.fromisoformat(current_date_str)
                except (ValueError, TypeError):
                    break

                if occ_date > end_date:
                    break

                if occ_date >= start_date:
                    # Build a virtual event for this occurrence.
                    occ_start = datetime.combine(
                        occ_date, ev_start_dt.time(),
                    )
                    if ev_start_dt.tzinfo:
                        occ_start = occ_start.replace(tzinfo=ev_start_dt.tzinfo)
                    occ_end = occ_start + duration

                    virtual = PlannerEvent(
                        id=f"{ev.id}_{occ_date.isoformat()}",
                        calendar_id=ev.calendar_id,
                        title=ev.title,
                        start=occ_start.isoformat(),
                        end=occ_end.isoformat(),
                        all_day=ev.all_day,
                        note=ev.note,
                        template_id=ev.template_id,
                        source=ev.source,
                        external_id=ev.external_id,
                        recurrence_rule=ev.recurrence_rule,
                        created_at=ev.created_at,
                        updated_at=ev.updated_at,
                        version=ev.version,
                        deleted_at=ev.deleted_at,
                    )
                    result.append(virtual)

                # Advance to next occurrence.
                try:
                    current_date_str = next_due_date(current_date_str, pattern)
                except (ValueError, TypeError):
                    break

        return result

    # ── Roster import ───────────────────────────────────────────────

    async def async_import_csv(
        self,
        calendar_id: str,
        csv_data: str,
        source: str = "csv",
        user_id: str | None = None,
    ) -> ImportResult:
        """Import shifts from CSV data into a calendar.

        Parses the CSV, then upserts each shift via ``async_upsert_shift``
        so re-imports are idempotent.
        """
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        parsed = parse_csv(csv_data)
        return await self._run_import(calendar_id, parsed, source, user_id)

    async def async_import_ics(
        self,
        calendar_id: str,
        ics_data: str,
        source: str = "ics",
        user_id: str | None = None,
    ) -> ImportResult:
        """Import shifts from ICS (iCalendar) data into a calendar.

        Parses the ICS, then upserts each shift via ``async_upsert_shift``
        so re-imports are idempotent.
        """
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        parsed = parse_ics(ics_data)
        return await self._run_import(calendar_id, parsed, source, user_id)

    async def _run_import(
        self,
        calendar_id: str,
        parsed: list[dict[str, str]],
        source: str,
        user_id: str | None,
    ) -> ImportResult:
        """Execute the import loop over parsed shift dicts."""
        result = ImportResult()

        for shift in parsed:
            external_id = shift.get("external_id", "")
            if not external_id:
                result.errors += 1
                result.error_details.append(
                    f"Missing external_id for shift '{shift.get('title', '?')}'"
                )
                continue

            # Check if this shift already exists with identical data.
            existing = self._store.find_event_by_source(source, external_id)
            if existing and (
                existing.title == shift.get("title", "")
                and existing.start == shift.get("start", "")
                and existing.end == shift.get("end", "")
                and existing.note == shift.get("note", "")
                and existing.calendar_id == calendar_id
            ):
                result.skipped += 1
                continue

            try:
                if existing:
                    await self.async_upsert_shift(
                        calendar_id=calendar_id,
                        external_id=external_id,
                        source=source,
                        title=shift.get("title", ""),
                        start=shift.get("start", ""),
                        end=shift.get("end", ""),
                        note=shift.get("note", ""),
                        user_id=user_id,
                    )
                    result.updated += 1
                else:
                    await self.async_upsert_shift(
                        calendar_id=calendar_id,
                        external_id=external_id,
                        source=source,
                        title=shift.get("title", ""),
                        start=shift.get("start", ""),
                        end=shift.get("end", ""),
                        note=shift.get("note", ""),
                        user_id=user_id,
                    )
                    result.created += 1
            except Exception as exc:
                result.errors += 1
                result.error_details.append(
                    f"Error importing '{shift.get('title', '?')}': {exc}"
                )
                _LOGGER.warning("Import error for shift %s: %s", external_id, exc)

        return result

    def _preview_import(
        self,
        calendar_id: str,
        parsed: list[dict[str, str]],
        source: str,
    ) -> ImportResult:
        """Compute import counts without writing (dry run)."""
        result = ImportResult(dry_run=True)

        for shift in parsed:
            external_id = shift.get("external_id", "")
            if not external_id:
                result.errors += 1
                result.error_details.append(
                    f"Missing external_id for shift '{shift.get('title', '?')}'"
                )
                continue

            existing = self._store.find_event_by_source(source, external_id)
            if existing and (
                existing.title == shift.get("title", "")
                and existing.start == shift.get("start", "")
                and existing.end == shift.get("end", "")
                and existing.note == shift.get("note", "")
                and existing.calendar_id == calendar_id
            ):
                result.skipped += 1
            elif existing:
                result.updated += 1
            else:
                result.created += 1

        return result

    async def async_preview_import_csv(
        self,
        calendar_id: str,
        csv_data: str,
        source: str = "csv",
    ) -> ImportResult:
        """Parse CSV and return counts without writing."""
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        parsed = parse_csv(csv_data)
        return self._preview_import(calendar_id, parsed, source)

    async def async_preview_import_ics(
        self,
        calendar_id: str,
        ics_data: str,
        source: str = "ics",
    ) -> ImportResult:
        """Parse ICS and return counts without writing."""
        if self._store.get_calendar(calendar_id) is None:
            raise HomeAssistantError(f"Calendar '{calendar_id}' not found")

        parsed = parse_ics(ics_data)
        return self._preview_import(calendar_id, parsed, source)

    # ── Service handlers (thin wrappers) ─────────────────────────────

    async def _handle_add_shift(self, call: ServiceCall) -> None:
        await self.async_add_shift(
            calendar_id=call.data[ATTR_CALENDAR_ID],
            title=call.data[ATTR_SHIFT_TITLE],
            start=call.data[ATTR_SHIFT_START],
            end=call.data[ATTR_SHIFT_END],
            note=call.data.get(ATTR_SHIFT_NOTE, ""),
            template_id=call.data.get(ATTR_TEMPLATE_ID),
            recurrence_rule=call.data.get("recurrence_rule"),
            user_id=call.context.user_id,
        )

    async def _handle_upsert_shift(self, call: ServiceCall) -> None:
        await self.async_upsert_shift(
            calendar_id=call.data[ATTR_CALENDAR_ID],
            external_id=call.data[ATTR_EXTERNAL_ID],
            source=call.data[ATTR_SOURCE],
            title=call.data[ATTR_SHIFT_TITLE],
            start=call.data[ATTR_SHIFT_START],
            end=call.data[ATTR_SHIFT_END],
            note=call.data.get(ATTR_SHIFT_NOTE, ""),
            user_id=call.context.user_id,
        )

    async def _handle_update_shift(self, call: ServiceCall) -> None:
        await self.async_update_shift(
            event_id=call.data[ATTR_EVENT_ID],
            version=call.data[ATTR_VERSION],
            title=call.data.get(ATTR_SHIFT_TITLE),
            start=call.data.get(ATTR_SHIFT_START),
            end=call.data.get(ATTR_SHIFT_END),
            note=call.data.get(ATTR_SHIFT_NOTE),
            recurrence_rule=call.data.get("recurrence_rule"),
            user_id=call.context.user_id,
        )

    async def _handle_delete_shift(self, call: ServiceCall) -> None:
        await self.async_delete_shift(
            event_id=call.data[ATTR_EVENT_ID],
            user_id=call.context.user_id,
        )

    async def _handle_restore_shift(self, call: ServiceCall) -> None:
        await self.async_restore_shift(
            event_id=call.data[ATTR_EVENT_ID],
            user_id=call.context.user_id,
        )

    async def _handle_add_task(self, call: ServiceCall) -> None:
        await self.async_add_task(
            list_id=call.data[ATTR_LIST_ID],
            title=call.data[ATTR_SHIFT_TITLE],
            note=call.data.get(ATTR_SHIFT_NOTE, ""),
            due=call.data.get("due"),
            related_event_id=call.data.get("related_event_id"),
            user_id=call.context.user_id,
        )

    async def _handle_complete_task(self, call: ServiceCall) -> None:
        await self.async_complete_task(
            task_id=call.data[ATTR_TASK_ID],
            user_id=call.context.user_id,
        )

    async def _handle_uncomplete_task(self, call: ServiceCall) -> None:
        await self.async_uncomplete_task(
            task_id=call.data[ATTR_TASK_ID],
            user_id=call.context.user_id,
        )

    async def _handle_update_task(self, call: ServiceCall) -> None:
        await self.async_update_task(
            task_id=call.data[ATTR_TASK_ID],
            version=call.data[ATTR_VERSION],
            title=call.data.get(ATTR_SHIFT_TITLE),
            note=call.data.get(ATTR_SHIFT_NOTE),
            due=call.data.get("due"),
            list_id=call.data.get(ATTR_LIST_ID),
            completed=call.data.get("completed"),
            user_id=call.context.user_id,
        )

    async def _handle_delete_task(self, call: ServiceCall) -> None:
        await self.async_delete_task(
            task_id=call.data[ATTR_TASK_ID],
            user_id=call.context.user_id,
        )

    async def _handle_restore_task(self, call: ServiceCall) -> None:
        await self.async_restore_task(
            task_id=call.data[ATTR_TASK_ID],
            user_id=call.context.user_id,
        )

    async def _handle_snooze_reminder(self, call: ServiceCall) -> None:
        await self.async_snooze_reminder(
            event_id=call.data[ATTR_EVENT_ID],
            minutes=call.data[ATTR_SNOOZE_MINUTES],
            user_id=call.context.user_id,
        )

    async def _handle_create_template(self, call: ServiceCall) -> None:
        await self.async_create_template(
            name=call.data[ATTR_TEMPLATE_NAME],
            calendar_id=call.data[ATTR_CALENDAR_ID],
            start_time=call.data[ATTR_TEMPLATE_START_TIME],
            end_time=call.data[ATTR_TEMPLATE_END_TIME],
            color=call.data.get(ATTR_TEMPLATE_COLOR, "#64b5f6"),
            note=call.data.get(ATTR_SHIFT_NOTE, ""),
            emoji=call.data.get("emoji", ""),
            user_id=call.context.user_id,
        )

    async def _handle_update_template(self, call: ServiceCall) -> None:
        await self.async_update_template(
            template_id=call.data[ATTR_TEMPLATE_ID],
            name=call.data.get(ATTR_TEMPLATE_NAME),
            calendar_id=call.data.get(ATTR_CALENDAR_ID),
            start_time=call.data.get(ATTR_TEMPLATE_START_TIME),
            end_time=call.data.get(ATTR_TEMPLATE_END_TIME),
            color=call.data.get(ATTR_TEMPLATE_COLOR),
            note=call.data.get(ATTR_SHIFT_NOTE),
            emoji=call.data.get("emoji"),
            user_id=call.context.user_id,
        )

    async def _handle_delete_template(self, call: ServiceCall) -> None:
        await self.async_delete_template(
            template_id=call.data[ATTR_TEMPLATE_ID],
            user_id=call.context.user_id,
        )

    async def _handle_add_shift_from_template(self, call: ServiceCall) -> None:
        await self.async_add_shift_from_template(
            template_id=call.data[ATTR_TEMPLATE_ID],
            shift_date=call.data[ATTR_DATE],
            recurrence_rule=call.data.get("recurrence_rule"),
            user_id=call.context.user_id,
        )

    async def _handle_link_task_to_event(self, call: ServiceCall) -> None:
        await self.async_link_task_to_event(
            task_id=call.data[ATTR_TASK_ID],
            event_id=call.data[ATTR_EVENT_ID],
            user_id=call.context.user_id,
        )

    async def _handle_unlink_task_from_event(self, call: ServiceCall) -> None:
        await self.async_unlink_task_from_event(
            task_id=call.data[ATTR_TASK_ID],
            user_id=call.context.user_id,
        )

    async def _handle_create_preset(self, call: ServiceCall) -> None:
        await self.async_create_preset(
            title=call.data[ATTR_SHIFT_TITLE],
            list_id=call.data[ATTR_LIST_ID],
            category=call.data.get(ATTR_PRESET_CATEGORY, ""),
            icon=call.data.get(ATTR_PRESET_ICON, ""),
            note=call.data.get(ATTR_SHIFT_NOTE, ""),
            user_id=call.context.user_id,
        )

    async def _handle_delete_preset(self, call: ServiceCall) -> None:
        await self.async_delete_preset(
            preset_id=call.data[ATTR_PRESET_ID],
            user_id=call.context.user_id,
        )

    async def _handle_add_from_preset(self, call: ServiceCall) -> None:
        await self.async_add_from_preset(
            preset_id=call.data[ATTR_PRESET_ID],
            user_id=call.context.user_id,
        )

    async def _handle_import_csv(self, call: ServiceCall) -> None:
        if call.data.get("dry_run", False):
            await self.async_preview_import_csv(
                calendar_id=call.data[ATTR_CALENDAR_ID],
                csv_data=call.data[ATTR_IMPORT_DATA],
                source=call.data.get(ATTR_SOURCE, "csv"),
            )
        else:
            await self.async_import_csv(
                calendar_id=call.data[ATTR_CALENDAR_ID],
                csv_data=call.data[ATTR_IMPORT_DATA],
                source=call.data.get(ATTR_SOURCE, "csv"),
                user_id=call.context.user_id,
            )

    async def _handle_import_ics(self, call: ServiceCall) -> None:
        if call.data.get("dry_run", False):
            await self.async_preview_import_ics(
                calendar_id=call.data[ATTR_CALENDAR_ID],
                ics_data=call.data[ATTR_IMPORT_DATA],
                source=call.data.get(ATTR_SOURCE, "ics"),
            )
        else:
            await self.async_import_ics(
                calendar_id=call.data[ATTR_CALENDAR_ID],
                ics_data=call.data[ATTR_IMPORT_DATA],
                source=call.data.get(ATTR_SOURCE, "ics"),
                user_id=call.context.user_id,
            )

    async def _handle_set_calendar_private(self, call: ServiceCall) -> None:
        await self.async_set_calendar_private(
            calendar_id=call.data[ATTR_CALENDAR_ID],
            is_private=call.data["is_private"],
            user_id=call.context.user_id,
        )

    async def _handle_set_list_private(self, call: ServiceCall) -> None:
        await self.async_set_list_private(
            list_id=call.data[ATTR_LIST_ID],
            is_private=call.data["is_private"],
            user_id=call.context.user_id,
        )

    async def _handle_create_routine(self, call: ServiceCall) -> None:
        tasks = call.data.get("tasks", [])
        if isinstance(tasks, str):
            try:
                tasks = json.loads(tasks)
            except json.JSONDecodeError as exc:
                raise HomeAssistantError(
                    f"Invalid JSON for tasks: {exc}"
                ) from exc
        shopping_items = call.data.get("shopping_items", [])
        if isinstance(shopping_items, str):
            try:
                shopping_items = json.loads(shopping_items)
            except json.JSONDecodeError as exc:
                raise HomeAssistantError(
                    f"Invalid JSON for shopping_items: {exc}"
                ) from exc
        await self.async_create_routine(
            name=call.data["name"],
            emoji=call.data.get("emoji", ""),
            description=call.data.get("description", ""),
            shift_template_id=call.data.get("shift_template_id"),
            tasks=tasks,
            shopping_items=shopping_items,
            user_id=call.context.user_id,
        )

    async def _handle_update_routine(self, call: ServiceCall) -> None:
        tasks = call.data.get("tasks")
        if isinstance(tasks, str):
            try:
                tasks = json.loads(tasks)
            except json.JSONDecodeError as exc:
                raise HomeAssistantError(
                    f"Invalid JSON for tasks: {exc}"
                ) from exc
        shopping_items = call.data.get("shopping_items")
        if isinstance(shopping_items, str):
            try:
                shopping_items = json.loads(shopping_items)
            except json.JSONDecodeError as exc:
                raise HomeAssistantError(
                    f"Invalid JSON for shopping_items: {exc}"
                ) from exc
        await self.async_update_routine(
            routine_id=call.data["routine_id"],
            name=call.data.get("name"),
            emoji=call.data.get("emoji"),
            description=call.data.get("description"),
            shift_template_id=call.data.get("shift_template_id", ...),
            tasks=tasks,
            shopping_items=shopping_items,
            user_id=call.context.user_id,
        )

    async def _handle_delete_routine(self, call: ServiceCall) -> None:
        await self.async_delete_routine(
            routine_id=call.data["routine_id"],
            user_id=call.context.user_id,
        )

    async def _handle_execute_routine(self, call: ServiceCall) -> None:
        await self.async_execute_routine(
            routine_id=call.data["routine_id"],
            target_date=call.data["date"],
            user_id=call.context.user_id,
        )

    # ── Internal helpers ─────────────────────────────────────────────

    @callback
    def _fire_change(self, action: str, resource_type: str, resource_id: str) -> None:
        """Fire a bus event so WS subscribers get notified."""
        self._hass.bus.async_fire(
            "calee_changed",
            {
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
            },
        )
