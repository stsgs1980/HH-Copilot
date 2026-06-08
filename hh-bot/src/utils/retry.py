"""Exponential backoff retry with circuit breaker — ported from HH-Copilot.

Skill reference: api-retry
- Exponential backoff with configurable multiplier
- Circuit breaker pattern (CLOSED -> OPEN -> HALF_OPEN)
- Retryable HTTP status codes (408, 429, 500, 502, 503, 504)
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Any, Callable, Coroutine, TypeVar

import httpx

logger = logging.getLogger(__name__)

T = TypeVar("T")

RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}

DEFAULT_RETRY_CONFIG = {
    "max_retries": 3,
    "initial_delay": 1.0,
    "max_delay": 10.0,
    "backoff_multiplier": 2.0,
}


class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreaker:
    """Circuit breaker for protecting against cascading failures.

    - CLOSED: Normal operation, requests pass through
    - OPEN: Failures exceeded threshold, requests are rejected
    - HALF_OPEN: Testing if service recovered, limited requests pass
    """

    def __init__(self, threshold: int = 5, timeout: float = 60.0):
        self.threshold = threshold
        self.timeout = timeout
        self.failure_count: int = 0
        self.last_failure_time: float = 0
        self.state: CircuitState = CircuitState.CLOSED
        self._success_count: int = 0

    async def execute(self, fn: Callable[..., Coroutine[Any, Any, T]]) -> T:
        """Execute a function through the circuit breaker."""
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time < self.timeout:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker is OPEN. Retry after {self.timeout - (time.time() - self.last_failure_time):.0f}s"
                )
            self.state = CircuitState.HALF_OPEN
            logger.info("Circuit breaker -> HALF_OPEN, testing recovery")

        try:
            result = await fn()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self) -> None:
        self.failure_count = 0
        self._success_count += 1
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            logger.info("Circuit breaker -> CLOSED (recovered)")

    def _on_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                "Circuit breaker -> OPEN (%d failures in threshold)",
                self.failure_count,
            )

    @property
    def is_open(self) -> bool:
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.timeout:
                return False
            return True
        return False


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is in OPEN state."""
    pass


async def retry_with_backoff(
    fn: Callable[..., Coroutine[Any, Any, T]],
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 10.0,
    backoff_multiplier: float = 2.0,
    retryable_codes: set[int] | None = None,
) -> T:
    """Execute an async function with exponential backoff retry.

    Args:
        fn: Async function to execute
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        backoff_multiplier: Multiplier for each retry
        retryable_codes: HTTP status codes that trigger retry

    Returns:
        Result of the function

    Raises:
        Last exception if all retries fail
    """
    codes = retryable_codes or RETRYABLE_STATUS_CODES
    last_error: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except httpx.HTTPStatusError as e:
            last_error = e
            if e.response.status_code not in codes:
                logger.debug("Non-retryable status %d", e.response.status_code)
                raise
            logger.debug(
                "Retryable HTTP %d, attempt %d/%d",
                e.response.status_code,
                attempt + 1,
                max_retries,
            )
        except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout) as e:
            last_error = e
            logger.debug("Connection error, attempt %d/%d: %s", attempt + 1, max_retries, e)

        if attempt < max_retries:
            delay = min(initial_delay * (backoff_multiplier ** attempt), max_delay)
            # Add jitter (0-25% of delay)
            jitter = delay * 0.25 * (asyncio.get_event_loop().time() % 1)
            actual_delay = delay + jitter
            logger.debug("Waiting %.1fs before retry", actual_delay)
            await asyncio.sleep(actual_delay)

    if last_error:
        raise last_error
    raise RuntimeError("All retry attempts exhausted")


class ResilientHttpClient:
    """HTTP client with retry + circuit breaker.

    Combines exponential backoff with circuit breaker pattern
    for robust API communication.
    """

    def __init__(
        self,
        base_url: str = "",
        headers: dict[str, str] | None = None,
        circuit_threshold: int = 5,
        circuit_timeout: float = 60.0,
        max_retries: int = 3,
        timeout: float = 30.0,
    ):
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers=headers or {},
            timeout=httpx.Timeout(timeout),
        )
        self.circuit = CircuitBreaker(threshold=circuit_threshold, timeout=circuit_timeout)
        self.max_retries = max_retries
        self._closed = False

    async def request(
        self,
        method: str,
        url: str,
        retry_on_codes: set[int] | None = None,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make an HTTP request with retry and circuit breaker."""

        async def _do_request() -> httpx.Response:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response

        return await self.circuit.execute(
            lambda: retry_with_backoff(
                _do_request,
                max_retries=self.max_retries,
                retryable_codes=retry_on_codes or RETRYABLE_STATUS_CODES,
            )
        )

    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self.request("POST", url, **kwargs)

    async def close(self) -> None:
        if not self._closed:
            await self.client.aclose()
            self._closed = True

    async def __aenter__(self) -> "ResilientHttpClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
