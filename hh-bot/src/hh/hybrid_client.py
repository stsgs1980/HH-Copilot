"""Hybrid HH.ru client — Playwright-first approach (API discontinued Dec 2025).

Since HH.ru discontinued the Applicant API on December 15, 2025,
ALL operations now go through Playwright browser automation.

Architecture:
    ┌─────────────────┐
    │  HybridClient   │
    │   (facade)      │
    └────────┬────────┘
             │
      Playwright Browser
      (all read + write ops)
"""

import json
import logging
from typing import Any

from src.hh.browser_client import BrowserSessionPool, HHBrowserClient
from src.hh.models import HHResume, HHVacancy

logger = logging.getLogger(__name__)


class HybridHHClient:
    """Playwright-only client for HH.ru.

    Strategy (post-API deprecation):
    - ALL operations use Playwright browser automation
    - Cookies are used for session persistence
    - BrowserSessionPool manages per-user contexts with LRU eviction

    No API calls are made — the HH.ru Applicant API was discontinued
    on December 15, 2025, and is no longer available.
    """

    def __init__(
        self,
        access_token: str | None = None,
        refresh_token: str | None = None,
        user_id: int = 0,
        cookies_json: str | None = None,
    ):
        # Token params are accepted for backward compatibility but unused
        self._access_token = access_token
        self._refresh_token = refresh_token
        self.user_id = user_id
        self._cookies_json = cookies_json

        self.browser_pool = BrowserSessionPool()
        self.browser_client = HHBrowserClient(self.browser_pool)
        self._initialized = False

    def _get_cookies(self) -> list[dict] | None:
        """Parse cookies from JSON string."""
        if not self._cookies_json:
            return None
        try:
            return json.loads(self._cookies_json)
        except (json.JSONDecodeError, TypeError):
            logger.warning("Failed to parse cookies for user %d", self.user_id)
            return None

    async def initialize(self) -> None:
        """Initialize browser pool."""
        if not self._initialized:
            await self.browser_pool.initialize()
            self._initialized = True

    async def close(self) -> None:
        """Close all resources."""
        if self._initialized:
            await self.browser_pool.close_all()

    # === Read operations (Playwright-only) ===

    async def search_vacancies(self, params: dict[str, Any]) -> list[HHVacancy]:
        """Search vacancies via Playwright browser scraping.

        Args:
            params: Search parameters (text, area, specialization, etc.)
                    These are converted to HH.ru search URL query params.
        """
        try:
            await self.initialize()
            return await self.browser_client.search_vacancies_on_page(
                self.user_id, params, cookies=self._get_cookies()
            )
        except Exception as e:
            logger.error("Playwright vacancy search failed: %s", e)
            return []

    async def get_resumes(self) -> list[HHResume]:
        """Get user resumes via Playwright profile scraping."""
        try:
            await self.initialize()
            resume = await self.browser_client.scrape_profile(
                self.user_id, cookies=self._get_cookies()
            )
            return [resume] if resume else []
        except Exception as e:
            logger.error("Playwright get_resumes failed: %s", e)
            return []

    async def scrape_vacancy_details(self, vacancy_id: str) -> HHVacancy | None:
        """Scrape full vacancy details from the vacancy page.

        Args:
            vacancy_id: HH.ru vacancy ID
        """
        try:
            await self.initialize()
            vacancy_url = f"https://hh.ru/vacancy/{vacancy_id}"
            return await self.browser_client.scrape_vacancy_page(
                self.user_id, vacancy_url, cookies=self._get_cookies()
            )
        except Exception as e:
            logger.error("Playwright vacancy details scrape failed: %s", e)
            return None

    # === Write operations (Playwright-only) ===

    async def apply_to_vacancy(
        self,
        vacancy_id: str,
        resume_id: str = "",
        cover_letter: str = "",
        vacancy_url: str = "",
    ) -> dict[str, Any]:
        """Apply to a vacancy via Playwright browser automation.

        Flow:
        1. Navigate to vacancy page
        2. Click "Откликнуться" button
        3. Handle alerts (relocation, indirect employer)
        4. Fill cover letter if provided
        5. Submit application
        """
        try:
            await self.initialize()

            if not vacancy_url:
                vacancy_url = f"https://hh.ru/vacancy/{vacancy_id}"

            result = await self.browser_client.apply_to_vacancy(
                self.user_id,
                vacancy_url,
                resume_id,
                cover_letter,
                cookies=self._get_cookies(),
            )
            result["method"] = "browser"
            return result
        except Exception as e:
            logger.error("Playwright apply failed for vacancy %s: %s", vacancy_id, e)
            return {"success": False, "error": str(e), "method": "browser"}

    async def send_message(
        self,
        negotiation_id: str,
        message: str,
        negotiation_url: str = "",
    ) -> dict[str, Any]:
        """Send message in negotiation via Playwright browser automation."""
        try:
            await self.initialize()

            if not negotiation_url:
                negotiation_url = f"https://hh.ru/applicant/negotiations/{negotiation_id}"

            result = await self.browser_client.send_message(
                self.user_id,
                negotiation_url,
                message,
                cookies=self._get_cookies(),
            )
            result["method"] = "browser"
            return result
        except Exception as e:
            logger.error("Playwright send_message failed: %s", e)
            return {"success": False, "error": str(e), "method": "browser"}
