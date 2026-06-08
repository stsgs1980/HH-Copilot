"""Anti-detection timing module — ported from HH-Copilot.

Provides human-like delays and interaction patterns to avoid bot detection
on HH.ru. Uses Gaussian distribution for realistic timing.
"""

import asyncio
import math
import random
from dataclasses import dataclass, field

from src.config import get_settings


@dataclass
class AntiDetectConfig:
    """Configuration for anti-detection timing."""

    enabled: bool = True
    gaussian_mean: float = 10.0  # seconds
    gaussian_stddev: float = 4.0
    reading_pause_min: float = 5.0
    reading_pause_max: float = 12.0
    long_pause_every: int = 5
    long_pause_duration: float = 30.0
    typing_delay_min: float = 0.03  # 30ms per character
    typing_delay_max: float = 0.12  # 120ms per character
    mouse_jitter: bool = True

    @classmethod
    def from_settings(cls) -> "AntiDetectConfig":
        s = get_settings()
        return cls(
            enabled=s.anti_detect_enabled,
            gaussian_mean=s.gaussian_mean_sec,
            gaussian_stddev=s.gaussian_stddev_sec,
            reading_pause_min=s.reading_pause_min_sec,
            reading_pause_max=s.reading_pause_max_sec,
            long_pause_every=s.long_pause_every_n,
            long_pause_duration=s.long_pause_duration_sec,
        )


def gaussian_random(mean: float = 10.0, stddev: float = 4.0) -> float:
    """Generate a Gaussian-distributed random value (Box-Muller transform).

    Returns a value clamped to minimum 2.0 seconds.
    """
    u1 = random.random()
    u2 = random.random()
    while u1 == 0:
        u1 = random.random()
    z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    return max(2.0, mean + z * stddev)


async def random_delay(config: AntiDetectConfig | None = None) -> float:
    """Gaussian-distributed random delay. Returns the delay duration."""
    if config is None:
        config = AntiDetectConfig.from_settings()
    if not config.enabled:
        return 0.0
    delay = gaussian_random(config.gaussian_mean, config.gaussian_stddev)
    await asyncio.sleep(delay)
    return delay


async def simulate_reading(config: AntiDetectConfig | None = None) -> float:
    """Simulate reading a vacancy page (5-12s uniform random pause)."""
    if config is None:
        config = AntiDetectConfig.from_settings()
    if not config.enabled:
        return 0.0
    duration = random.uniform(config.reading_pause_min, config.reading_pause_max)
    await asyncio.sleep(duration)
    return duration


async def simulate_long_pause(config: AntiDetectConfig | None = None) -> float:
    """Simulate a long pause (25-40s) — used every N actions."""
    if config is None:
        config = AntiDetectConfig.from_settings()
    if not config.enabled:
        return 0.0
    duration = config.long_pause_duration + random.uniform(-5.0, 10.0)
    duration = max(20.0, duration)
    await asyncio.sleep(duration)
    return duration


async def simulate_typing(text: str, config: AntiDetectConfig | None = None) -> None:
    """Simulate human typing with per-character delay (30-120ms)."""
    if config is None:
        config = AntiDetectConfig.from_settings()
    if not config.enabled:
        return
    for _ in text:
        delay = random.uniform(config.typing_delay_min, config.typing_delay_max)
        await asyncio.sleep(delay)


class BatchTimingController:
    """Controls timing for batch vacancy applications.

    Tracks the number of actions and inserts long pauses every N actions.
    """

    def __init__(self, config: AntiDetectConfig | None = None):
        self.config = config or AntiDetectConfig.from_settings()
        self.action_count: int = 0

    async def between_applications(self) -> float:
        """Delay between applications with occasional long pauses."""
        self.action_count += 1
        if self.config.enabled and self.action_count % self.long_pause_every == 0:
            return await simulate_long_pause(self.config)
        return await random_delay(self.config)

    @property
    def long_pause_every(self) -> int:
        return self.config.long_pause_every

    def reset(self) -> None:
        self.action_count = 0
