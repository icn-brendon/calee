"""Tests for overnight shift detection and timezone handling."""

from custom_components.calee.models import PlannerEvent, ShiftTemplate


class TestOvernightDetection:
    """Verify is_overnight on events and templates."""

    def test_same_day_event_is_not_overnight(self) -> None:
        event = PlannerEvent(
            start="2026-04-07T06:00:00+00:00",
            end="2026-04-07T14:00:00+00:00",
        )
        assert event.is_overnight is False

    def test_cross_midnight_event_is_overnight(self) -> None:
        event = PlannerEvent(
            start="2026-04-07T22:00:00+00:00",
            end="2026-04-08T06:00:00+00:00",
        )
        assert event.is_overnight is True

    def test_multi_day_event_is_overnight(self) -> None:
        event = PlannerEvent(
            start="2026-04-07T09:00:00+00:00",
            end="2026-04-09T17:00:00+00:00",
        )
        assert event.is_overnight is True

    def test_all_day_same_date_not_overnight(self) -> None:
        event = PlannerEvent(
            start="2026-04-07",
            end="2026-04-07",
            all_day=True,
        )
        assert event.is_overnight is False

    def test_empty_times_not_overnight(self) -> None:
        event = PlannerEvent()
        assert event.is_overnight is False

    def test_invalid_iso_not_overnight(self) -> None:
        event = PlannerEvent(start="not-a-date", end="also-bad")
        assert event.is_overnight is False

    def test_template_overnight_when_end_before_start(self) -> None:
        tmpl = ShiftTemplate(start_time="22:00", end_time="06:00")
        assert tmpl.is_overnight is True

    def test_template_not_overnight_when_end_after_start(self) -> None:
        tmpl = ShiftTemplate(start_time="06:00", end_time="14:00")
        assert tmpl.is_overnight is False

    def test_template_not_overnight_when_empty(self) -> None:
        tmpl = ShiftTemplate()
        assert tmpl.is_overnight is False
