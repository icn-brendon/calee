"""Permission checks for the Calee integration.

Role hierarchy: owner > editor > viewer.
- Viewers can read.
- Editors can read and write (create/update/delete items).
- Owners can do everything editors can, plus manage roles.

Home Assistant admin users bypass all checks.

Family-friendly defaults:
- When NO roles are configured at all, every user has full access.
  This is the expected path for most families who just install the
  integration and start using it without setting up explicit roles.
- Once ANY role assignment exists, the system switches to deny-by-default
  for writes: a user must hold an explicit editor or owner role to write.
  Reads remain open-by-default even when roles are configured, because
  restricting visibility requires an explicit viewer (or higher) role on
  the specific resource.

Privacy:
- Calendars and lists can be marked ``is_private=True``.  When private,
  read access is denied unless the user has an explicit role on that
  resource, regardless of whether global roles are configured.
"""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN, PlannerRole
from .db.base import AbstractPlannerStore

_LOGGER = logging.getLogger(__name__)

# Roles that grant write access.
_WRITE_ROLES = frozenset({PlannerRole.OWNER, PlannerRole.EDITOR})

# All recognised roles (any of these grants read access).
_READ_ROLES = frozenset({PlannerRole.OWNER, PlannerRole.EDITOR, PlannerRole.VIEWER})


def _roles_configured(store: AbstractPlannerStore) -> bool:
    """Return True if at least one role assignment exists in the store."""
    return len(store.get_roles()) > 0


def is_strict_privacy(hass: HomeAssistant) -> bool:
    """Return True if strict_privacy mode is enabled in the config entry."""
    try:
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return False
        return entries[0].options.get("strict_privacy", False)
    except (AttributeError, TypeError):
        return False


def _is_resource_private(
    store: AbstractPlannerStore,
    resource_type: str,
    resource_id: str,
) -> bool:
    """Return True if the resource has ``is_private`` set."""
    if resource_type == "calendar":
        cal = store.get_calendar(resource_id)
        return cal.is_private if cal else False
    if resource_type == "list":
        lst = store.get_list(resource_id)
        return lst.is_private if lst else False
    return False


def get_role(
    store: AbstractPlannerStore,
    user_id: str,
    resource_type: str,
    resource_id: str,
) -> PlannerRole | None:
    """Return the role a user holds on a resource, or None."""
    for assignment in store.get_roles():
        if (
            assignment.user_id == user_id
            and assignment.resource_type == resource_type
            and assignment.resource_id == resource_id
        ):
            return assignment.role
    return None


def can_read(
    store: AbstractPlannerStore,
    user_id: str,
    resource_type: str,
    resource_id: str,
    *,
    strict: bool = False,
    is_admin: bool = False,
) -> bool:
    """Return True if the user may read the resource.

    Admin users bypass all role checks (consistent with write path).

    When a resource is marked ``is_private``, the user MUST have an
    explicit role to read it — even when no roles are configured globally.

    When ``strict`` is True (strict privacy mode), unassigned resources
    are also hidden — the user must have an explicit role to see anything.

    When no roles are configured and the resource is not private,
    everyone can read everything (family-friendly default).

    When roles ARE configured, the user needs an explicit role (viewer,
    editor, or owner) on the specific resource to read it.  If the user
    has no role on a resource that has roles assigned, access is denied.
    """
    # HA admin users bypass all planner role checks.
    if is_admin:
        return True

    # Private resources always require an explicit role.
    if _is_resource_private(store, resource_type, resource_id):
        role = get_role(store, user_id, resource_type, resource_id)
        return role is not None and role in _READ_ROLES

    if not _roles_configured(store):
        # In strict mode, even without global roles, require assignment.
        if strict:
            role = get_role(store, user_id, resource_type, resource_id)
            return role is not None and role in _READ_ROLES
        return True

    role = get_role(store, user_id, resource_type, resource_id)
    if role is not None and role in _READ_ROLES:
        return True

    # In strict mode, unassigned resources are hidden.
    if strict:
        return False

    # If no role on this resource but roles exist globally, check whether
    # *this particular resource* has any assignments.  If nobody was
    # explicitly assigned to it, keep it visible (it just hasn't been
    # restricted yet).
    for assignment in store.get_roles():
        if (
            assignment.resource_type == resource_type
            and assignment.resource_id == resource_id
        ):
            # The resource has explicit assignments and this user isn't
            # among them — deny.
            return False

    # No assignments target this specific resource — allow.
    return True


def can_write(
    store: AbstractPlannerStore,
    user_id: str,
    resource_type: str,
    resource_id: str,
    *,
    strict: bool = False,
) -> bool:
    """Return True if the user may write to the resource.

    When a resource is marked ``is_private``, the user MUST have an
    explicit editor or owner role — even when no roles are configured
    globally.

    When ``strict`` is True, writes require an explicit editor/owner
    role even when no global roles are configured.

    When no roles are configured and the resource is not private,
    everyone can write (family default).

    Once roles are configured, writes require an explicit editor or
    owner role.  Viewers and users with no role are denied.
    """
    # Private resources always require an explicit write role.
    if _is_resource_private(store, resource_type, resource_id):
        role = get_role(store, user_id, resource_type, resource_id)
        return role is not None and role in _WRITE_ROLES

    if not _roles_configured(store):
        if strict:
            role = get_role(store, user_id, resource_type, resource_id)
            return role is not None and role in _WRITE_ROLES
        return True

    role = get_role(store, user_id, resource_type, resource_id)
    if role is None:
        # Roles exist somewhere but this user has none on this resource
        # — deny by default.
        return False
    return role in _WRITE_ROLES


async def async_require_write(
    hass: HomeAssistant,
    store: AbstractPlannerStore,
    user_id: str | None,
    resource_type: str,
    resource_id: str,
) -> None:
    """Raise HomeAssistantError if the user cannot write.

    Admin users always pass.  If user_id is None (e.g. automations and
    internal service calls), the check always passes — even in strict
    privacy mode — because automations need to create and update events
    without an interactive user context.  A warning is logged in strict
    mode so administrators can audit internal writes.

    NOTE: user_id=None is intentionally *allowed*, not denied.  This
    differs from the original PR description, which stated that
    user_id=None would be denied.  The implementation was updated to
    allow these calls because blocking them would break automations and
    internal service calls that have no interactive user context.
    """
    strict = is_strict_privacy(hass)

    if user_id is None:
        if strict:
            _LOGGER.warning(
                "Internal write to %s/%s allowed in strict_privacy mode "
                "(no user_id — automation or service call)",
                resource_type,
                resource_id,
            )
        return

    # HA admin bypasses planner roles.
    user = await hass.auth.async_get_user(user_id)
    if user and user.is_admin:
        return

    if not can_write(store, user_id, resource_type, resource_id, strict=strict):
        raise HomeAssistantError(
            f"User {user_id} does not have write access to "
            f"{resource_type}/{resource_id}"
        )
