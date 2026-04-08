"""Tests for Sprint 9: Notification rules.

Covers: NotificationRule model, rule cascade resolution,
store CRUD for rules.
"""

from __future__ import annotations

from custom_components.calee.models import NotificationRule, PlannerEvent

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
