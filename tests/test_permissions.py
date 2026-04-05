"""Tests for the permission / role-check module."""

from custom_components.calee.const import PlannerRole
from custom_components.calee.models import RoleAssignment
from custom_components.calee.permissions import can_read, can_write, get_role


class TestGetRole:
    def test_returns_none_when_no_assignment(self, fake_store) -> None:
        assert get_role(fake_store, "user1", "calendar", "work_shifts") is None

    def test_returns_matching_role(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        assert get_role(fake_store, "user1", "calendar", "work_shifts") == PlannerRole.EDITOR

    def test_does_not_match_different_resource(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        assert get_role(fake_store, "user1", "calendar", "personal") is None


class TestCanRead:
    def test_always_readable_with_no_roles_configured(self, fake_store) -> None:
        """No roles at all — family default, everyone reads everything."""
        assert can_read(fake_store, "user1", "calendar", "work_shifts") is True

    def test_readable_as_viewer(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.VIEWER,
            )
        )
        assert can_read(fake_store, "user1", "calendar", "work_shifts") is True

    def test_readable_when_resource_has_no_assignments(self, fake_store) -> None:
        """Roles exist on OTHER resources but not on this one — allow."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="personal",
                role=PlannerRole.EDITOR,
            )
        )
        # "work_shifts" has no assignments at all — still readable.
        assert can_read(fake_store, "user2", "calendar", "work_shifts") is True

    def test_not_readable_when_resource_restricted_and_user_has_no_role(self, fake_store) -> None:
        """Resource has explicit assignments and user is not among them — deny."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        assert can_read(fake_store, "user2", "calendar", "work_shifts") is False


class TestCanWrite:
    def test_writable_with_no_roles_configured(self, fake_store) -> None:
        """No roles at all — family default, everyone can write."""
        assert can_write(fake_store, "user1", "calendar", "work_shifts") is True

    def test_writable_as_editor(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        assert can_write(fake_store, "user1", "calendar", "work_shifts") is True

    def test_writable_as_owner(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.OWNER,
            )
        )
        assert can_write(fake_store, "user1", "calendar", "work_shifts") is True

    def test_not_writable_as_viewer(self, fake_store) -> None:
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.VIEWER,
            )
        )
        assert can_write(fake_store, "user1", "calendar", "work_shifts") is False

    def test_not_writable_when_roles_exist_but_user_has_none(self, fake_store) -> None:
        """Roles are configured (for another user) — deny by default."""
        fake_store.roles.append(
            RoleAssignment(
                user_id="user1",
                resource_type="calendar",
                resource_id="work_shifts",
                role=PlannerRole.EDITOR,
            )
        )
        assert can_write(fake_store, "user2", "calendar", "work_shifts") is False
