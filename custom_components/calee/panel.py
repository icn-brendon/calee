"""Custom sidebar panel registration for Calee.

Registers a sidebar page called "Planner" that loads the
LitElement frontend from planner_panel.js.

The JS file is served via HA's own static path system so it works
regardless of HACS install method (hacsfiles, custom_components, etc.).
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend as hass_frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN, PANEL_ICON, PANEL_TITLE, PANEL_URL

_LOGGER = logging.getLogger(__name__)

# Resolve the path to the compiled frontend JS relative to this file.
_PANEL_DIR = Path(__file__).parent / "frontend" / "dist"
_PANEL_JS = _PANEL_DIR / "planner_panel.js"

# URL path where HA will serve the JS file.
_STATIC_URL = f"/api/{DOMAIN}/panel"


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the Planner sidebar panel."""
    # Serve the panel JS through HA's HTTP server.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(_STATIC_URL, str(_PANEL_JS), cache_headers=False)]
    )

    hass_frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL.lstrip("/"),
        require_admin=False,
        config={
            "_panel_custom": {
                "name": "calee-panel",
                "module_url": _STATIC_URL,
            }
        },
    )
    _LOGGER.debug("Planner panel registered at %s (JS: %s)", PANEL_URL, _STATIC_URL)


async def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the Planner sidebar panel."""
    hass_frontend.async_remove_panel(hass, PANEL_URL.lstrip("/"))
    _LOGGER.debug("Planner panel removed")
