"""Playwright-based HH.ru authentication.

Since HH.ru discontinued the Applicant API (Dec 2025), all operations
require browser-based authentication. This module handles:

- Login via email + password through Playwright
- CAPTCHA detection and screenshot capture for user solving
- 2FA code entry
- Cookie persistence to database for session reuse
- Session verification (check if saved cookies still work)
"""

import asyncio
import base64
import json
import logging
import time
from enum import Enum
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from src.config import get_settings
from src.hh.anti_detect import AntiDetectConfig, simulate_typing
from src.hh.selectors import get_selector, get_selectors

logger = logging.getLogger(__name__)


class LoginState(str, Enum):
    """State machine for the login flow."""
    IDLE = "idle"
    IN_PROGRESS = "in_progress"
    CAPTCHA_REQUIRED = "captcha_required"
    TWO_FA_REQUIRED = "two_fa_required"
    SUCCESS = "success"
    FAILED = "failed"


class LoginSession:
    """Tracks an in-progress login attempt for a user."""

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.state: LoginState = LoginState.IDLE
        self.playwright: Playwright | None = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None
        self.screenshot_base64: str = ""
        self.error_message: str = ""
        self.created_at: float = time.time()

    async def cleanup(self) -> None:
        """Close all browser resources."""
        try:
            if self.page and not self.page.is_closed():
                await self.page.close()
        except Exception:
            pass
        try:
            if self.context:
                await self.context.close()
        except Exception:
            pass
        try:
            if self.browser:
                await self.browser.close()
        except Exception:
            pass
        try:
            if self.playwright:
                await self.playwright.stop()
        except Exception:
            pass
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None


class HHBrowserAuth:
    """Playwright-based HH.ru authenticator.

    Flow:
    1. start_login(email, password) — opens HH.ru login page, fills credentials
    2. If CAPTCHA → screenshot captured, state = captcha_required
       → solve_captcha(text) — user enters CAPTCHA text
    3. If 2FA → state = two_fa_required
       → submit_2fa(code) — user enters SMS/email code
    4. After success → cookies saved to DB, state = success

    All state is kept in memory (_sessions dict) since login is transient.
    """

    # Login sessions indexed by user_id
    _sessions: dict[int, LoginSession] = {}

    # Login page selectors (HH.ru 2026 — Magritte design)
    LOGIN_SELECTORS = {
        # Step 0: Account type selection page
        "applicant_type_submit": [
            'button[data-qa="submit-button"]',  # "Войти" on type selection page
        ],
        "applicant_type_radio": [
            '[data-qa="account-type-card-APPLICANT"]',
        ],
        # Step 1: Email tab + input
        "email_tab": [
            'label:has([data-qa="credential-type-EMAIL"])',
            '[data-qa="credential-type-EMAIL"]',
        ],
        "email_input": [
            'input[data-qa="applicant-login-input-email"]',
            'input[name="username"]',
            'input[type="email"]',
        ],
        # "Войти с паролем" button (expands password field)
        "login_by_password_btn": [
            'button[data-qa="expand-login-by-password"]',
            'button:has-text("Войти с паролем")',
        ],
        # Step 2: Password input
        "password_input": [
            'input[data-qa="applicant-login-input-password"]',
            'input[name="password"]',
            'input[type="password"]',
        ],
        "password_submit": [
            'button[data-qa="submit-button"]',
            'button:has-text("Войти")',
            'button[type="submit"]',
        ],
        # OTP / pincode input (if passwordless login)
        "otp_input": [
            'input[data-qa="magritte-pincode-input-field"]',
            'input[name="code"]',
            'input[inputmode="numeric"]',
        ],
        # CAPTCHA
        "captcha_image": [
            'img[src*="captcha"]',
            '.g-recaptcha',
            'iframe[src*="recaptcha"]',
            '[data-qa="captcha-image"]',
        ],
        "captcha_input": [
            'input[name="captcha"]',
            'input[data-qa="captcha-input"]',
            'input[placeholder*="капч"]',
        ],
        "captcha_submit": [
            'button[data-qa="captcha-submit"]',
            'button:has-text("Отправить")',
        ],
        # 2FA
        "two_fa_input": [
            'input[name="code"]',
            'input[data-qa="otp-code-input"]',
            'input[placeholder*="код"]',
            'input[inputmode="numeric"]',
        ],
        "two_fa_submit": [
            'button[data-qa="otp-submit"]',
            'button:has-text("Подтвердить")',
            'button:has-text("Продолжить")',
            'button[type="submit"]',
        ],
        # Success indicators
        "logged_in_indicator": [
            '[data-qa="mainmenu_applicant"]',
            '[data-qa="mainmenu_user_name"]',
            'a[data-qa="mainmenu_myResumes"]',
            '.mainmenu__user-name',
        ],
        "login_error": [
            '[data-qa="login-error"]',
            '.account-login-error',
            '.bloko-form-error',
        ],
    }

    def __init__(self):
        self.settings = get_settings()
        self.anti_detect = AntiDetectConfig.from_settings()

    async def _find_login_element(
        self, page: Page, selector_name: str, timeout: int = 3000
    ) -> Any | None:
        """Find element using fallback selectors from LOGIN_SELECTORS."""
        selectors = self.LOGIN_SELECTORS.get(selector_name, [])
        for selector in selectors:
            try:
                element = page.locator(selector).first
                if await element.is_visible(timeout=timeout):
                    return element
            except Exception:
                continue
        return None

    async def start_login(self, user_id: int, email: str, password: str) -> dict[str, Any]:
        """Start the Playwright login flow for HH.ru (2026 Magritte design).

        Flow (verified June 2026):
        1. Navigate to https://hh.ru/account/login
        2. APPLICANT type is pre-selected — click "Войти" button
        3. Phone tab is default — click "Почта" tab to switch
        4. Fill email input
        5. Click "Войти с паролем" link to expand password field
        6. Fill password
        7. Click "Дальше" / "Войти" button
        8. Check for CAPTCHA, 2FA/OTP, or success

        Returns dict with state and optional screenshot.
        """
        # Clean up any existing session
        if user_id in self._sessions:
            await self._sessions[user_id].cleanup()

        session = LoginSession(user_id)
        session.state = LoginState.IN_PROGRESS
        self._sessions[user_id] = session

        try:
            # 1. Launch Playwright
            session.playwright = await async_playwright().start()
            session.browser = await session.playwright.chromium.launch(
                headless=self.settings.browser_headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )

            session.context = await session.browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                locale="ru-RU",
            )

            # Apply stealth
            await session.context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => false});
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['ru-RU', 'ru', 'en-US', 'en'],
                });
            """)

            session.page = await session.context.new_page()

            # 2. Navigate to login page
            logger.info("Navigating to HH.ru login page for user %d", user_id)
            await session.page.goto(
                "https://hh.ru/account/login",
                wait_until="domcontentloaded",
                timeout=self.settings.browser_timeout,
            )
            await asyncio.sleep(3.0)

            # 3. Click "Войти" on account type page (applicant is pre-selected)
            type_submit = await self._find_login_element(session.page, "applicant_type_submit", timeout=5000)
            if type_submit:
                await type_submit.click()
                await asyncio.sleep(3.0)
            else:
                logger.warning("Account type submit button not found, might already be past that step")

            # 4. Click "Почта" tab to switch from phone to email input
            # IMPORTANT: The email tab is a radio button inside a label.
            # We must click the label (not just the radio) to switch tabs.
            email_tab_label = await session.page.query_selector('label:has([data-qa="credential-type-EMAIL"])')
            if email_tab_label:
                await email_tab_label.click(force=True)
                await asyncio.sleep(2.0)
                logger.info("Clicked email tab label for user %d", user_id)
            else:
                # Fallback: try clicking the radio directly
                email_tab_radio = await session.page.query_selector('[data-qa="credential-type-EMAIL"]')
                if email_tab_radio:
                    await email_tab_radio.click(force=True)
                    await asyncio.sleep(2.0)
                    logger.info("Clicked email tab radio for user %d", user_id)
                else:
                    logger.info("Email tab not found, email input might already be visible")

            # 5. Fill email
            email_input = await self._find_login_element(session.page, "email_input", timeout=5000)
            if not email_input:
                session.state = LoginState.FAILED
                session.error_message = "Не найдено поле ввода email на странице входа"
                session.screenshot_base64 = await self._take_screenshot(session.page)
                return self._session_status(user_id)

            await email_input.click()
            await simulate_typing(email, self.anti_detect)
            await email_input.fill(email)
            await asyncio.sleep(0.5)

            # 6. Click "Войти с паролем" to expand password field
            password_btn = await self._find_login_element(session.page, "login_by_password_btn", timeout=3000)
            if password_btn:
                await password_btn.click()
                await asyncio.sleep(2.0)
            else:
                logger.info("'Войти с паролем' not found, trying direct password input")

            # 7. Fill password
            password_input = await self._find_login_element(session.page, "password_input", timeout=5000)
            if not password_input:
                # Maybe CAPTCHA appeared, or OTP-only flow
                captcha_result = await self._check_captcha(session)
                if captcha_result:
                    return captcha_result

                # Maybe it went straight to OTP (code-based login)
                otp_input = await self._find_login_element(session.page, "otp_input", timeout=3000)
                if otp_input:
                    logger.info("OTP code required instead of password for user %d", user_id)
                    session.state = LoginState.TWO_FA_REQUIRED
                    session.screenshot_base64 = await self._take_screenshot(session.page)
                    return self._session_status(user_id)

                session.state = LoginState.FAILED
                session.error_message = "Не найдено поле ввода пароля"
                session.screenshot_base64 = await self._take_screenshot(session.page)
                return self._session_status(user_id)

            await password_input.click()
            await simulate_typing(password, self.anti_detect)
            await password_input.fill(password)
            await asyncio.sleep(0.5)

            # 8. Click "Войти" button
            password_submit = await self._find_login_element(session.page, "password_submit", timeout=3000)
            if password_submit:
                await password_submit.click()
                await asyncio.sleep(3.0)
            else:
                await password_input.press("Enter")
                await asyncio.sleep(3.0)

            # 9. Check result
            return await self._check_login_result(user_id, session)

        except Exception as e:
            logger.error("Login failed for user %d: %s", user_id, e)
            session.state = LoginState.FAILED
            session.error_message = f"Ошибка входа: {str(e)[:200]}"
            try:
                if session.page and not session.page.is_closed():
                    session.screenshot_base64 = await self._take_screenshot(session.page)
            except Exception:
                pass
            return self._session_status(user_id)

    async def _check_captcha(self, session: LoginSession) -> dict[str, Any] | None:
        """Check if CAPTCHA is present on the current page."""
        captcha_img = await self._find_login_element(session.page, "captcha_image", timeout=2000)
        captcha_input = await self._find_login_element(session.page, "captcha_input", timeout=2000)

        if captcha_img or captcha_input:
            logger.info("CAPTCHA detected for user %d", session.user_id)
            session.state = LoginState.CAPTCHA_REQUIRED
            session.screenshot_base64 = await self._take_screenshot(session.page)
            return self._session_status(session.user_id)

        return None

    async def _check_login_result(self, user_id: int, session: LoginSession) -> dict[str, Any]:
        """Check if login succeeded, CAPTCHA appeared, or 2FA is needed."""
        # Check for login errors first
        error_el = await self._find_login_element(session.page, "login_error", timeout=2000)
        if error_el:
            try:
                error_text = await error_el.inner_text()
                session.state = LoginState.FAILED
                session.error_message = f"HH.ru: {error_text.strip()[:200]}"
            except Exception:
                session.state = LoginState.FAILED
                session.error_message = "Ошибка входа (неверные данные?)"
            session.screenshot_base64 = await self._take_screenshot(session.page)
            return self._session_status(user_id)

        # Check for CAPTCHA
        captcha_result = await self._check_captcha(session)
        if captcha_result:
            return captcha_result

        # Check for 2FA / OTP code
        two_fa_input = await self._find_login_element(session.page, "two_fa_input", timeout=3000)
        if two_fa_input:
            logger.info("2FA required for user %d", user_id)
            session.state = LoginState.TWO_FA_REQUIRED
            session.screenshot_base64 = await self._take_screenshot(session.page)
            return self._session_status(user_id)

        # Check for OTP pincode input (code-by-email login)
        otp_input = await self._find_login_element(session.page, "otp_input", timeout=2000)
        if otp_input:
            logger.info("OTP code required for user %d", user_id)
            session.state = LoginState.TWO_FA_REQUIRED
            session.screenshot_base64 = await self._take_screenshot(session.page)
            return self._session_status(user_id)

        # Check if logged in
        logged_in = await self._find_login_element(session.page, "logged_in_indicator", timeout=5000)
        if logged_in:
            logger.info("Login successful for user %d", user_id)
            session.state = LoginState.SUCCESS
            return self._session_status(user_id)

        # Also check by URL — if redirected away from login page
        current_url = session.page.url
        if "/account/login" not in current_url:
            logger.info("Login successful (redirected to %s) for user %d", current_url, user_id)
            session.state = LoginState.SUCCESS
            return self._session_status(user_id)

        # Unclear state — take screenshot
        session.state = LoginState.FAILED
        session.error_message = "Не удалось определить результат входа"
        session.screenshot_base64 = await self._take_screenshot(session.page)
        return self._session_status(user_id)

    async def solve_captcha(self, user_id: int, captcha_text: str) -> dict[str, Any]:
        """Submit CAPTCHA solution.

        Called after start_login returns captcha_required state.
        """
        session = self._sessions.get(user_id)
        if not session or not session.page:
            return {"state": "failed", "error": "Нет активной сессии входа"}

        if session.state != LoginState.CAPTCHA_REQUIRED:
            return {"state": session.state.value, "error": "CAPTCHA не запрошена"}

        try:
            session.state = LoginState.IN_PROGRESS

            # Fill CAPTCHA input
            captcha_input = await self._find_login_element(session.page, "captcha_input", timeout=3000)
            if not captcha_input:
                session.state = LoginState.FAILED
                session.error_message = "Поле ввода CAPTCHA не найдено"
                return self._session_status(user_id)

            await captcha_input.click()
            await captcha_input.fill(captcha_text)
            await asyncio.sleep(0.5)

            # Submit
            captcha_submit = await self._find_login_element(session.page, "captcha_submit", timeout=3000)
            if captcha_submit:
                await captcha_submit.click()
            else:
                await captcha_input.press("Enter")

            await asyncio.sleep(3.0)

            # Check result again
            return await self._check_login_result(user_id, session)

        except Exception as e:
            logger.error("CAPTCHA solve failed: %s", e)
            session.state = LoginState.FAILED
            session.error_message = f"Ошибка при вводе CAPTCHA: {str(e)[:200]}"
            return self._session_status(user_id)

    async def submit_2fa(self, user_id: int, code: str) -> dict[str, Any]:
        """Submit 2FA/OTP verification code.

        Called after start_login returns two_fa_required state.
        Handles both traditional 2FA codes and HH.ru OTP pincode input.
        """
        session = self._sessions.get(user_id)
        if not session or not session.page:
            return {"state": "failed", "error": "Нет активной сессии входа"}

        if session.state != LoginState.TWO_FA_REQUIRED:
            return {"state": session.state.value, "error": "2FA не запрошена"}

        try:
            session.state = LoginState.IN_PROGRESS

            # Try 2FA code input first, then OTP pincode input
            code_input = await self._find_login_element(session.page, "two_fa_input", timeout=2000)
            if not code_input:
                code_input = await self._find_login_element(session.page, "otp_input", timeout=2000)
            if not code_input:
                session.state = LoginState.FAILED
                session.error_message = "Поле ввода кода не найдено"
                return self._session_status(user_id)

            await code_input.click()
            await code_input.fill(code)
            await asyncio.sleep(0.5)

            # Submit — try dedicated submit button, then form submit, then Enter
            two_fa_submit = await self._find_login_element(session.page, "two_fa_submit", timeout=2000)
            if two_fa_submit:
                await two_fa_submit.click()
            else:
                # For OTP pincode, pressing Enter or waiting for auto-submit
                await code_input.press("Enter")

            await asyncio.sleep(3.0)

            # Check result
            return await self._check_login_result(user_id, session)

        except Exception as e:
            logger.error("2FA submit failed: %s", e)
            session.state = LoginState.FAILED
            session.error_message = f"Ошибка при вводе 2FA: {str(e)[:200]}"
            return self._session_status(user_id)

    async def get_cookies(self, user_id: int) -> list[dict]:
        """Extract cookies from the active login session.

        Should be called after login is successful.
        Returns list of cookie dicts compatible with Playwright's add_cookies().
        """
        session = self._sessions.get(user_id)
        if not session or not session.context:
            return []

        try:
            cookies = await session.context.cookies()
            return cookies
        except Exception as e:
            logger.error("Failed to extract cookies: %s", e)
            return []

    async def save_cookies_to_db(self, user_id: int, session_db) -> None:
        """Save cookies from active login session to database.

        Args:
            user_id: User ID
            session_db: SQLAlchemy async session
        """
        from src.db.models import User

        cookies = await self.get_cookies(user_id)
        if not cookies:
            logger.warning("No cookies to save for user %d", user_id)
            return

        cookies_json = json.dumps(cookies, ensure_ascii=False)

        # Update user record
        from sqlalchemy import select
        result = await session_db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.hh_cookies = cookies_json
            user.is_authorized = True
            await session_db.flush()
            logger.info("Saved %d cookies for user %d", len(cookies), user_id)

    async def verify_session(self, user_id: int, cookies_json: str) -> dict[str, Any]:
        """Verify that saved cookies still produce a valid HH.ru session.

        Launches a new browser context, loads saved cookies,
        navigates to applicant/resumes, and checks if we're logged in.
        """
        if not cookies_json:
            return {"valid": False, "error": "Нет сохранённых cookies"}

        try:
            cookies = json.loads(cookies_json)
        except json.JSONDecodeError:
            return {"valid": False, "error": "Cookies повреждены"}

        playwright = None
        browser = None
        context = None

        try:
            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                locale="ru-RU",
            )

            # Load saved cookies
            await context.add_cookies(cookies)

            page = await context.new_page()
            await page.goto(
                "https://hh.ru/applicant/resumes",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            await asyncio.sleep(3.0)

            # Check if we're logged in by looking for indicator elements
            current_url = page.url
            if "/account/login" in current_url:
                return {"valid": False, "error": "Сессия истекла, перенаправлено на вход"}

            # Try to find logged-in indicator
            for selector in self.LOGIN_SELECTORS["logged_in_indicator"]:
                try:
                    el = page.locator(selector).first
                    if await el.is_visible(timeout=3000):
                        return {"valid": True}
                except Exception:
                    continue

            # If we're on applicant/resumes but no indicator found, still might be logged in
            if "/applicant" in current_url or "/resume" in current_url:
                return {"valid": True}

            return {"valid": False, "error": "Не удалось подтвердить сессию"}

        except Exception as e:
            logger.error("Session verification failed: %s", e)
            return {"valid": False, "error": f"Ошибка проверки: {str(e)[:200]}"}
        finally:
            try:
                if context:
                    await context.close()
                if browser:
                    await browser.close()
                if playwright:
                    await playwright.stop()
            except Exception:
                pass

    async def cleanup_session(self, user_id: int) -> None:
        """Clean up login session resources."""
        session = self._sessions.pop(user_id, None)
        if session:
            await session.cleanup()

    def get_session_status(self, user_id: int) -> dict[str, Any]:
        """Get current login session status without any browser interaction."""
        session = self._sessions.get(user_id)
        if not session:
            return {"state": "idle"}
        return self._session_status(user_id)

    def _session_status(self, user_id: int) -> dict[str, Any]:
        """Build status dict from session."""
        session = self._sessions[user_id]
        result = {
            "state": session.state.value,
        }
        if session.error_message:
            result["error"] = session.error_message
        if session.screenshot_base64:
            result["screenshot"] = session.screenshot_base64
        return result

    async def _take_screenshot(self, page: Page) -> str:
        """Take a screenshot and return as base64 string."""
        try:
            screenshot_bytes = await page.screenshot(full_page=False, type="jpeg", quality=60)
            return base64.b64encode(screenshot_bytes).decode("utf-8")
        except Exception as e:
            logger.error("Screenshot failed: %s", e)
            return ""
