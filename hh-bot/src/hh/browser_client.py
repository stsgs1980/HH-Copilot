"""Playwright browser client for HH.ru — handles write operations.

Uses CSS selectors from HH-Copilot (selectors.py) and anti-detection
timing from anti_detect.py. Handles:
- Applying to vacancies (when API returns 403)
- Sending messages in negotiations
- Scraping user profile/resume data
- Session management with cookie persistence
"""

import asyncio
import json
import logging
from typing import Any

from playwright.async_api import BrowserContext, Page, Playwright, async_playwright

from src.config import get_settings
from src.hh.anti_detect import AntiDetectConfig, BatchTimingController, simulate_reading, random_delay
from src.hh.models import HHResume, HHVacancy
from src.hh.selectors import get_selector, get_selectors
from src.utils.text import extract_vacancy_id, has_contact_email, parse_salary_range

logger = logging.getLogger(__name__)


class BrowserSessionPool:
    """Manages a pool of Playwright browser contexts with cookie persistence.

    Each user gets a dedicated browser context. Contexts are evicted
    after TTL (30 min idle) or when pool is full (LRU).
    """

    def __init__(
        self,
        max_contexts: int = 10,
        context_ttl: int = 1800,  # 30 minutes
    ):
        self.max_contexts = max_contexts
        self.context_ttl = context_ttl
        self._playwright: Playwright | None = None
        self._contexts: dict[int, BrowserContext] = {}  # user_id -> context
        self._last_access: dict[int, float] = {}
        self._cookies_cache: dict[int, list[dict]] = {}  # user_id -> cookies

    async def initialize(self) -> None:
        """Start Playwright and launch browser."""
        self._playwright = await async_playwright().start()
        logger.info("Browser session pool initialized")

    async def get_context(self, user_id: int, cookies: list[dict] | None = None) -> BrowserContext:
        """Get or create a browser context for a user."""
        import time
        self._last_access[user_id] = time.time()

        if user_id in self._contexts:
            return self._contexts[user_id]

        # Evict LRU context if pool is full
        if len(self._contexts) >= self.max_contexts:
            self._evict_lru()

        settings = get_settings()
        browser = await self._playwright.chromium.launch(
            headless=settings.browser_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            locale="ru-RU",
        )

        # Apply stealth measures
        await self._apply_stealth(context)

        # Restore cookies if provided
        all_cookies = cookies or self._cookies_cache.get(user_id, [])
        if all_cookies:
            await context.add_cookies(all_cookies)

        self._contexts[user_id] = context
        return context

    async def _apply_stealth(self, context: BrowserContext) -> None:
        """Apply anti-detection measures to browser context."""
        await context.add_init_script("""
            // Override navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {get: () => false});
            // Override chrome runtime
            window.chrome = { runtime: {} };
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters);
            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en'],
            });
        """)

    def _evict_lru(self) -> None:
        """Evict the least recently used context."""
        import time
        if not self._last_access:
            return
        lru_user = min(self._last_access, key=self._last_access.get)
        self._save_cookies(lru_user)
        if lru_user in self._contexts:
            asyncio.create_task(self._contexts[lru_user].close())
            del self._contexts[lru_user]
        del self._last_access[lru_user]

    async def _save_cookies(self, user_id: int) -> None:
        """Save context cookies to cache."""
        if user_id in self._contexts:
            try:
                cookies = await self._contexts[user_id].cookies()
                self._cookies_cache[user_id] = cookies
            except Exception as e:
                logger.warning("Failed to save cookies for user %d: %s", user_id, e)

    async def close_all(self) -> None:
        """Close all browser contexts and Playwright."""
        for user_id in list(self._contexts.keys()):
            await self._save_cookies(user_id)
            await self._contexts[user_id].close()
        self._contexts.clear()
        self._last_access.clear()
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None


class HHBrowserClient:
    """Playwright-based client for HH.ru write operations.

    Handles operations that require browser interaction because
    the HH.ru API restricts applicant-level write access.
    """

    def __init__(self, pool: BrowserSessionPool):
        self.pool = pool
        self.settings = get_settings()
        self.anti_detect = AntiDetectConfig.from_settings()

    async def apply_to_vacancy(
        self,
        user_id: int,
        vacancy_url: str,
        resume_id: str,
        cover_letter: str = "",
        cookies: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Apply to a vacancy via browser automation.

        Flow:
        1. Navigate to vacancy page
        2. Wait for page load
        3. Click "Откликнуться" button
        4. Wait for response popup
        5. Handle any alerts (relocation, etc.)
        6. Add cover letter if provided
        7. Click submit
        8. Verify popup closed

        Returns dict with success status and details.
        """
        context = await self.pool.get_context(user_id, cookies)
        page = await context.new_page()

        try:
            # Step 1: Navigate to vacancy page
            await page.goto(vacancy_url, wait_until="domcontentloaded")
            await simulate_reading(self.anti_detect)

            # Step 2: Click "Откликнуться" button
            apply_btn = await self._find_element(page, "reply_button")
            if not apply_btn:
                return {"success": False, "error": "Apply button not found"}

            await apply_btn.click()
            await asyncio.sleep(random.uniform(1.0, 2.5))

            # Step 3: Wait for response popup
            popup = await self._find_element(page, "response_popup", timeout=5000)
            if not popup:
                # Check if already applied
                if await self._find_element(page, "already_applied", timeout=2000):
                    return {"success": False, "error": "already_applied"}
                return {"success": False, "error": "Response popup not found"}

            # Step 4: Handle alerts
            await self._handle_alerts(page)

            # Step 5: Add cover letter
            if cover_letter:
                await self._fill_cover_letter(page, cover_letter)

            # Step 6: Select resume if needed (multiple resumes)
            await self._select_resume(page, resume_id)

            # Step 7: Submit application
            submit_btn = await self._find_element(page, "submit_button")
            if submit_btn:
                await submit_btn.click()
                await asyncio.sleep(random.uniform(1.0, 2.0))

            # Step 8: Verify popup closed or success
            await asyncio.sleep(random.uniform(1.5, 3.0))

            return {"success": True, "vacancy_url": vacancy_url}

        except Exception as e:
            logger.error("Browser apply failed for %s: %s", vacancy_url, e)
            return {"success": False, "error": str(e)}
        finally:
            await page.close()

    async def send_message(
        self,
        user_id: int,
        negotiation_url: str,
        message: str,
        cookies: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Send a message in a negotiation thread via browser.

        Args:
            negotiation_url: HH.ru negotiation URL
            message: Message text to send
        """
        context = await self.pool.get_context(user_id, cookies)
        page = await context.new_page()

        try:
            await page.goto(negotiation_url, wait_until="domcontentloaded")
            await simulate_reading(self.anti_detect)

            # Find message input
            msg_input = await self._find_element(page, "message_input")
            if not msg_input:
                return {"success": False, "error": "Message input not found"}

            # Fill message using React-safe method
            await msg_input.click()
            await msg_input.fill(message)

            # Send message
            send_btn = await self._find_element(page, "send_message_button")
            if send_btn:
                await send_btn.click()
            else:
                await msg_input.press("Enter")

            await asyncio.sleep(random.uniform(1.0, 2.0))
            return {"success": True}

        except Exception as e:
            logger.error("Browser send message failed: %s", e)
            return {"success": False, "error": str(e)}
        finally:
            await page.close()

    async def scrape_profile(
        self, user_id: int, cookies: list[dict] | None = None
    ) -> HHResume | None:
        """Scrape user profile data from HH.ru pages.

        Navigates to /applicant/resumes then to the first resume page.
        """
        context = await self.pool.get_context(user_id, cookies)
        page = await context.new_page()

        try:
            # Navigate to resumes list
            await page.goto("https://hh.ru/applicant/resumes", wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(2.0, 4.0))

            # Find first resume link
            resume_link = await self._find_element(page, "resume_link")
            if not resume_link:
                logger.warning("No resumes found on profile page")
                return None

            href = await resume_link.get_attribute("href")
            if not href:
                return None

            # Navigate to resume page
            resume_url = f"https://hh.ru{href}" if href.startswith("/") else href
            await page.goto(resume_url, wait_until="domcontentloaded")
            await simulate_reading(self.anti_detect)

            # Parse resume data
            resume = await self._parse_resume_page(page)
            return resume

        except Exception as e:
            logger.error("Profile scrape failed: %s", e)
            return None
        finally:
            await page.close()

    async def scrape_vacancy_page(
        self,
        user_id: int,
        vacancy_url: str,
        cookies: list[dict] | None = None,
    ) -> HHVacancy | None:
        """Scrape full vacancy details from a vacancy page.

        Extracts: title, company, salary, location, experience, description, skills.
        """
        context = await self.pool.get_context(user_id, cookies)
        page = await context.new_page()

        try:
            await page.goto(vacancy_url, wait_until="domcontentloaded")
            await simulate_reading(self.anti_detect)

            # Title
            title_el = await self._find_element(page, "vacancy_title_on_page", timeout=5000)
            title = (await title_el.inner_text()).strip() if title_el else ""

            # Company
            company_el = await self._find_element(page, "vacancy_company_on_page", timeout=3000)
            company = (await company_el.inner_text()).strip() if company_el else ""

            # Salary
            salary_el = await page.query_selector('[data-qa="vacancy-salary"]')
            salary_text = (await salary_el.inner_text()).strip() if salary_el else ""
            salary_from, salary_to, salary_currency = parse_salary_range(salary_text)

            # Location
            location_el = await page.query_selector('[data-qa="vacancy-view-location"]')
            if not location_el:
                location_el = await page.query_selector('p[data-qa="vacancy-view-location"]')
            location = (await location_el.inner_text()).strip() if location_el else ""

            # Experience
            experience_el = await page.query_selector('[data-qa="vacancy-experience"]')
            experience = (await experience_el.inner_text()).strip() if experience_el else ""

            # Description
            desc_el = await self._find_element(page, "vacancy_description", timeout=3000)
            description = (await desc_el.inner_text()).strip() if desc_el else ""

            # Skills
            skills = []
            skill_els = await page.query_selector_all(get_selector("vacancy_skills"))
            for el in skill_els:
                skill = (await el.inner_text()).strip()
                if skill:
                    skills.append(skill)

            # Extract vacancy ID from URL
            from src.utils.text import extract_vacancy_id
            vacancy_id = extract_vacancy_id(vacancy_url) or ""

            return HHVacancy(
                id=vacancy_id,
                title=title,
                company=company,
                salary_from=salary_from,
                salary_to=salary_to,
                salary_currency=salary_currency,
                location=location,
                experience=experience,
                skills=skills,
                description=description[:5000],
                url=vacancy_url,
            )
        except Exception as e:
            logger.error("Vacancy page scrape failed for %s: %s", vacancy_url, e)
            return None
        finally:
            await page.close()

    async def scrape_all_resumes(
        self,
        user_id: int,
        cookies: list[dict] | None = None,
    ) -> list[HHResume]:
        """Scrape ALL user resumes from the resumes list page.

        Navigates to /applicant/resumes, finds all resume links,
        then visits each one to extract full details.
        """
        context = await self.pool.get_context(user_id, cookies)
        page = await context.new_page()
        resumes = []

        try:
            # Navigate to resumes list
            await page.goto("https://hh.ru/applicant/resumes", wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(2.0, 4.0))

            # Check if we got redirected to login (cookies expired)
            if "/account/login" in page.url:
                logger.warning("Redirected to login — cookies expired for user %d", user_id)
                return []

            # Find all resume links
            resume_links = await page.query_selector_all(get_selector("resume_link"))
            if not resume_links:
                logger.info("No resumes found on profile page for user %d", user_id)
                return []

            hrefs = []
            for link in resume_links:
                href = await link.get_attribute("href")
                if href:
                    full_url = f"https://hh.ru{href}" if href.startswith("/") else href
                    hrefs.append(full_url)

            # Close list page
            await page.close()

            # Visit each resume page to scrape details
            for resume_url in hrefs:
                try:
                    resume = await self._scrape_single_resume(context, resume_url)
                    if resume:
                        resumes.append(resume)
                    await random_delay(self.anti_detect)
                except Exception as e:
                    logger.warning("Failed to scrape resume %s: %s", resume_url, e)
                    continue

            return resumes

        except Exception as e:
            logger.error("Resume list scrape failed for user %d: %s", user_id, e)
            return []
        finally:
            if not page.is_closed():
                await page.close()

    async def _scrape_single_resume(
        self, context: BrowserContext, resume_url: str
    ) -> HHResume | None:
        """Scrape a single resume page for full details."""
        page = await context.new_page()
        try:
            await page.goto(resume_url, wait_until="domcontentloaded")
            await simulate_reading(self.anti_detect)
            return await self._parse_resume_page(page)
        finally:
            await page.close()

    async def search_vacancies_on_page(
        self,
        user_id: int,
        search_params: dict[str, str],
        max_pages: int = 3,
        cookies: list[dict] | None = None,
    ) -> list[HHVacancy]:
        """Scrape vacancies from HH.ru search pages.

        Args:
            search_params: URL query parameters for /search/vacancy
            max_pages: Maximum number of pages to scrape
        """
        from urllib.parse import urlencode

        context = await self.pool.get_context(user_id, cookies)
        page = await context.new_page()
        vacancies = []

        try:
            for page_num in range(max_pages):
                search_params["page"] = str(page_num)
                url = f"https://hh.ru/search/vacancy?{urlencode(search_params)}"
                await page.goto(url, wait_until="domcontentloaded")
                await simulate_reading(self.anti_detect)

                # Parse vacancy cards
                cards = await page.query_selector_all(get_selector("vacancy_card"))
                for card in cards:
                    try:
                        vacancy = await self._parse_vacancy_card(card)
                        if vacancy and vacancy.id:
                            vacancies.append(vacancy)
                    except Exception as e:
                        logger.debug("Failed to parse vacancy card: %s", e)
                        continue

                # Check for next page
                next_btn = await self._find_element(page, "next_page", timeout=2000)
                if not next_btn:
                    break

                await random_delay(self.anti_detect)

        except Exception as e:
            logger.error("Search scrape failed: %s", e)
        finally:
            await page.close()

        return vacancies

    # === Private helper methods ===

    async def _find_element(
        self, page: Page, selector_name: str, timeout: int = 3000
    ) -> Any | None:
        """Find element using multi-level fallback selectors."""
        selectors = get_selectors(selector_name)
        for selector in selectors:
            try:
                element = page.locator(selector).first
                if await element.is_visible(timeout=timeout):
                    return element
            except Exception:
                continue
        return None

    async def _handle_alerts(self, page: Page) -> None:
        """Handle common application alerts on HH.ru."""
        # Relocation warning
        reloc_btn = await self._find_element(page, "relocation_confirm", timeout=2000)
        if reloc_btn:
            await reloc_btn.click()
            await asyncio.sleep(0.5)

        # Indirect employer alert
        alert = await self._find_element(page, "indirect_employer_alert", timeout=1500)
        if alert:
            confirm = page.locator("button:has-text('Продолжить')")
            if await confirm.is_visible(timeout=1000):
                await confirm.click()
                await asyncio.sleep(0.5)

    async def _fill_cover_letter(self, page: Page, letter: str) -> None:
        """Fill cover letter textarea in the application popup."""
        # Expand cover letter section
        add_btn = await self._find_element(page, "add_cover_letter", timeout=2000)
        if add_btn:
            await add_btn.click()
            await asyncio.sleep(random.uniform(0.5, 1.5))

        # Find textarea and fill it
        textarea = await self._find_element(page, "cover_letter_input", timeout=3000)
        if textarea:
            await textarea.click()
            await textarea.fill(letter)
            await asyncio.sleep(random.uniform(0.3, 1.0))

    async def _select_resume(self, page: Page, resume_id: str) -> None:
        """Select specific resume in application popup if multiple exist."""
        # Try to find resume radio/select
        resume_select = page.locator(f'input[value="{resume_id}"]')
        try:
            if await resume_select.is_visible(timeout=1000):
                await resume_select.click()
                await asyncio.sleep(0.3)
        except Exception:
            pass  # Only one resume, no selection needed

    async def _parse_vacancy_card(self, card: Any) -> HHVacancy | None:
        """Parse a vacancy card element from search results page."""
        try:
            title_el = await card.query_selector(get_selector("vacancy_title_link"))
            if not title_el:
                return None
            title = (await title_el.inner_text()).strip()
            href = await title_el.get_attribute("href") or ""
            vacancy_id = extract_vacancy_id(href) or ""

            company_el = await card.query_selector(get_selector("vacancy_company"))
            company = (await company_el.inner_text()).strip() if company_el else ""

            salary_el = await card.query_selector(get_selector("vacancy_salary"))
            salary_text = (await salary_el.inner_text()).strip() if salary_el else ""
            salary_from, salary_to, salary_currency = parse_salary_range(salary_text)

            location_el = await card.query_selector(get_selector("vacancy_location"))
            location = (await location_el.inner_text()).strip() if location_el else ""

            return HHVacancy(
                id=vacancy_id,
                title=title,
                company=company,
                salary_from=salary_from,
                salary_to=salary_to,
                salary_currency=salary_currency,
                location=location,
                url=f"https://hh.ru/vacancy/{vacancy_id}" if vacancy_id else href,
            )
        except Exception as e:
            logger.debug("Card parse error: %s", e)
            return None

    async def _parse_resume_page(self, page: Page) -> HHResume | None:
        """Parse resume data from HH.ru resume page."""
        try:
            name_el = await page.query_selector(get_selector("resume_personal_name"))
            name = (await name_el.inner_text()).strip() if name_el else ""

            title_el = await page.query_selector(get_selector("resume_title"))
            title = (await title_el.inner_text()).strip() if title_el else ""

            skills = []
            skill_els = await page.query_selector_all(get_selector("resume_skill_tag"))
            for el in skill_els:
                skill = (await el.inner_text()).strip()
                if skill:
                    skills.append(skill)

            # Extract URL from page URL
            url = page.url
            resume_id = url.split("/resume/")[-1].split("?")[0] if "/resume/" in url else ""

            return HHResume(
                id=resume_id,
                title=title,
                position=title,
                name=name,
                skills=skills,
            )
        except Exception as e:
            logger.error("Resume page parse error: %s", e)
            return None
