"""To-do entity platform for the Calee integration.

Creates one TodoListEntity per PlannerList (Inbox, Shopping, plus any
user-created lists).  Today / Upcoming are virtual views handled by
the frontend panel, not separate entities.
"""

from __future__ import annotations

import contextlib
import logging
from datetime import UTC
from datetime import date as date_type
from datetime import datetime as datetime_type

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .api import PlannerAPI
from .const import DOMAIN
from .models import PlannerList, PlannerTask
from .store import PlannerStore

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up to-do list entities from a config entry."""
    data = hass.data[DOMAIN][entry.entry_id]
    store: PlannerStore = data["store"]
    api: PlannerAPI = data["api"]

    entities = [
        CaleeTodoEntity(store, api, entry, lst)
        for lst in store.get_lists().values()
    ]
    async_add_entities(entities, update_before_add=True)


class CaleeTodoEntity(TodoListEntity):
    """A Home Assistant to-do list entity backed by a PlannerList."""

    _attr_has_entity_name = True
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
        | TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
        | TodoListEntityFeature.MOVE_TODO_ITEM
    )

    def __init__(
        self,
        store: PlannerStore,
        api: PlannerAPI,
        entry: ConfigEntry,
        planner_list: PlannerList,
    ) -> None:
        self._store = store
        self._api = api
        self._entry = entry
        self._planner_list = planner_list
        self._attr_unique_id = f"{DOMAIN}_{planner_list.id}"
        self._attr_name = planner_list.name
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, "calee")},
            name="Calee",
            manufacturer="Calee",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def todo_items(self) -> list[TodoItem]:
        """Return the current list of to-do items, ordered by position."""
        tasks = self._store.get_active_tasks(list_id=self._planner_list.id)
        tasks.sort(key=lambda t: t.position)
        return [_to_todo_item(t) for t in tasks]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Create a new to-do item."""
        await self._api.async_add_task(
            list_id=self._planner_list.id,
            title=item.summary or "",
            due=item.due.isoformat() if item.due else None,
            note=item.description or "",
        )
        self.async_write_ha_state()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Update an existing to-do item."""
        if item.uid is None:
            return

        task = self._store.get_task(item.uid)
        if task is None or task.deleted_at is not None:
            return

        completed: bool | None = None
        if item.status is not None:
            completed = item.status == TodoItemStatus.COMPLETED

        due_str: str | None = None
        if item.due is not None:
            due_str = item.due.isoformat()

        note: str | None = None
        if item.description is not None:
            note = item.description

        await self._api.async_update_task(
            task_id=task.id,
            version=task.version,
            title=item.summary if item.summary is not None else None,
            due=due_str,
            completed=completed,
            note=note,
        )
        self.async_write_ha_state()

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Soft-delete to-do items."""
        for uid in uids:
            await self._api.async_delete_task(task_id=uid)
        self.async_write_ha_state()

    async def async_move_todo_item(
        self, uid: str, previous_uid: str | None = None
    ) -> None:
        """Reorder a to-do item within its list.

        ``previous_uid`` is the UID of the item that should appear
        immediately before the moved item, or ``None`` to move to the
        top of the list.
        """
        tasks = self._store.get_active_tasks(list_id=self._planner_list.id)
        tasks.sort(key=lambda t: t.position)

        # Build the ordered list, removing the moved item first.
        ordered = [t for t in tasks if t.id != uid]

        moved = self._store.get_task(uid)
        if moved is None or moved.deleted_at is not None:
            return

        if previous_uid is None:
            # Move to top.
            insert_idx = 0
        else:
            insert_idx = next(
                (i + 1 for i, t in enumerate(ordered) if t.id == previous_uid),
                len(ordered),
            )

        ordered.insert(insert_idx, moved)

        # Persist updated positions.
        for pos, task in enumerate(ordered):
            if task.position != pos:
                task.position = pos
                task.updated_at = datetime_type.now(UTC).isoformat()
                task.version += 1
                await self._store.async_put_task(task)

        self.async_write_ha_state()


# -- Helpers --------------------------------------------------------------


def _to_todo_item(task: PlannerTask) -> TodoItem:
    """Convert a PlannerTask to a HA TodoItem.

    If the stored ``due`` string contains a time component (``T``), parse
    as a full ``datetime``; otherwise parse as a ``date``.  This lets HA
    show the right UI for date-only vs datetime due values.
    """
    due: date_type | datetime_type | None = None
    if task.due:
        with contextlib.suppress(ValueError, TypeError):
            due = (
                datetime_type.fromisoformat(task.due)
                if "T" in task.due
                else date_type.fromisoformat(task.due[:10])
            )

    return TodoItem(
        uid=task.id,
        summary=task.title,
        status=(
            TodoItemStatus.COMPLETED if task.completed else TodoItemStatus.NEEDS_ACTION
        ),
        due=due,
        description=task.note or None,
    )
