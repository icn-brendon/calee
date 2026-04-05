"""Tests for task preset CRUD and add-from-preset workflow."""

from __future__ import annotations

import pytest

from custom_components.calee.const import DEFAULT_PRESETS
from custom_components.calee.models import TaskPreset

# ── Model round-trip ────────────────────────────────────────────────


def test_task_preset_to_dict_and_back() -> None:
    """TaskPreset round-trips through to_dict / from_dict."""
    preset = TaskPreset(
        id="p1",
        title="Milk",
        list_id="shopping",
        note="2L full cream",
        category="groceries",
        icon="mdi:cup",
    )
    d = preset.to_dict()
    restored = TaskPreset.from_dict(d)

    assert restored.id == "p1"
    assert restored.title == "Milk"
    assert restored.list_id == "shopping"
    assert restored.note == "2L full cream"
    assert restored.category == "groceries"
    assert restored.icon == "mdi:cup"


def test_task_preset_from_dict_defaults() -> None:
    """Missing optional fields fall back to empty strings."""
    minimal = {"id": "p_min"}
    preset = TaskPreset.from_dict(minimal)

    assert preset.id == "p_min"
    assert preset.title == ""
    assert preset.list_id == ""
    assert preset.note == ""
    assert preset.category == ""
    assert preset.icon == ""


# ── Default presets seeded ──────────────────────────────────────────


def test_default_presets_seeded(fake_store) -> None:
    """FakeStore seeds all DEFAULT_PRESETS on construction."""
    presets = fake_store.get_presets()
    assert len(presets) == len(DEFAULT_PRESETS)

    for preset_def in DEFAULT_PRESETS:
        preset = presets.get(preset_def["id"])
        assert preset is not None, f"Missing preset {preset_def['id']}"
        assert preset.title == preset_def["title"]
        assert preset.list_id == preset_def["list_id"]
        assert preset.category == preset_def["category"]
        assert preset.icon == preset_def["icon"]


# ── Store CRUD ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_put_and_get_preset(fake_store) -> None:
    """Inserting a preset makes it retrievable by id."""
    preset = TaskPreset(
        id="custom_1",
        title="Coffee",
        list_id="shopping",
        category="groceries",
        icon="mdi:coffee",
    )
    await fake_store.async_put_preset(preset)

    assert fake_store.get_preset("custom_1") is preset
    assert "custom_1" in fake_store.get_presets()


@pytest.mark.asyncio
async def test_remove_preset(fake_store) -> None:
    """Removing a preset makes it no longer retrievable."""
    first_id = DEFAULT_PRESETS[0]["id"]
    assert fake_store.get_preset(first_id) is not None

    await fake_store.async_remove_preset(first_id)
    assert fake_store.get_preset(first_id) is None


def test_get_preset_nonexistent(fake_store) -> None:
    """Requesting a missing preset returns None."""
    assert fake_store.get_preset("does_not_exist") is None


@pytest.mark.asyncio
async def test_put_preset_overwrites(fake_store) -> None:
    """Putting a preset with an existing id replaces it."""
    preset = TaskPreset(
        id="preset_milk",
        title="Oat Milk",
        list_id="shopping",
        category="groceries",
        icon="mdi:cup",
    )
    await fake_store.async_put_preset(preset)

    stored = fake_store.get_preset("preset_milk")
    assert stored is not None
    assert stored.title == "Oat Milk"


# ── Add from preset creates correct task ───────────────────────────


@pytest.mark.asyncio
async def test_add_from_preset_creates_task(fake_store) -> None:
    """Adding from a preset creates a task with matching title and list."""
    preset = fake_store.get_preset("preset_eggs")
    assert preset is not None

    # Simulate what the API does: create a task from the preset.
    from custom_components.calee.models import PlannerTask

    task = PlannerTask(
        list_id=preset.list_id,
        title=preset.title,
        note=preset.note,
    )
    await fake_store.async_put_task(task)

    stored_task = fake_store.get_task(task.id)
    assert stored_task is not None
    assert stored_task.title == "Eggs"
    assert stored_task.list_id == "shopping"
    assert stored_task.note == ""


# ── Preset deletion ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_preset_removes_only_target(fake_store) -> None:
    """Deleting one preset does not affect others."""
    initial_count = len(fake_store.get_presets())
    assert initial_count > 1

    await fake_store.async_remove_preset("preset_bread")
    assert fake_store.get_preset("preset_bread") is None
    assert len(fake_store.get_presets()) == initial_count - 1

    # Other presets still intact.
    assert fake_store.get_preset("preset_milk") is not None
    assert fake_store.get_preset("preset_eggs") is not None
