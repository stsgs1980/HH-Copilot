"""HH.ru authentication router — Playwright-based login flow.

Since HH.ru discontinued the Applicant API (Dec 2025), we use browser
automation (Playwright) for authentication. The flow:

1. User enters email + password in the dashboard
2. Backend launches headless Chromium → navigates to HH.ru login
3. If CAPTCHA → screenshot sent to frontend → user solves it
4. If 2FA → frontend asks for SMS/email code
5. After success → cookies saved to DB for session reuse
6. All subsequent HH.ru operations use saved cookies

Endpoints:
- POST /api/auth/login       — Start Playwright login with email+password
- GET  /api/auth/login-status — Check current login progress
- POST /api/auth/solve-captcha — Submit CAPTCHA text
- POST /api/auth/verify-2fa   — Submit 2FA code
- GET  /api/auth/status       — Check if authorized (cookies valid)
- POST /api/auth/disconnect   — Remove saved cookies (disconnect)
- POST /api/auth/verify-session — Re-check if saved cookies still work
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_session
from src.db.models import User, ActivityLog
from src.db.repositories import UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# Default user for dashboard (single-user mode)
DASHBOARD_TELEGRAM_ID = 0


async def _get_user(session: AsyncSession) -> User:
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(DASHBOARD_TELEGRAM_ID)
    if not user:
        user = await user_repo.create(telegram_id=DASHBOARD_TELEGRAM_ID)
    return user


# === Request models ===

class LoginRequest(BaseModel):
    email: str
    password: str


class CaptchaRequest(BaseModel):
    captcha_text: str


class TwoFARequest(BaseModel):
    code: str


# === Endpoints ===

@router.post("/login", response_model=dict)
async def start_login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    """Start Playwright-based HH.ru login with email and password.

    Returns login state which may be:
    - success: Login completed, cookies saved
    - captcha_required: CAPTCHA detected, screenshot included
    - two_fa_required: 2FA code needed
    - failed: Login failed with error message
    """
    user = await _get_user(session)

    # Save email to user record
    user.hh_email = data.email
    await session.flush()

    try:
        from src.hh.browser_auth import HHBrowserAuth

        auth = HHBrowserAuth()
        result = await auth.start_login(user.id, data.email, data.password)

        # If login succeeded, save cookies to DB
        if result.get("state") == "success":
            await auth.save_cookies_to_db(user.id, session)

            # Log activity
            activity = ActivityLog(
                user_id=user.id,
                action="auth",
                details="Авторизация HH.ru через Playwright выполнена успешно",
            )
            session.add(activity)
            await session.flush()

            # Clean up browser session
            await auth.cleanup_session(user.id)

        return result

    except Exception as e:
        logger.error("Login failed: %s", e)

        activity = ActivityLog(
            user_id=user.id,
            action="auth_failed",
            details=f"Ошибка авторизации HH.ru: {str(e)[:200]}",
        )
        session.add(activity)
        await session.flush()

        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/login-status", response_model=dict)
async def get_login_status(session: AsyncSession = Depends(get_session)):
    """Check current login session status.

    Returns the state of the in-progress login flow:
    idle, in_progress, captcha_required, two_fa_required, success, failed
    """
    user = await _get_user(session)

    from src.hh.browser_auth import HHBrowserAuth

    auth = HHBrowserAuth()
    return auth.get_session_status(user.id)


@router.post("/solve-captcha", response_model=dict)
async def solve_captcha(
    data: CaptchaRequest,
    session: AsyncSession = Depends(get_session),
):
    """Submit CAPTCHA solution for the current login session.

    Called after /login returns state=captcha_required.
    May return success, captcha_required (wrong text), two_fa_required, or failed.
    """
    user = await _get_user(session)

    try:
        from src.hh.browser_auth import HHBrowserAuth

        auth = HHBrowserAuth()
        result = await auth.solve_captcha(user.id, data.captcha_text)

        # If login succeeded after CAPTCHA, save cookies
        if result.get("state") == "success":
            await auth.save_cookies_to_db(user.id, session)

            activity = ActivityLog(
                user_id=user.id,
                action="auth",
                details="Авторизация HH.ru выполнена (CAPTCHA пройдена)",
            )
            session.add(activity)
            await session.flush()

            await auth.cleanup_session(user.id)

        return result

    except Exception as e:
        logger.error("CAPTCHA solve failed: %s", e)
        raise HTTPException(status_code=500, detail=f"CAPTCHA solve failed: {str(e)}")


@router.post("/verify-2fa", response_model=dict)
async def verify_2fa(
    data: TwoFARequest,
    session: AsyncSession = Depends(get_session),
):
    """Submit 2FA verification code for the current login session.

    Called after /login returns state=two_fa_required.
    """
    user = await _get_user(session)

    try:
        from src.hh.browser_auth import HHBrowserAuth

        auth = HHBrowserAuth()
        result = await auth.submit_2fa(user.id, data.code)

        # If login succeeded after 2FA, save cookies
        if result.get("state") == "success":
            await auth.save_cookies_to_db(user.id, session)

            activity = ActivityLog(
                user_id=user.id,
                action="auth",
                details="Авторизация HH.ru выполнена (2FA пройдена)",
            )
            session.add(activity)
            await session.flush()

            await auth.cleanup_session(user.id)

        return result

    except Exception as e:
        logger.error("2FA verify failed: %s", e)
        raise HTTPException(status_code=500, detail=f"2FA verify failed: {str(e)}")


@router.get("/status", response_model=dict)
async def get_auth_status(session: AsyncSession = Depends(get_session)):
    """Check current HH.ru authorization status.

    Returns whether the user has valid cookies saved.
    """
    user = await _get_user(session)

    has_cookies = bool(user.hh_cookies)
    return {
        "connected": user.is_authorized and has_cookies,
        "email": user.hh_email,
        "tokenExpiry": user.hh_token_expires_at.isoformat() if user.hh_token_expires_at else None,
        "authMethod": "playwright_cookies",
    }


@router.post("/verify-session", response_model=dict)
async def verify_session(session: AsyncSession = Depends(get_session)):
    """Verify that saved cookies still produce a valid HH.ru session.

    Launches a browser, loads cookies, and checks if we're still logged in.
    """
    user = await _get_user(session)

    if not user.hh_cookies:
        return {"valid": False, "error": "Нет сохранённых cookies"}

    try:
        from src.hh.browser_auth import HHBrowserAuth

        auth = HHBrowserAuth()
        result = await auth.verify_session(user.id, user.hh_cookies)

        # Update authorization status based on result
        if result.get("valid"):
            user.is_authorized = True
        else:
            user.is_authorized = False
        await session.flush()

        return result

    except Exception as e:
        logger.error("Session verification failed: %s", e)
        return {"valid": False, "error": str(e)}


@router.post("/disconnect", response_model=dict)
async def disconnect_hh(session: AsyncSession = Depends(get_session)):
    """Remove HH.ru cookies and disconnect account."""
    user = await _get_user(session)

    # Also clean up any active browser session
    try:
        from src.hh.browser_auth import HHBrowserAuth
        auth = HHBrowserAuth()
        await auth.cleanup_session(user.id)
    except Exception:
        pass

    user.hh_access_token = None
    user.hh_refresh_token = None
    user.hh_token_expires_at = None
    user.hh_cookies = None
    user.is_authorized = False
    await session.flush()

    activity = ActivityLog(
        user_id=user.id,
        action="auth",
        details="Отключение от HH.ru, cookies удалены",
    )
    session.add(activity)
    await session.flush()

    return {"success": True, "connected": False}
