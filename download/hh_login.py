#!/usr/bin/env python3
"""
HH.ru Login Script for Next.js Integration
Called by hh-session.ts to authenticate via Playwright
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add hh-bot src to path
hh_bot_src = Path(__file__).parent.parent / "hh-bot" / "src"
sys.path.insert(0, str(hh_bot_src))
sys.path.insert(0, str(Path(__file__).parent.parent / "hh-bot"))

from src.hh.browser_auth import HHBrowserAuth, LoginState

STATUS_FILE = Path(__file__).parent / "hh_login_status.json"
INPUT_FILE = Path(__file__).parent / "hh_login_input.json"
COOKIES_FILE = Path(__file__).parent / "cookies_backup.json"


def write_status(state: str, error: str = None, screenshot: str = None):
    """Write status to file for Next.js to read."""
    status = {"state": state}
    if error:
        status["error"] = error
    if screenshot:
        status["screenshot"] = screenshot
    STATUS_FILE.write_text(json.dumps(status, ensure_ascii=False, indent=2))


def write_cookies(cookies: list):
    """Write cookies to file for Next.js to read."""
    COOKIES_FILE.write_text(json.dumps(cookies, ensure_ascii=False, indent=2))


async def main():
    # Create auth instance
    auth = HHBrowserAuth()

    # Parse arguments
    args = sys.argv[1:]
    email = None
    password = None

    i = 0
    while i < len(args):
        if args[i] == "--email" and i + 1 < len(args):
            email = args[i + 1]
            i += 2
        elif args[i] == "--password" and i + 1 < len(args):
            password = args[i + 1]
            i += 2
        else:
            i += 1

    if not email or not password:
        write_status("failed", "Требуется --email и --password")
        return

    # Use user_id = 0 for standalone login
    user_id = 0

    # Check for pending input (captcha/2fa)
    if INPUT_FILE.exists():
        try:
            inp = json.loads(INPUT_FILE.read_text())
            action = inp.get("action")
            value = inp.get("value")

            if action == "solve_captcha":
                result = await auth.solve_captcha(user_id, value)
            elif action == "verify_2fa":
                result = await auth.submit_2fa(user_id, value)
            else:
                result = await auth.get_session_status(user_id)

            write_status(
                result.get("state", "idle"),
                result.get("error"),
                result.get("screenshot")
            )

            if result.get("state") == "success":
                cookies = await auth.get_cookies(user_id)
                write_cookies(cookies)

            # Remove input file after processing
            INPUT_FILE.unlink(missing_ok=True)
            return
        except Exception as e:
            write_status("failed", f"Ошибка обработки ввода: {e}")
            return

    # Start new login
    result = await auth.start_login(user_id, email, password)

    write_status(
        result.get("state", "idle"),
        result.get("error"),
        result.get("screenshot")
    )

    # If success, save cookies
    if result.get("state") == "success":
        cookies = await auth.get_cookies(user_id)
        write_cookies(cookies)

    # Cleanup
    await auth.cleanup_session(user_id)


if __name__ == "__main__":
    asyncio.run(main())
