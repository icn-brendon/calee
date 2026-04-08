"""Tests for Sprint 9: Notification rules.

Covers: NotificationRule model, rule cascade resolution,
store CRUD for rules.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.calee.api import PlannerAPI
from custom_components.calee.const import DOMAIN, PANEL_URL
from custom_components.calee.models import NotificationRule, PlannerEvent
from custom_components.calee.notify import (
    _KEY_NOTIFIED_EVENTS,
    _send_shift_notification,
    async_check_and_send_reminders,
)

from .conftest import FakeStore

# ── NotificationRule model ────────────────────────────────────────────


class TestNotificationRuleModel:
    """Tests for the NotificationRule dataclass."""

    def test_defaults(self):
        """New rule has sensible defaults."""
        rule = NotificationRule(scope="calendar", scope_id="work_shifts")
        assert rule.enabled is True
        assert rule.reminder_minutes == 60
        assert rule.notify_services == []
        assert rule.include_actions is True
        assert rule.custom_title == ""
        assert rule.custom_message == ""

    def test_round_trip(self):
        """Rule survives to_dict/from_dict."""
        rule = NotificationRule(
            scope="event",
            scope_id="evt_123",
            enabled=False,
            reminder_minutes=30,
            notify_services=["notify.mobile_app_phone"],
            include_actions=False,
            custom_title="Custom Title",
            custom_message="Custom Body",
        )
        d = rule.to_dict()
        restored = NotificationRule.from_dict(d)
        assert restored.scope == "event"
        assert restored.scope_id == "evt_123"
        assert restored.enabled is False
        assert restored.reminder_minutes == 30
        assert restored.notify_services == ["notify.mobile_app_phone"]
        assert restored.include_actions is False
        assert restored.custom_title == "Custom Title"


# ── Store CRUD ────────────────────────────────────────────────────────


class TestNotificationRuleStore:
    """Tests for notification rule CRUD on FakeStore."""

    async def test_put_and_get(self, fake_store: FakeStore):
        """Can create and retrieve a notification rule."""
        rule = NotificationRule(scope="calendar", scope_id="work_shifts")
        await fake_store.async_put_notification_rule(rule)

        assert fake_store.get_notification_rule(rule.id) is rule
        assert rule.id in fake_store.get_notification_rules()

    async def test_get_rules_for_scope(self, fake_store: FakeStore):
        """Rules can be queried by scope + scope_id."""
        r1 = NotificationRule(scope="calendar", scope_id="work_shifts")
        r2 = NotificationRule(scope="calendar", scope_id="family_shared")
        r3 = NotificationRule(scope="template", scope_id="tpl_early")
        await fake_store.async_put_notification_rule(r1)
        await fake_store.async_put_notification_rule(r2)
        await fake_store.async_put_notification_rule(r3)

        work_rules = fake_store.get_rules_for_scope("calendar", "work_shifts")
        assert len(work_rules) == 1
        assert work_rules[0].id == r1.id

        template_rules = fake_store.get_rules_for_scope("template", "tpl_early")
        assert len(template_rules) == 1

    async def test_remove(self, fake_store: FakeStore):
        """Can delete a notification rule."""
        rule = NotificationRule(scope="event", scope_id="evt_1")
        await fake_store.async_put_notification_rule(rule)
        await fake_store.async_remove_notification_rule(rule.id)

        assert fake_store.get_notification_rule(rule.id) is None

    async def test_remove_nonexistent(self, fake_store: FakeStore):
        """Removing a non-existent rule is a no-op."""
        await fake_store.async_remove_notification_rule("does_not_exist")


# ── Rule cascade resolution ──────────────────────────────────────────


class TestRuleCascade:
    """Tests for the event > template > calendar cascade."""

    def test_event_rule_wins(self, fake_store: FakeStore):
        """Event-level rule takes priority over template and calendar."""
        r_cal = NotificationRule(
            id="r_cal", scope="calendar", scope_id="work_shifts",
            reminder_minutes=60,
        )
        r_tpl = NotificationRule(
            id="r_tpl", scope="template", scope_id="tpl_early",
            reminder_minutes=45,
        )
        r_evt = NotificationRule(
            id="r_evt", scope="event", scope_id="evt_1",
            reminder_minutes=15,
        )
        fake_store.notification_rules = {
            r.id: r for r in [r_cal, r_tpl, r_evt]
        }

        event = PlannerEvent(
            id="evt_1",
            calendar_id="work_shifts",
            template_id="tpl_early",
        )

        # Simulate resolve: event > template > calendar
        rules = fake_store.get_rules_for_scope("event", event.id)
        if not rules and event.template_id:
            rules = fake_store.get_rules_for_scope("template", event.template_id)
        if not rules and event.calendar_id:
            rules = fake_store.get_rules_for_scope("calendar", event.calendar_id)

        assert len(rules) == 1
        assert rules[0].reminder_minutes == 15  # event rule wins

    def test_template_rule_fallback(self, fake_store: FakeStore):
        """Template rule is used when no event rule exists."""
        r_cal = NotificationRule(
            id="r_cal", scope="calendar", scope_id="work_shifts",
            reminder_minutes=60,
        )
        r_tpl = NotificationRule(
            id="r_tpl", scope="template", scope_id="tpl_early",
            reminder_minutes=45,
        )
        fake_store.notification_rules = {
            r.id: r for r in [r_cal, r_tpl]
        }

        event = PlannerEvent(
            id="evt_2",
            calendar_id="work_shifts",
            template_id="tpl_early",
        )

        rules = fake_store.get_rules_for_scope("event", event.id)
        if not rules and event.template_id:
            rules = fake_store.get_rules_for_scope("template", event.template_id)
        if not rules and event.calendar_id:
            rules = fake_store.get_rules_for_scope("calendar", event.calendar_id)

        assert rules[0].reminder_minutes == 45  # template rule

    def test_calendar_rule_fallback(self, fake_store: FakeStore):
        """Calendar rule is used when no event or template rules exist."""
        r_cal = NotificationRule(
            id="r_cal", scope="calendar", scope_id="work_shifts",
            reminder_minutes=60,
        )
        fake_store.notification_rules = {"r_cal": r_cal}

        event = PlannerEvent(
            id="evt_3",
            calendar_id="work_shifts",
        )

        rules = fake_store.get_rules_for_scope("event", event.id)
        if not rules and event.template_id:
            rules = fake_store.get_rules_for_scope("template", event.template_id)
        if not rules and event.calendar_id:
            rules = fake_store.get_rules_for_scope("calendar", event.calendar_id)

        assert rules[0].reminder_minutes == 60  # calendar rule

    def test_no_rule_returns_empty(self, fake_store: FakeStore):
        """No matching rules returns empty list."""
        event = PlannerEvent(id="evt_4", calendar_id="personal")

        rules = fake_store.get_rules_for_scope("event", event.id)
        if not rules and event.template_id:
            rules = fake_store.get_rules_for_scope("template", event.template_id)
        if not rules and event.calendar_id:
            rules = fake_store.get_rules_for_scope("calendar", event.calendar_id)

        assert rules == []


# ── API resolve_notification_rule ─────────────────────────────────────


def _make_api(fake_store: FakeStore) -> PlannerAPI:
    """Create a PlannerAPI with a FakeStore and mocked hass."""
    hass = MagicMock()
    return PlannerAPI(hass, fake_store)


class TestResolveNotificationRule:
    """Tests for PlannerAPI.resolve_notification_rule()."""

    def test_event_rule_takes_priority(self, fake_store: FakeStore):
        """Event-level rule takes priority over template and calendar."""
        fake_store.notification_rules = {
            "r_cal": NotificationRule(
                id="r_cal", scope="calendar", scope_id="work_shifts",
                reminder_minutes=60,
            ),
            "r_tpl": NotificationRule(
                id="r_tpl", scope="template", scope_id="tpl_early",
                reminder_minutes=45,
            ),
            "r_evt": NotificationRule(
                id="r_evt", scope="event", scope_id="evt_1",
                reminder_minutes=15,
            ),
        }
        api = _make_api(fake_store)
        event = PlannerEvent(
            id="evt_1", calendar_id="work_shifts", template_id="tpl_early",
        )
        rule = api.resolve_notification_rule(event)
        assert rule is not None
        assert rule.reminder_minutes == 15

    def test_template_fallback(self, fake_store: FakeStore):
        """Template rule used when no event rule exists."""
        fake_store.notification_rules = {
            "r_cal": NotificationRule(
                id="r_cal", scope="calendar", scope_id="work_shifts",
                reminder_minutes=60,
            ),
            "r_tpl": NotificationRule(
                id="r_tpl", scope="template", scope_id="tpl_early",
                reminder_minutes=45,
            ),
        }
        api = _make_api(fake_store)
        event = PlannerEvent(
            id="evt_2", calendar_id="work_shifts", template_id="tpl_early",
        )
        rule = api.resolve_notification_rule(event)
        assert rule is not None
        assert rule.reminder_minutes == 45

    def test_calendar_fallback(self, fake_store: FakeStore):
        """Calendar rule used when no event or template rules exist."""
        fake_store.notification_rules = {
            "r_cal": NotificationRule(
                id="r_cal", scope="calendar", scope_id="work_shifts",
                reminder_minutes=60,
            ),
        }
        api = _make_api(fake_store)
        event = PlannerEvent(id="evt_3", calendar_id="work_shifts")
        rule = api.resolve_notification_rule(event)
        assert rule is not None
        assert rule.reminder_minutes == 60

    def test_returns_none_when_no_rules(self, fake_store: FakeStore):
        """Returns None when no rules match."""
        api = _make_api(fake_store)
        event = PlannerEvent(id="evt_4", calendar_id="personal")
        assert api.resolve_notification_rule(event) is None

    def test_disabled_rule_is_skipped(self, fake_store: FakeStore):
        """A disabled event rule suppresses fallback reminders."""
        fake_store.notification_rules = {
            "r_evt": NotificationRule(
                id="r_evt", scope="event", scope_id="evt_1",
                enabled=False, reminder_minutes=15,
            ),
            "r_cal": NotificationRule(
                id="r_cal", scope="calendar", scope_id="work_shifts",
                enabled=True, reminder_minutes=60,
            ),
        }
        api = _make_api(fake_store)
        event = PlannerEvent(id="evt_1", calendar_id="work_shifts")
        rule = api.resolve_notification_rule(event)
        assert rule is not None
        assert rule.enabled is False
        assert rule.reminder_minutes == 15


class TestEventNotificationOverrides:
    """Tests for event-scoped notification overrides in the API."""

    @pytest.mark.asyncio
    async def test_create_shift_can_attach_event_notification_rule(
        self, fake_store: FakeStore
    ):
        """Event creation can persist a per-event notification rule."""
        api = _make_api(fake_store)
        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Morning Shift",
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
            notification_rule={
                "enabled": True,
                "reminder_minutes": 30,
                "notify_services": ["notify.mobile_app_phone"],
                "include_actions": False,
                "custom_title": "Early warning",
                "custom_message": "Clock in soon",
            },
        )

        rules = fake_store.get_rules_for_scope("event", event.id)
        assert len(rules) == 1
        rule = rules[0]
        assert rule.enabled is True
        assert rule.reminder_minutes == 30
        assert rule.notify_services == ["mobile_app_phone"]
        assert rule.include_actions is False
        assert rule.custom_title == "Early warning"
        assert rule.custom_message == "Clock in soon"

    @pytest.mark.asyncio
    async def test_update_shift_can_disable_event_notifications(
        self, fake_store: FakeStore
    ):
        """Event updates can explicitly suppress reminders."""
        api = _make_api(fake_store)
        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Late Shift",
            start="2026-04-07T14:00:00+00:00",
            end="2026-04-07T22:00:00+00:00",
        )
        await api.async_update_shift(
            event_id=event.id,
            version=event.version,
            notification_rule={
                "enabled": False,
                "reminder_minutes": 15,
            },
        )

        rule = fake_store.get_notification_rule(
            fake_store.get_rules_for_scope("event", event.id)[0].id
        )
        assert rule is not None
        assert rule.enabled is False
        assert rule.reminder_minutes == 15

    @pytest.mark.asyncio
    async def test_update_shift_notification_rule_preserves_omitted_fields(
        self, fake_store: FakeStore
    ):
        """Partial notification updates should not reset existing values."""
        api = _make_api(fake_store)
        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Night Shift",
            start="2026-04-07T22:00:00+00:00",
            end="2026-04-08T06:00:00+00:00",
            notification_rule={
                "enabled": True,
                "reminder_minutes": 45,
                "notify_services": ["notify.mobile_app_phone"],
                "include_actions": False,
                "custom_title": "Heads up",
            },
        )

        await api.async_update_shift(
            event_id=event.id,
            version=event.version,
            notification_rule={
                "enabled": False,
            },
        )

        rule = fake_store.get_rules_for_scope("event", event.id)[0]
        assert rule.enabled is False
        assert rule.reminder_minutes == 45
        assert rule.notify_services == ["mobile_app_phone"]
        assert rule.include_actions is False
        assert rule.custom_title == "Heads up"

    @pytest.mark.asyncio
    async def test_create_shift_keeps_unavailable_notify_service_names(
        self, fake_store: FakeStore
    ):
        """Notify services should be normalized, not dropped, at save time."""
        api = _make_api(fake_store)
        event = await api.async_add_shift(
            calendar_id="work_shifts",
            title="Phone Test",
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
            notification_rule={
                "notify_services": ["notify.mobile_app_future_phone"],
            },
        )

        rule = fake_store.get_rules_for_scope("event", event.id)[0]
        assert rule.notify_services == ["mobile_app_future_phone"]


class TestReminderDelivery:
    """Tests for reminder delivery and Companion App actions."""

    @pytest.mark.asyncio
    async def test_event_rule_sends_when_global_notifications_disabled(
        self, fake_store: FakeStore, monkeypatch: pytest.MonkeyPatch
    ):
        """An enabled event rule bypasses the global notifications toggle."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_10",
            calendar_id="work_shifts",
            title="Override Shift",
            start=(now + timedelta(minutes=30)).isoformat(),
            end=(now + timedelta(hours=1, minutes=30)).isoformat(),
        )
        await fake_store.async_put_event(event)
        await fake_store.async_put_notification_rule(
            NotificationRule(
                scope="event",
                scope_id=event.id,
                enabled=True,
                reminder_minutes=30,
                notify_services=["mobile_app_phone"],
            )
        )

        hass = MagicMock()
        hass.data = {
            DOMAIN: {
                "entry_1": {
                    _KEY_NOTIFIED_EVENTS: set(),
                }
            }
        }
        hass.services.async_call = AsyncMock()
        entry = SimpleNamespace(
            entry_id="entry_1",
            options={
                "notifications_enabled": False,
                "reminder_minutes": 60,
                "notification_target": "",
                "time_format": "12h",
            },
        )

        monkeypatch.setattr(
            "custom_components.calee.notify.resolve_notification_target",
            lambda _hass, target: target or None,
        )

        await async_check_and_send_reminders(hass, fake_store, entry)

        notify_calls = [
            call
            for call in hass.services.async_call.call_args_list
            if call.args[:2] == ("notify", "mobile_app_phone")
        ]
        assert len(notify_calls) == 1

    @pytest.mark.asyncio
    async def test_disabled_event_rule_suppresses_reminders(
        self, fake_store: FakeStore, monkeypatch: pytest.MonkeyPatch
    ):
        """A disabled event rule suppresses reminders even if global is on."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_11",
            calendar_id="work_shifts",
            title="Suppressed Shift",
            start=(now + timedelta(minutes=15)).isoformat(),
            end=(now + timedelta(hours=1, minutes=15)).isoformat(),
        )
        await fake_store.async_put_event(event)
        await fake_store.async_put_notification_rule(
            NotificationRule(
                scope="event",
                scope_id=event.id,
                enabled=False,
                reminder_minutes=15,
                notify_services=["mobile_app_phone"],
            )
        )

        hass = MagicMock()
        hass.data = {
            DOMAIN: {
                "entry_1": {
                    _KEY_NOTIFIED_EVENTS: set(),
                }
            }
        }
        hass.services.async_call = AsyncMock()
        entry = SimpleNamespace(
            entry_id="entry_1",
            options={
                "notifications_enabled": True,
                "reminder_minutes": 60,
                "notification_target": "mobile_app_phone",
                "time_format": "12h",
            },
        )

        monkeypatch.setattr(
            "custom_components.calee.notify.resolve_notification_target",
            lambda _hass, target: target or None,
        )

        await async_check_and_send_reminders(hass, fake_store, entry)

        notify_calls = [
            call for call in hass.services.async_call.call_args_list
            if call.args and call.args[0] == "notify"
        ]
        assert notify_calls == []

    @pytest.mark.asyncio
    async def test_template_rule_respects_global_notifications_toggle(
        self, fake_store: FakeStore, monkeypatch: pytest.MonkeyPatch
    ):
        """Template/calendar defaults should not bypass the global toggle."""
        now = datetime.now(UTC)
        event = PlannerEvent(
            id="evt_13",
            calendar_id="work_shifts",
            template_id="tpl_early",
            title="Template Shift",
            start=(now + timedelta(minutes=30)).isoformat(),
            end=(now + timedelta(hours=1, minutes=30)).isoformat(),
        )
        await fake_store.async_put_event(event)
        await fake_store.async_put_notification_rule(
            NotificationRule(
                scope="template",
                scope_id="tpl_early",
                enabled=True,
                reminder_minutes=30,
                notify_services=["mobile_app_phone"],
            )
        )

        hass = MagicMock()
        hass.data = {
            DOMAIN: {
                "entry_1": {
                    _KEY_NOTIFIED_EVENTS: set(),
                }
            }
        }
        hass.services.async_call = AsyncMock()
        entry = SimpleNamespace(
            entry_id="entry_1",
            options={
                "notifications_enabled": False,
                "reminder_minutes": 60,
                "notification_target": "mobile_app_phone",
                "time_format": "12h",
            },
        )

        monkeypatch.setattr(
            "custom_components.calee.notify.resolve_notification_target",
            lambda _hass, target: target or None,
        )

        await async_check_and_send_reminders(hass, fake_store, entry)

        notify_calls = [
            call for call in hass.services.async_call.call_args_list
            if call.args and call.args[0] == "notify"
        ]
        assert notify_calls == []

    @pytest.mark.asyncio
    async def test_mobile_actions_use_uri_for_open(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        """The open action uses Companion's URI action format."""
        hass = MagicMock()
        hass.services.async_call = AsyncMock()
        event = PlannerEvent(
            id="evt_12",
            calendar_id="work_shifts",
            title="Actionable Shift",
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
        )

        monkeypatch.setattr(
            "custom_components.calee.notify.resolve_notification_target",
            lambda _hass, target: target or None,
        )

        await _send_shift_notification(
            hass,
            event,
            datetime(2026, 4, 7, 6, 0, tzinfo=UTC),
            60,
            targets=["mobile_app_phone"],
        )

        notify_call = next(
            call
            for call in hass.services.async_call.call_args_list
            if call.args[:2] == ("notify", "mobile_app_phone")
        )
        data = notify_call.args[2]["data"]
        actions = data["actions"]
        assert actions[0]["action"] == "URI"
        assert actions[0]["uri"] == PANEL_URL
        assert actions[1]["action"] == f"CALEE_SNOOZE_15_{event.id}"
        assert actions[2]["action"] == f"CALEE_SNOOZE_60_{event.id}"
        assert data["action_data"]["event_id"] == event.id


# ── Uniqueness enforcement ────────────────────────────────────────────


class TestRuleUniqueness:
    """Tests for one-rule-per-(scope, scope_id) enforcement."""

    @pytest.mark.asyncio
    async def test_duplicate_rule_rejected(self, fake_store: FakeStore):
        """Creating a second rule for the same scope+scope_id fails."""
        api = _make_api(fake_store)
        await api.async_create_notification_rule(
            scope="calendar", scope_id="work_shifts",
        )
        with pytest.raises(Exception, match="already exists"):
            await api.async_create_notification_rule(
                scope="calendar", scope_id="work_shifts",
            )

    @pytest.mark.asyncio
    async def test_different_scopes_allowed(self, fake_store: FakeStore):
        """Rules for different scopes on the same entity are fine."""
        api = _make_api(fake_store)
        await api.async_create_notification_rule(
            scope="calendar", scope_id="work_shifts",
        )
        # Template rule for different scope — should succeed.
        rule = await api.async_create_notification_rule(
            scope="template", scope_id="tpl_early",
        )
        assert rule.scope == "template"
