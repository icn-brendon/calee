"""Tests for permission enforcement, deny-by-default behaviour, and
restore (undo soft-delete) services.

Store-level tests use the FakeStore from conftest directly.
API-level tests use a lightweight FakeHass to avoid requiring a full
Home Assistant instance.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from custom_components.calee.api import PlannerAPI
from custom_components.calee.const import PlannerRole
from custom_components.calee.models import PlannerEvent, PlannerTask, RoleAssignment
from custom_components.calee.permissions import can_read, can_write

# ── Lightweight HA fakes ────────────���───────────────────────────────


class _FakeBus:
    """Records bus events without needing a real HA event loop."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def async_fire(self, event_type: str, data: dict) -> None:
        self.events.append((event_type, data))


class _FakeUser:
    """Stub HA user with configurable admin flag."""

    def __init__(self, *, is_admin: bool = False) -> None:
        self.is_admin = is_admin


class _FakeAuth:
    """Stub auth that returns a non-admin user by default."""

    def __init__(self, *, is_admin: bool = False) -> None:
        self._is_admin = is_admin

    async def async_get_user(self, user_id: str):
        return _FakeUser(is_admin=self._is_admin)


class _FakeHass:
    """Minimal stand-in for HomeAssistant used by PlannerAPI."""

    def __init__(self, *, is_admin: bool = False) -> None:
        self.bus = _FakeBus()
        self.auth = _FakeAuth(is_admin=is_admin)


# ── Fixtures ────────────────────���───────────────────────────────────


@pytest.fixture
def hass() -> _FakeHass:
    """Return a FakeHass whose auth returns a non-admin user."""
    return _FakeHass(is_admin=False)


@pytest.fixture
def admin_hass() -> _FakeHass:
    """Return a FakeHass whose auth returns an admin user."""
    return _FakeHass(is_admin=True)


@pytest.fixture
def api(hass, fake_store) -> PlannerAPI:
    return PlannerAPI(hass, fake_store)


@pytest.fixture
def admin_api(admin_hass, fake_store) -> PlannerAPI:
    return PlannerAPI(admin_hass, fake_store)


# ── Permission: deny-by-default for writes when roles exist ────────


class TestWriteDeniedForViewer:
    """When a user has the viewer role, writes must be denied."""

    def test_viewer_cannot_write(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="viewer_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.VIEWER,
            )
        )
        assert can_write(fake_store, "viewer_user", "calendar", "work_shifts") is False

    def test_viewer_can_still_read(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="viewer_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.VIEWER,
            )
        )
        assert can_read(fake_store, "viewer_user", "calendar", "work_shifts") is True

    @pytest.mark.asyncio
    async def test_api_rejects_shift_creation_for_viewer(self, hass, fake_store) -> None:
        """Viewer cannot create a shift via the API."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="viewer_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.VIEWER,
            )
        )
        api = PlannerAPI(hass, fake_store)

        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="does not have write access"):
            await api.async_add_shift(
                calendar_id="work_shifts",
                title="Test Shift",
                start="2026-04-07T06:00:00",
                end="2026-04-07T14:00:00",
                user_id="viewer_user",
            )

    @pytest.mark.asyncio
    async def test_api_rejects_task_creation_for_viewer(self, hass, fake_store) -> None:
        """Viewer cannot create a task via the API."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="viewer_user",
                resource_type="list",
                resource_id="inbox",
                role=PlannerRole.VIEWER,
            )
        )
        api = PlannerAPI(hass, fake_store)

        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="does not have write access"):
            await api.async_add_task(
                list_id="inbox",
                title="Buy milk",
                user_id="viewer_user",
            )


class TestWriteAllowedNoRoles:
    """When no roles are configured (family default), everyone can write."""

    def test_write_allowed_no_roles(self, fake_store) -> None:
        assert len(fake_store.roles) == 0
        assert can_write(fake_store, "any_user", "calendar", "work_shifts") is True

    def test_read_allowed_no_roles(self, fake_store) -> None:
        assert len(fake_store.roles) == 0
        assert can_read(fake_store, "any_user", "calendar", "work_shifts") is True

    @pytest.mark.asyncio
    async def test_api_allows_shift_creation_no_roles(self, hass, fake_store) -> None:
        """Without roles, any non-admin user can still create shifts."""
        api = PlannerAPI(hass, fake_store)
        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Morning Shift",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            user_id="family_member",
        )
        assert event.title == "Morning Shift"
        assert event.calendar_id == "work_shifts"


class TestWriteAllowedForEditorOwner:
    """Users with editor or owner roles can write."""

    @pytest.mark.asyncio
    async def test_editor_can_create_shift(self, hass, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="editor_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        api = PlannerAPI(hass, fake_store)

        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Editor Shift",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            user_id="editor_user",
        )
        assert event.title == "Editor Shift"

    @pytest.mark.asyncio
    async def test_owner_can_create_shift(self, hass, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="owner_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.OWNER,
            )
        )
        api = PlannerAPI(hass, fake_store)

        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Owner Shift",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            user_id="owner_user",
        )
        assert event.title == "Owner Shift"

    @pytest.mark.asyncio
    async def test_admin_bypasses_roles(self, admin_hass, fake_store) -> None:
        """HA admin users always pass permission checks."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="admin_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.VIEWER,  # deliberately viewer
            )
        )
        api = PlannerAPI(admin_hass, fake_store)

        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Admin Override",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            user_id="admin_user",
        )
        assert event.title == "Admin Override"


class TestWriteDeniedNoRoleWhenRolesExist:
    """Once roles are configured, a user without any role is denied writes."""

    def test_user_without_role_denied_when_roles_exist(self, fake_store) -> None:
        # Someone else has a role — so the system is "roles-active".
        fake_store.roles.append(
            RoleAssignment(
                user_id="other_user",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        assert can_write(fake_store, "unassigned_user", "calendar", "work_shifts") is False


# ── Restore services ───────────────────────────────────────────────


class TestRestoreShift:
    """Test the restore_shift API method."""

    @pytest.mark.asyncio
    async def test_restore_deleted_shift(self, admin_api, fake_store) -> None:
        """Restoring a soft-deleted shift clears deleted_at."""
        event = PlannerEvent(
            id="evt_restore_001",
            calendar_id="work_shifts",
            title="Deleted Shift",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            deleted_at=datetime.now(UTC).isoformat(),
        )
        await fake_store.async_put_event(event)
        original_version = event.version

        restored = await admin_api.async_restore_shift(
            event_id="evt_restore_001",
            user_id="admin_user",
        )
        assert restored.deleted_at is None
        assert restored.title == "Deleted Shift"
        assert restored.version == original_version + 1

    @pytest.mark.asyncio
    async def test_restore_nonexistent_shift_raises(self, admin_api) -> None:
        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="not found"):
            await admin_api.async_restore_shift(
                event_id="nonexistent",
                user_id="admin_user",
            )

    @pytest.mark.asyncio
    async def test_restore_non_deleted_shift_raises(self, admin_api, fake_store) -> None:
        """Restoring a shift that is not deleted should fail."""
        event = PlannerEvent(
            id="evt_active_001",
            calendar_id="work_shifts",
            title="Active Shift",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            deleted_at=None,
        )
        await fake_store.async_put_event(event)

        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="is not deleted"):
            await admin_api.async_restore_shift(
                event_id="evt_active_001",
                user_id="admin_user",
            )

    @pytest.mark.asyncio
    async def test_restore_fires_bus_event(self, admin_api, admin_hass, fake_store) -> None:
        event = PlannerEvent(
            id="evt_bus_001",
            calendar_id="work_shifts",
            title="Bus Test",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            deleted_at=datetime.now(UTC).isoformat(),
        )
        await fake_store.async_put_event(event)

        await admin_api.async_restore_shift(
            event_id="evt_bus_001",
            user_id="admin_user",
        )

        restore_events = [
            (et, d) for et, d in admin_hass.bus.events
            if d.get("action") == "restore" and d.get("resource_type") == "event"
        ]
        assert len(restore_events) == 1

    @pytest.mark.asyncio
    async def test_restore_records_audit(self, admin_api, fake_store) -> None:
        event = PlannerEvent(
            id="evt_audit_001",
            calendar_id="work_shifts",
            title="Audit Test",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            deleted_at=datetime.now(UTC).isoformat(),
        )
        await fake_store.async_put_event(event)

        await admin_api.async_restore_shift(
            event_id="evt_audit_001",
            user_id="admin_user",
        )

        audit = fake_store.audit_log
        assert len(audit) > 0
        last = audit[-1]
        assert last["action"] == "restore"
        assert last["resource_type"] == "event"


class TestRestoreTask:
    """Test the restore_task API method."""

    @pytest.mark.asyncio
    async def test_restore_deleted_task(self, admin_api, fake_store) -> None:
        task = PlannerTask(
            id="task_restore_001",
            list_id="inbox",
            title="Deleted Task",
            deleted_at=datetime.now(UTC).isoformat(),
        )
        await fake_store.async_put_task(task)
        original_version = task.version

        restored = await admin_api.async_restore_task(
            task_id="task_restore_001",
            user_id="admin_user",
        )
        assert restored.deleted_at is None
        assert restored.title == "Deleted Task"
        assert restored.version == original_version + 1

    @pytest.mark.asyncio
    async def test_restore_nonexistent_task_raises(self, admin_api) -> None:
        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="not found"):
            await admin_api.async_restore_task(
                task_id="nonexistent",
                user_id="admin_user",
            )

    @pytest.mark.asyncio
    async def test_restore_non_deleted_task_raises(self, admin_api, fake_store) -> None:
        task = PlannerTask(
            id="task_active_001",
            list_id="inbox",
            title="Active Task",
            deleted_at=None,
        )
        await fake_store.async_put_task(task)

        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="is not deleted"):
            await admin_api.async_restore_task(
                task_id="task_active_001",
                user_id="admin_user",
            )

    @pytest.mark.asyncio
    async def test_restore_task_fires_bus_event(self, admin_api, admin_hass, fake_store) -> None:
        task = PlannerTask(
            id="task_bus_001",
            list_id="inbox",
            title="Bus Task",
            deleted_at=datetime.now(UTC).isoformat(),
        )
        await fake_store.async_put_task(task)

        await admin_api.async_restore_task(
            task_id="task_bus_001",
            user_id="admin_user",
        )

        restore_events = [
            (et, d) for et, d in admin_hass.bus.events
            if d.get("action") == "restore" and d.get("resource_type") == "task"
        ]
        assert len(restore_events) == 1

    @pytest.mark.asyncio
    async def test_restore_task_permission_denied_for_viewer(self, hass, fake_store) -> None:
        """A viewer cannot restore a soft-deleted task."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="viewer_user",
                resource_type="list",
                resource_id="inbox",
                role=PlannerRole.VIEWER,
            )
        )
        task = PlannerTask(
            id="task_perm_001",
            list_id="inbox",
            title="Restricted Task",
            deleted_at=datetime.now(UTC).isoformat(),
        )
        await fake_store.async_put_task(task)

        api = PlannerAPI(hass, fake_store)

        from homeassistant.exceptions import HomeAssistantError

        with pytest.raises(HomeAssistantError, match="does not have write access"):
            await api.async_restore_task(
                task_id="task_perm_001",
                user_id="viewer_user",
            )


class TestRestoreRoundTrip:
    """End-to-end: delete then restore via the API."""

    @pytest.mark.asyncio
    async def test_delete_then_restore_shift(self, admin_api, fake_store) -> None:
        # Create a shift.
        event = await admin_api.async_add_shift(
            calendar_id="work_shifts",
            title="Round Trip Shift",
            start="2026-04-07T06:00:00",
            end="2026-04-07T14:00:00",
            user_id="admin_user",
        )
        event_id = event.id

        # Verify it appears in active events.
        active = fake_store.get_active_events()
        assert any(e.id == event_id for e in active)

        # Soft-delete it.
        await admin_api.async_delete_shift(event_id=event_id, user_id="admin_user")
        active = fake_store.get_active_events()
        assert not any(e.id == event_id for e in active)

        # Restore it.
        restored = await admin_api.async_restore_shift(
            event_id=event_id, user_id="admin_user"
        )
        assert restored.deleted_at is None

        # Verify it's back in active events.
        active = fake_store.get_active_events()
        assert any(e.id == event_id for e in active)

    @pytest.mark.asyncio
    async def test_delete_then_restore_task(self, admin_api, fake_store) -> None:
        task = await admin_api.async_add_task(
            list_id="inbox",
            title="Round Trip Task",
            user_id="admin_user",
        )
        task_id = task.id

        active = fake_store.get_active_tasks()
        assert any(t.id == task_id for t in active)

        await admin_api.async_delete_task(task_id=task_id, user_id="admin_user")
        active = fake_store.get_active_tasks()
        assert not any(t.id == task_id for t in active)

        restored = await admin_api.async_restore_task(
            task_id=task_id, user_id="admin_user"
        )
        assert restored.deleted_at is None

        active = fake_store.get_active_tasks()
        assert any(t.id == task_id for t in active)
