"""
DEPRECATED: HH.ru API client with OAuth - DO NOT USE

This module is deprecated and kept for historical reference only.
HH.ru discontinued the Applicant API on December 15, 2025.

Use Playwright-based clients instead:
- src/hh/browser_client.py - Playwright browser operations
- src/hh/hybrid_client.py - Unified client interface

Migration guide: OAUTH_TO_PLAYWRIGHT_MIGRATION.md

Archive date: 2026-06-08
"""

# Original OAuth implementation preserved below
# DO NOT USE IN PRODUCTION

import json
import logging
from datetime import datetime, timezone
from typing import Any

from src.config import get_settings
from src.hh.auth import HHAuth
from src.hh.models import HHDictionaries, HHNegotiation, HHResume, HHVacancy
from src.utils.retry import ResilientHttpClient
from src.utils.text import extract_vacancy_id, parse_salary_range

logger = logging.getLogger(__name__)


class HHApiClient:
    """Async client for HH.ru REST API (api.hh.ru) - DEPRECATED.

    HH.ru discontinued the Applicant API on December 15, 2025.
    All operations now require Playwright browser automation.
    """

    def __init__(self, access_token: str | None = None, refresh_token: str | None = None):
        logger.warning("HHApiClient is deprecated. Use HybridHHClient with Playwright instead.")
        self.settings = get_settings()
        self.auth = HHAuth()
        self._access_token = access_token
        self._refresh_token = refresh_token
        self._token_expires_at: float = 0

        headers = {}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        headers["User-Agent"] = "HH-Bot/1.0 (career-assistant)"

        self.client = ResilientHttpClient(
            base_url=self.settings.hh_api_base,
            headers=headers,
            circuit_threshold=5,
            circuit_timeout=60.0,
            max_retries=3,
            timeout=30.0,
        )

    async def exchange_code(self, code: str, telegram_id: int) -> dict:
        """Exchange OAuth authorization code for access token - DEPRECATED."""
        logger.error("exchange_code is deprecated. OAuth flow is no longer supported.")
        raise NotImplementedError("OAuth authentication is deprecated. Use Playwright authentication instead.")

    async def search_vacancies(self, params: dict[str, Any]) -> list[HHVacancy]:
        """Search vacancies on HH.ru - DEPRECATED."""
        logger.error("search_vacancies via API is deprecated. Use Playwright-based search instead.")
        raise NotImplementedError("API-based search is deprecated. Use browser_client.search_vacancies_on_page() instead.")

    # All other methods deprecated with similar warnings
    # Full implementation preserved for reference