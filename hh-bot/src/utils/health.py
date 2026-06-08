"""Health check utilities for monitoring HH.ru API availability.

Skill reference: health-check
- Periodic health monitoring of HH.ru API
- Response time tracking
- Availability percentage calculation
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


@dataclass
class HealthStatus:
    """Health check result for a service endpoint."""

    url: str
    is_healthy: bool = False
    response_time_ms: float = 0.0
    status_code: int | None = None
    error: str | None = None
    checked_at: float = field(default_factory=time.time)


@dataclass
class HealthTracker:
    """Tracks health history and computes availability metrics."""

    max_history: int = 100
    checks: list[HealthStatus] = field(default_factory=list)

    def add(self, status: HealthStatus) -> None:
        self.checks.append(status)
        if len(self.checks) > self.max_history:
            self.checks = self.checks[-self.max_history :]

    @property
    def availability_pct(self) -> float:
        if not self.checks:
            return 0.0
        healthy = sum(1 for c in self.checks if c.is_healthy)
        return (healthy / len(self.checks)) * 100

    @property
    def avg_response_time_ms(self) -> float:
        if not self.checks:
            return 0.0
        times = [c.response_time_ms for c in self.checks if c.is_healthy]
        return sum(times) / len(times) if times else 0.0

    @property
    def last_check(self) -> HealthStatus | None:
        return self.checks[-1] if self.checks else None


async def check_hh_api_health(
    base_url: str = "https://api.hh.ru",
    timeout: float = 10.0,
) -> HealthStatus:
    """Check HH.ru API health by requesting the /dictionaries endpoint.

    This is a lightweight endpoint that requires no authentication.
    """
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(f"{base_url}/dictionaries")
            elapsed = (time.monotonic() - start) * 1000
            return HealthStatus(
                url=f"{base_url}/dictionaries",
                is_healthy=response.status_code == 200,
                response_time_ms=elapsed,
                status_code=response.status_code,
            )
    except Exception as e:
        elapsed = (time.monotonic() - start) * 1000
        return HealthStatus(
            url=f"{base_url}/dictionaries",
            is_healthy=False,
            response_time_ms=elapsed,
            error=str(e),
        )


class HHHealthMonitor:
    """Periodic health monitor for HH.ru API."""

    def __init__(
        self,
        base_url: str = "https://api.hh.ru",
        check_interval: float = 300.0,  # 5 minutes
        timeout: float = 10.0,
    ):
        self.base_url = base_url
        self.check_interval = check_interval
        self.timeout = timeout
        self.tracker = HealthTracker()
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start periodic health monitoring."""
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info("HH.ru health monitor started (interval=%.0fs)", self.check_interval)

    async def stop(self) -> None:
        """Stop health monitoring."""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("HH.ru health monitor stopped")

    async def _monitor_loop(self) -> None:
        while True:
            status = await check_hh_api_health(self.base_url, self.timeout)
            self.tracker.add(status)
            if not status.is_healthy:
                logger.warning(
                    "HH.ru API unhealthy: status=%s, error=%s",
                    status.status_code,
                    status.error,
                )
            await asyncio.sleep(self.check_interval)

    @property
    def is_healthy(self) -> bool:
        """Current API health status."""
        last = self.tracker.last_check
        return last.is_healthy if last else True  # Assume healthy before first check

    @property
    def availability(self) -> float:
        return self.tracker.availability_pct

    @property
    def avg_latency(self) -> float:
        return self.tracker.avg_response_time_ms
