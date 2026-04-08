"""Helpers for validating and resolving notification targets."""

from __future__ import annotations

from homeassistant.core import HomeAssistant


def normalize_notification_target(target: str | None) -> str:
    """Normalize a notify service name to the bare service form.

    Examples:
    - ``notify.mobile_app_phone`` -> ``mobile_app_phone``
    - ``mobile_app_phone`` -> ``mobile_app_phone``
    - ``""`` -> ``""``
    """

    value = (target or "").strip()
    if not value:
        return ""
    if value.startswith("notify."):
        return value.split(".", 1)[1]
    return value


def validate_notification_target(hass: HomeAssistant, target: str | None) -> str | None:
    """Return a normalized target when valid, else ``None``."""

    normalized = normalize_notification_target(target)
    if not normalized:
        return ""
    if hass.services.has_service("notify", normalized):
        return normalized
    return None


def resolve_notification_target(hass: HomeAssistant, target: str | None) -> str | None:
    """Resolve a configured target into a callable notify service name."""

    normalized = normalize_notification_target(target)
    if normalized:
        return normalized if hass.services.has_service("notify", normalized) else None
    if hass.services.has_service("notify", "notify"):
        return "notify"
    return None
