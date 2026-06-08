"""HH.ru API client — resilient HTTP client for api.hh.ru.

Skill reference: api-retry (exponential backoff + circuit breaker)
Skill reference: health-check (API availability monitoring)
"""

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
    """Async client for HH.ru REST API (api.hh.ru).

    Provides methods for:
    - OAuth token exchange and refresh
    - Vacancy search and details
    - Resume listing and details
    - Negotiations (applications and messages)
    - Reference dictionaries
    """

    def __init__(self, access_token: str | None = None, refresh_token: str | None = None):
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
        """Exchange OAuth authorization code for access token."""
        data = self.auth.get_token_request_data(code, telegram_id)
        response = await self.client.post(
            "/oauth/token",
            content=f"grant_type={data['grant_type']}&client_id={data['client_id']}"
            f"&client_secret={data['client_secret']}&code={data['code']}"
            f"&redirect_uri={data['redirect_uri']}",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_data = response.json()
        self._access_token = token_data.get("access_token")
        self._refresh_token = token_data.get("refresh_token")
        self._token_expires_at = token_data.get("created_at", 0) + token_data.get("expires_in", 0)
        self.client.client.headers["Authorization"] = f"Bearer {self._access_token}"
        return token_data

    async def refresh_access_token(self) -> dict:
        """Refresh the access token using refresh token."""
        if not self._refresh_token:
            raise ValueError("No refresh token available")
        data = self.auth.get_refresh_token_data(self._refresh_token)
        response = await self.client.post(
            "/oauth/token",
            content=f"grant_type={data['grant_type']}&refresh_token={data['refresh_token']}"
            f"&client_id={data['client_id']}&client_secret={data['client_secret']}",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_data = response.json()
        self._access_token = token_data.get("access_token")
        self._refresh_token = token_data.get("refresh_token")
        self._token_expires_at = token_data.get("created_at", 0) + token_data.get("expires_in", 0)
        self.client.client.headers["Authorization"] = f"Bearer {self._access_token}"
        return token_data

    async def _ensure_token(self) -> None:
        """Refresh token if expired."""
        if self._access_token and self.auth.is_token_expired(self._token_expires_at):
            try:
                await self.refresh_access_token()
            except Exception as e:
                logger.error("Token refresh failed: %s", e)

    # === Vacancies ===

    async def search_vacancies(self, params: dict[str, Any]) -> list[HHVacancy]:
        """Search vacancies on HH.ru.

        Common params: text, area, specialization, experience, employment_type,
        schedule, salary, currency, page, per_page.
        """
        await self._ensure_token()
        response = await self.client.get("/vacancies", params=params)
        data = response.json()
        vacancies = []
        for item in data.get("items", []):
            salary = item.get("salary") or {}
            vacancy = HHVacancy(
                id=str(item.get("id", "")),
                title=item.get("name", ""),
                company=item.get("employer", {}).get("name", ""),
                salary_from=salary.get("from"),
                salary_to=salary.get("to"),
                salary_currency=salary.get("currency", "RUR"),
                location=item.get("area", {}).get("name", ""),
                experience=item.get("experience", {}).get("name", ""),
                employment=item.get("employment", {}).get("name", ""),
                schedule=item.get("schedule", {}).get("name", ""),
                skills=[s.get("name", "") for s in item.get("key_skills", [])],
                description="",  # Not in search results
                url=item.get("alternate_url", ""),
                raw_data=item,
            )
            vacancies.append(vacancy)
        return vacancies

    async def get_vacancy(self, vacancy_id: str) -> HHVacancy:
        """Get full vacancy details by ID."""
        await self._ensure_token()
        response = await self.client.get(f"/vacancies/{vacancy_id}")
        item = response.json()
        salary = item.get("salary") or {}
        return HHVacancy(
            id=str(item.get("id", "")),
            title=item.get("name", ""),
            company=item.get("employer", {}).get("name", ""),
            salary_from=salary.get("from"),
            salary_to=salary.get("to"),
            salary_currency=salary.get("currency", "RUR"),
            location=item.get("area", {}).get("name", ""),
            experience=item.get("experience", {}).get("name", ""),
            employment=item.get("employment", {}).get("name", ""),
            schedule=item.get("schedule", {}).get("name", ""),
            skills=[s.get("name", "") for s in item.get("key_skills", [])],
            description=item.get("description", ""),
            url=item.get("alternate_url", ""),
            raw_data=item,
        )

    # === Resumes ===

    async def get_resumes(self) -> list[HHResume]:
        """Get list of user's resumes (published)."""
        await self._ensure_token()
        response = await self.client.get("/resumes/mine")
        data = response.json()
        resumes = []
        for item in data.get("items", []):
            salary = item.get("salary") or {}
            resume = HHResume(
                id=item.get("id", ""),
                title=item.get("title", ""),
                position=item.get("title", ""),
                salary_from=salary.get("amount"),
                salary_to=None,
                salary_currency=salary.get("currency", "RUR"),
                skills=[s.get("name", "") for s in item.get("skill_set", [])],
                about=item.get("about", ""),
                city=item.get("area", {}).get("name", ""),
                raw_data=item,
            )
            resumes.append(resume)
        return resumes

    async def get_resume(self, resume_id: str) -> HHResume:
        """Get full resume details by ID."""
        await self._ensure_token()
        response = await self.client.get(f"/resumes/{resume_id}")
        item = response.json()
        salary = item.get("salary") or {}
        experience_list = []
        for exp in item.get("experience", []):
            experience_list.append({
                "company": exp.get("company", ""),
                "position": exp.get("position", ""),
                "description": exp.get("description", ""),
                "start_date": exp.get("start", ""),
                "end_date": exp.get("end", ""),
            })
        education_list = []
        for edu in item.get("education", {}).get("primary", []):
            education_list.append({
                "name": edu.get("name", ""),
                "organization": edu.get("organization", ""),
                "year": edu.get("year", ""),
            })
        return HHResume(
            id=item.get("id", ""),
            title=item.get("title", ""),
            position=item.get("title", ""),
            salary_from=salary.get("amount"),
            salary_to=None,
            salary_currency=salary.get("currency", "RUR"),
            skills=[s.get("name", "") for s in item.get("skill_set", [])],
            experience=experience_list,
            education=education_list,
            about=item.get("about", ""),
            city=item.get("area", {}).get("name", ""),
            name=item.get("first_name", "") + " " + item.get("last_name", ""),
            raw_data=item,
        )

    # === Negotiations ===

    async def apply_to_vacancy(
        self, vacancy_id: str, resume_id: str, message: str = ""
    ) -> dict:
        """Apply to a vacancy with a cover letter.

        Note: May return 403 Forbidden if API access is restricted for applicants.
        """
        await self._ensure_token()
        response = await self.client.post(
            f"/negotiations",
            params={"vacancy_id": vacancy_id, "resume_id": resume_id},
            json={"message": message},
        )
        return response.json()

    async def get_negotiations(
        self, state: str = "response", page: int = 0, per_page: int = 20
    ) -> list[HHNegotiation]:
        """Get list of negotiations (applications)."""
        await self._ensure_token()
        response = await self.client.get(
            "/negotiations",
            params={"state": state, "page": page, "per_page": per_page},
        )
        data = response.json()
        negotiations = []
        for item in data.get("items", []):
            neg = HHNegotiation(
                id=str(item.get("id", "")),
                vacancy_id=str(item.get("vacancy_id", "")),
                vacancy_title=item.get("vacancy", {}).get("name", ""),
                employer_name=item.get("employer", {}).get("name", ""),
                state=item.get("state", {}).get("name", "response"),
                has_unread=item.get("has_unread_messages", False),
                url=item.get("url", ""),
            )
            negotiations.append(neg)
        return negotiations

    async def get_negotiation_messages(self, negotiation_id: str) -> list[dict]:
        """Get messages in a negotiation thread."""
        await self._ensure_token()
        response = await self.client.get(f"/negotiations/{negotiation_id}/messages")
        return response.json().get("items", [])

    async def send_message(self, negotiation_id: str, message: str) -> dict:
        """Send a message in a negotiation thread.

        Note: May return 403 if API access is restricted.
        """
        await self._ensure_token()
        response = await self.client.post(
            f"/negotiations/{negotiation_id}/messages",
            json={"message": message},
        )
        return response.json()

    # === Dictionaries ===

    async def get_dictionaries(self) -> HHDictionaries:
        """Get HH.ru reference dictionaries."""
        response = await self.client.get("/dictionaries")
        data = response.json()
        return HHDictionaries(
            experience=data.get("experience", []),
            employment=data.get("employment", []),
            schedule=data.get("schedule", []),
            currency=data.get("currency", []),
            vacancy_type=data.get("vacancy_type", []),
        )

    async def get_areas(self) -> list[dict]:
        """Get HH.ru areas (cities/regions)."""
        response = await self.client.get("/areas")
        return response.json()

    async def get_specializations(self) -> list[dict]:
        """Get HH.ru professional specializations."""
        response = await self.client.get("/specializations")
        return response.json()

    # === Similar vacancies ===

    async def get_similar_vacancies(self, vacancy_id: str) -> list[HHVacancy]:
        """Get similar vacancies for a given vacancy."""
        await self._ensure_token()
        response = await self.client.get(f"/vacancies/{vacancy_id}/similar_vacancies")
        data = response.json()
        vacancies = []
        for item in data.get("items", []):
            salary = item.get("salary") or {}
            vacancy = HHVacancy(
                id=str(item.get("id", "")),
                title=item.get("name", ""),
                company=item.get("employer", {}).get("name", ""),
                salary_from=salary.get("from"),
                salary_to=salary.get("to"),
                salary_currency=salary.get("currency", "RUR"),
                url=item.get("alternate_url", ""),
                raw_data=item,
            )
            vacancies.append(vacancy)
        return vacancies

    async def close(self) -> None:
        await self.client.close()
