"""
DEPRECATED: OAuth authentication module - DO NOT USE

This module is deprecated and kept for historical reference only.
HH.ru discontinued the Applicant API on December 15, 2025.

Use Playwright-based authentication instead:
- src/hh/browser_auth.py - Playwright authentication
- src/bot/handlers/auth_new.py - Updated bot handlers

Migration guide: OAUTH_TO_PLAYWRIGHT_MIGRATION.md

Archive date: 2026-06-08
"""

# Original OAuth implementation preserved below
# DO NOT USE IN PRODUCTION

import base64
import hashlib
import logging
import secrets
import time
from urllib.parse import urlencode

from src.config import get_settings

logger = logging.getLogger(__name__)


class HHAuth:
    """HH.ru OAuth2 authorization code flow with PKCE - DEPRECATED."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._code_verifiers: dict[int, str] = {}  # telegram_id -> code_verifier

    def get_auth_url(self, telegram_id: int) -> tuple[str, str]:
        """Generate HH.ru OAuth authorization URL with PKCE - DEPRECATED."""
        state = secrets.token_urlsafe(32)
        code_verifier = secrets.token_urlsafe(48)
        self._code_verifiers[telegram_id] = code_verifier

        # PKCE: code_challenge = BASE64URL(SHA256(code_verifier))
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).rstrip(b"=").decode()

        params = {
            "response_type": "code",
            "client_id": self.settings.hh_client_id,
            "redirect_uri": self.settings.hh_redirect_uri,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        auth_url = f"{self.settings.hh_auth_url}?{urlencode(params)}"
        return auth_url, state

    def get_code_verifier(self, telegram_id: int) -> str | None:
        """Retrieve stored PKCE code_verifier for a user - DEPRECATED."""
        return self._code_verifiers.pop(telegram_id, None)

    def get_token_request_data(self, code: str, telegram_id: int) -> dict:
        """Prepare token exchange request data - DEPRECATED."""
        code_verifier = self.get_code_verifier(telegram_id)
        data = {
            "grant_type": "authorization_code",
            "client_id": self.settings.hh_client_id,
            "client_secret": self.settings.hh_client_secret,
            "code": code,
            "redirect_uri": self.settings.hh_redirect_uri,
        }
        if code_verifier:
            data["code_verifier"] = code_verifier
        return data

    def get_refresh_token_data(self, refresh_token: str) -> dict:
        """Prepare refresh token request data - DEPRECATED."""
        return {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.settings.hh_client_id,
            "client_secret": self.settings.hh_client_secret,
        }

    @staticmethod
    def is_token_expired(expires_at: float) -> bool:
        """Check if token is expired (with 60s buffer) - DEPRECATED."""
        return time.time() >= (expires_at - 60)