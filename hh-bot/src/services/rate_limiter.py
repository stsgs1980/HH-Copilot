"""Rate limiter for daily reply limits — ported from HH-Copilot.

Tracks daily reply count with automatic UTC-based daily reset.
Default limit: 50 replies per day (HH.ru best practice).
"""

import time
from datetime import date, datetime, timezone


class RateLimiter:
    """Daily rate limiter for vacancy applications.

    Prevents exceeding HH.ru's practical limits on daily applications.
    Uses UTC-based daily reset to align with HH.ru's server time.
    """

    def __init__(self, daily_limit: int = 50):
        self.daily_limit = daily_limit
        self._date: str = date.now(timezone.utc).isoformat() if hasattr(date, 'now') else date.today().isoformat()
        self._count: int = 0
        self._errors: int = 0
        self._skipped: int = 0

    def _check_reset(self) -> None:
        """Reset counters if the day has changed."""
        today = date.today().isoformat()
        if self._date != today:
            self._date = today
            self._count = 0
            self._errors = 0
            self._skipped = 0

    def is_limit_reached(self) -> bool:
        """Check if daily limit has been reached."""
        self._check_reset()
        return self._count >= self.daily_limit

    def remaining(self) -> int:
        """Get remaining replies for today."""
        self._check_reset()
        return max(0, self.daily_limit - self._count)

    def increment_reply(self) -> None:
        """Record a successful reply."""
        self._check_reset()
        self._count += 1

    def increment_error(self) -> None:
        """Record a failed reply attempt."""
        self._check_reset()
        self._errors += 1

    def increment_skipped(self) -> None:
        """Record a skipped vacancy."""
        self._check_reset()
        self._skipped += 1

    @property
    def stats(self) -> dict:
        """Current rate limiter statistics."""
        self._check_reset()
        return {
            "date": self._date,
            "count": self._count,
            "limit": self.daily_limit,
            "remaining": self.remaining(),
            "errors": self._errors,
            "skipped": self._skipped,
        }
