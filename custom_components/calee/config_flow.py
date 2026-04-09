"""Config flow for the Calee integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback

from .const import (
    BACKEND_JSON,
    BACKEND_MARIADB,
    BACKEND_POSTGRESQL,
    CONF_DB_HOST,
    CONF_DB_NAME,
    CONF_DB_PASSWORD,
    CONF_DB_PORT,
    CONF_DB_USERNAME,
    CONF_STORAGE_BACKEND,
    DEFAULT_BUDGET,
    DEFAULT_CURRENCY,
    DEFAULT_DB_NAME,
    DEFAULT_MARIADB_HOST,
    DEFAULT_MARIADB_PORT,
    DEFAULT_MAX_EVENT_AGE_DAYS,
    DEFAULT_POSTGRESQL_PORT,
    DEFAULT_REMINDER_MINUTES,
    DEFAULT_STRICT_PRIVACY,
    DEFAULT_TIME_FORMAT,
    DEFAULT_WEEK_START,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

_BACKEND_LABELS = {
    BACKEND_JSON: "Local (default)",
    BACKEND_MARIADB: "MariaDB",
    BACKEND_POSTGRESQL: "PostgreSQL",
}


def _build_db_url(backend: str, config: dict) -> str:
    """Build an async SQLAlchemy database URL for the given backend."""
    user = config[CONF_DB_USERNAME]
    password = config[CONF_DB_PASSWORD]
    host = config[CONF_DB_HOST]
    port = config[CONF_DB_PORT]
    db = config[CONF_DB_NAME]
    if backend == BACKEND_MARIADB:
        return f"mysql+aiomysql://{user}:{password}@{host}:{port}/{db}"
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"


class CaleeConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Calee."""

    VERSION = 2

    def __init__(self) -> None:
        """Initialise the flow."""
        self._backend: str = BACKEND_JSON

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Step 1 — choose a storage backend."""
        # Prevent duplicate entries.
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            backend = user_input.get(CONF_STORAGE_BACKEND, BACKEND_JSON)
            if backend == BACKEND_JSON:
                return self.async_create_entry(
                    title="Calee",
                    data={CONF_STORAGE_BACKEND: BACKEND_JSON},
                )
            self._backend = backend
            return await self.async_step_database()

        schema = vol.Schema(
            {
                vol.Required(CONF_STORAGE_BACKEND, default=BACKEND_JSON): vol.In(
                    _BACKEND_LABELS
                ),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema)

    async def async_step_database(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Step 2 — database connection details."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Test the connection before creating the entry.
            try:
                url = _build_db_url(self._backend, user_input)
                from sqlalchemy import text
                from sqlalchemy.ext.asyncio import create_async_engine

                engine = create_async_engine(url, pool_pre_ping=True)
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
                await engine.dispose()
            except Exception:
                _LOGGER.debug("Database connection test failed", exc_info=True)
                errors["base"] = "cannot_connect"
            else:
                return self.async_create_entry(
                    title="Calee",
                    data={
                        CONF_STORAGE_BACKEND: self._backend,
                        **user_input,
                    },
                )

        # Default values differ by backend.
        default_host = (
            DEFAULT_MARIADB_HOST if self._backend == BACKEND_MARIADB else ""
        )
        default_port = (
            DEFAULT_MARIADB_PORT
            if self._backend == BACKEND_MARIADB
            else DEFAULT_POSTGRESQL_PORT
        )

        schema = vol.Schema(
            {
                vol.Required(CONF_DB_HOST, default=default_host): str,
                vol.Required(CONF_DB_PORT, default=default_port): vol.Coerce(int),
                vol.Required(CONF_DB_NAME, default=DEFAULT_DB_NAME): str,
                vol.Required(CONF_DB_USERNAME): str,
                vol.Required(CONF_DB_PASSWORD): str,
            }
        )
        return self.async_show_form(
            step_id="database",
            data_schema=schema,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> CaleeOptionsFlow:
        """Return the options flow handler."""
        return CaleeOptionsFlow(config_entry)


class CaleeOptionsFlow(OptionsFlow):
    """Handle options for Calee."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        self._config_entry = config_entry
        self._new_backend: str | None = None

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Manage general options and offer backend switching."""
        errors: dict[str, str] = {}

        if user_input is not None:
            chosen_backend = user_input.pop(CONF_STORAGE_BACKEND, None)
            current_backend = self._config_entry.data.get(
                CONF_STORAGE_BACKEND, BACKEND_JSON
            )

            # Merge with existing options so notification keys (set via
            # the panel settings dialog) are preserved across saves.
            merged = dict(self._config_entry.options)
            merged.update(user_input)

            # If the user picked a different backend, go to the database step.
            if chosen_backend and chosen_backend != current_backend:
                self._new_backend = chosen_backend
                if chosen_backend == BACKEND_JSON:
                    # Switching back to JSON — save old DB creds for migration.
                    old_data = dict(self._config_entry.data)
                    new_data = {CONF_STORAGE_BACKEND: BACKEND_JSON}
                    self.hass.config_entries.async_update_entry(
                        self._config_entry,
                        data=new_data,
                    )
                    merged["_pending_migration"] = current_backend
                    merged["_old_db_config"] = old_data
                    return self.async_create_entry(data=merged)
                return await self.async_step_database()

            return self.async_create_entry(data=merged)

        current = self._config_entry.options
        current_backend = self._config_entry.data.get(
            CONF_STORAGE_BACKEND, BACKEND_JSON
        )

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        "reminder_minutes",
                        default=current.get(
                            "reminder_minutes", DEFAULT_REMINDER_MINUTES
                        ),
                    ): vol.All(vol.Coerce(int), vol.Range(min=0, max=1440)),
                    vol.Optional(
                        "max_event_age_days",
                        default=current.get(
                            "max_event_age_days", DEFAULT_MAX_EVENT_AGE_DAYS
                        ),
                    ): vol.All(vol.Coerce(int), vol.Range(min=30, max=3650)),
                    vol.Optional(
                        "currency",
                        default=current.get("currency", DEFAULT_CURRENCY),
                    ): str,
                    vol.Optional(
                        "budget",
                        default=current.get("budget", DEFAULT_BUDGET),
                    ): vol.All(vol.Coerce(float), vol.Range(min=0)),
                    vol.Optional(
                        "week_start",
                        default=current.get("week_start", DEFAULT_WEEK_START),
                    ): vol.In({"monday": "Monday", "sunday": "Sunday"}),
                    vol.Optional(
                        "time_format",
                        default=current.get("time_format", DEFAULT_TIME_FORMAT),
                    ): vol.In({"12h": "12-hour", "24h": "24-hour"}),
                    vol.Optional(
                        "strict_privacy",
                        default=current.get(
                            "strict_privacy", DEFAULT_STRICT_PRIVACY
                        ),
                    ): bool,
                    vol.Optional(
                        CONF_STORAGE_BACKEND,
                        default=current_backend,
                    ): vol.In(_BACKEND_LABELS),
                }
            ),
            errors=errors,
        )

    async def async_step_database(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Database connection details for backend switch via options."""
        errors: dict[str, str] = {}
        backend = self._new_backend or BACKEND_MARIADB

        if user_input is not None:
            try:
                url = _build_db_url(backend, user_input)
                from sqlalchemy import text
                from sqlalchemy.ext.asyncio import create_async_engine

                engine = create_async_engine(url, pool_pre_ping=True)
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
                await engine.dispose()
            except Exception:
                _LOGGER.debug("Database connection test failed", exc_info=True)
                errors["base"] = "cannot_connect"
            else:
                old_backend = self._config_entry.data.get(
                    CONF_STORAGE_BACKEND, BACKEND_JSON
                )
                new_data = {CONF_STORAGE_BACKEND: backend, **user_input}
                self.hass.config_entries.async_update_entry(
                    self._config_entry,
                    data=new_data,
                )
                # Preserve existing general options and flag a migration.
                opts = dict(self._config_entry.options)
                opts["_pending_migration"] = old_backend
                return self.async_create_entry(data=opts)

        default_host = (
            DEFAULT_MARIADB_HOST if backend == BACKEND_MARIADB else ""
        )
        default_port = (
            DEFAULT_MARIADB_PORT
            if backend == BACKEND_MARIADB
            else DEFAULT_POSTGRESQL_PORT
        )

        schema = vol.Schema(
            {
                vol.Required(CONF_DB_HOST, default=default_host): str,
                vol.Required(CONF_DB_PORT, default=default_port): vol.Coerce(int),
                vol.Required(CONF_DB_NAME, default=DEFAULT_DB_NAME): str,
                vol.Required(CONF_DB_USERNAME): str,
                vol.Required(CONF_DB_PASSWORD): str,
            }
        )
        return self.async_show_form(
            step_id="database",
            data_schema=schema,
            errors=errors,
        )
