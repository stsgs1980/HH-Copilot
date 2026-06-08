# Deprecated OAuth Code Archive

This directory contains deprecated OAuth-based authentication code that is no longer maintained or supported.

## Deprecated Files

1. `auth.py` - Original OAuth authentication module (321 lines)
2. `api_client.py` - API client with OAuth support (323 lines)

## Why Deprecated

HH.ru discontinued the Applicant API on December 15, 2025. All authentication must now use Playwright browser automation.

## Migration Path

See `OAUTH_TO_PLAYWRIGHT_MIGRATION.md` in project root for migration instructions.

## Archive Date

2026-06-08

## Do Not Use

These files are kept for historical reference only. Do not use them in new code.

## New Implementation

- Playwright auth: `src/hh/browser_auth.py`
- Browser client: `src/hh/browser_client.py`
- Hybrid client: `src/hh/hybrid_client.py`

---

Built with: Python 3.12 + Playwright