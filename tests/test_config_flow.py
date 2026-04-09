"""Tests for the Calee config flow and options flow."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.calee.config_flow import CaleeConfigFlow, CaleeOptionsFlow
from custom_components.calee.const import (
    BACKEND_JSON,
    BACKEND_MARIADB,
    BACKEND_POSTGRESQL,
    CONF_DB_HOST,
    CONF_DB_NAME,
    CONF_DB_PASSWORD,
    CONF_DB_PORT,
    CONF_DB_USERNAME,
    CONF_STORAGE_BACKEND,
)

# ── Helpers ──────────────────────────────────────────────────────────


def _make_flow() -> CaleeConfigFlow:
    """Create a CaleeConfigFlow with mocked hass context."""
    flow = CaleeConfigFlow()
    flow.hass = MagicMock()

    async def _set_unique_id(uid):
        flow._unique_id = uid

    flow.async_set_unique_id = _set_unique_id
    flow._abort_if_unique_id_configured = MagicMock()
    return flow


# ── async_step_user ──────────────────────────────────────────────────


class TestConfigFlowUser:
    """Tests for the initial user step."""

    @pytest.mark.asyncio
    async def test_json_backend_creates_entry(self):
        """Selecting JSON backend creates an entry immediately."""
        flow = _make_flow()
        result = await flow.async_step_user(
            {CONF_STORAGE_BACKEND: BACKEND_JSON}
        )

        assert result["type"] == "create_entry"
        assert result["title"] == "Calee"
        assert result["data"][CONF_STORAGE_BACKEND] == BACKEND_JSON

    @pytest.mark.asyncio
    async def test_mariadb_proceeds_to_database_step(self):
        """Selecting MariaDB proceeds to the database step."""
        flow = _make_flow()
        result = await flow.async_step_user(
            {CONF_STORAGE_BACKEND: BACKEND_MARIADB}
        )

        assert result["type"] == "form"
        assert result["step_id"] == "database"

    @pytest.mark.asyncio
    async def test_postgresql_proceeds_to_database_step(self):
        """Selecting PostgreSQL proceeds to the database step."""
        flow = _make_flow()
        result = await flow.async_step_user(
            {CONF_STORAGE_BACKEND: BACKEND_POSTGRESQL}
        )

        assert result["type"] == "form"
        assert result["step_id"] == "database"

    @pytest.mark.asyncio
    async def test_shows_form_when_no_input(self):
        """Step shows form when called without input."""
        flow = _make_flow()
        result = await flow.async_step_user(None)

        assert result["type"] == "form"
        assert result["step_id"] == "user"


# ── async_step_database ─────────────────────────────────────────────


class TestConfigFlowDatabase:
    """Tests for the database connection step."""

    @pytest.mark.asyncio
    async def test_valid_connection_creates_entry(self):
        """Valid database connection creates an entry."""
        flow = _make_flow()
        flow._backend = BACKEND_MARIADB

        db_input = {
            CONF_DB_HOST: "localhost",
            CONF_DB_PORT: 3306,
            CONF_DB_NAME: "calee",
            CONF_DB_USERNAME: "user",
            CONF_DB_PASSWORD: "pass",
        }

        mock_engine = AsyncMock()
        mock_conn = AsyncMock()
        mock_engine.connect = MagicMock(return_value=mock_conn)
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=False)
        mock_conn.execute = AsyncMock()
        mock_engine.dispose = AsyncMock()

        with patch(
            "sqlalchemy.ext.asyncio.create_async_engine",
            return_value=mock_engine,
        ):
            result = await flow.async_step_database(db_input)

        assert result["type"] == "create_entry"
        assert result["data"][CONF_STORAGE_BACKEND] == BACKEND_MARIADB
        assert result["data"][CONF_DB_HOST] == "localhost"

    @pytest.mark.asyncio
    async def test_invalid_connection_shows_error(self):
        """Failed database connection shows an error."""
        flow = _make_flow()
        flow._backend = BACKEND_MARIADB

        db_input = {
            CONF_DB_HOST: "bad-host",
            CONF_DB_PORT: 3306,
            CONF_DB_NAME: "calee",
            CONF_DB_USERNAME: "user",
            CONF_DB_PASSWORD: "pass",
        }

        with patch(
            "sqlalchemy.ext.asyncio.create_async_engine",
            side_effect=Exception("Connection refused"),
        ):
            result = await flow.async_step_database(db_input)

        assert result["type"] == "form"
        assert result["step_id"] == "database"
        assert result["errors"]["base"] == "cannot_connect"

    @pytest.mark.asyncio
    async def test_shows_form_when_no_input(self):
        """Step shows form when called without input."""
        flow = _make_flow()
        flow._backend = BACKEND_MARIADB
        result = await flow.async_step_database(None)

        assert result["type"] == "form"
        assert result["step_id"] == "database"


# ── Options flow ─────────────────────────────────────────────────────


class TestOptionsFlow:
    """Tests for the CaleeOptionsFlow."""

    @pytest.mark.asyncio
    async def test_options_update_settings(self):
        """Options flow updates general settings correctly.

        Notification settings (notifications_enabled, morning_summary_*,
        notification_target, reminder_calendars) are managed exclusively
        via the in-panel settings dialog and are not part of the options flow.
        """
        config_entry = MagicMock()
        config_entry.data = {CONF_STORAGE_BACKEND: BACKEND_JSON}
        config_entry.options = {
            "reminder_minutes": 60,
            "budget": 100.0,
            "week_start": "monday",
        }

        flow = CaleeOptionsFlow(config_entry)
        flow.hass = MagicMock()

        user_input = {
            "reminder_minutes": 30,
            "max_event_age_days": 180,
            "currency": "$",
            "budget": 200.0,
            "week_start": "sunday",
            "time_format": "24h",
            "strict_privacy": True,
            CONF_STORAGE_BACKEND: BACKEND_JSON,
        }

        result = await flow.async_step_init(user_input)

        assert result["type"] == "create_entry"
        assert result["data"]["budget"] == 200.0
        assert result["data"]["week_start"] == "sunday"
        assert result["data"]["reminder_minutes"] == 30

    @pytest.mark.asyncio
    async def test_options_shows_form_when_no_input(self):
        """Options flow shows form when called without input."""
        config_entry = MagicMock()
        config_entry.data = {CONF_STORAGE_BACKEND: BACKEND_JSON}
        config_entry.options = {}

        flow = CaleeOptionsFlow(config_entry)
        flow.hass = MagicMock()

        result = await flow.async_step_init(None)

        assert result["type"] == "form"
        assert result["step_id"] == "init"
