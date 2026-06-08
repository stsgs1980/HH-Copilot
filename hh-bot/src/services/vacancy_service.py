"""Vacancy service — search, filtering, and management."""

import json
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Vacancy
from src.db.repositories import VacancyRepository
from src.hh.models import HHVacancy

logger = logging.getLogger(__name__)


class VacancyService:
    """Service for managing vacancy search and storage."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.vacancy_repo = VacancyRepository(session)

    async def save_vacancies(
        self, user_id: int, vacancies: list[HHVacancy]
    ) -> list[Vacancy]:
        """Save search results to database, skipping duplicates."""
        saved = []
        for vac in vacancies:
            try:
                db_vacancy = await self.vacancy_repo.upsert(
                    user_id=user_id,
                    hh_vacancy_id=vac.id,
                    title=vac.title,
                    company=vac.company,
                    salary_from=vac.salary_from,
                    salary_to=vac.salary_to,
                    salary_currency=vac.salary_currency,
                    location=vac.location,
                    experience=vac.experience,
                    employment=vac.employment,
                    schedule=vac.schedule,
                    skills=json.dumps(vac.skills, ensure_ascii=False),
                    description=vac.description[:5000] if vac.description else None,
                    url=vac.url,
                    match_score=vac.match_score,
                    status=vac.status,
                    raw_data=json.dumps(vac.raw_data, ensure_ascii=False) if vac.raw_data else None,
                )
                saved.append(db_vacancy)
            except Exception as e:
                logger.warning("Failed to save vacancy %s: %s", vac.id, e)
        await self.session.flush()
        return saved

    async def get_vacancies_by_status(
        self, user_id: int, status: str, limit: int = 50
    ) -> list[Vacancy]:
        """Get vacancies filtered by status."""
        return await self.vacancy_repo.get_by_user(user_id, status=status, limit=limit)

    async def get_suitable_vacancies(
        self, user_id: int, min_score: float = 70.0
    ) -> list[Vacancy]:
        """Get vacancies that match the minimum score threshold."""
        vacancies = await self.vacancy_repo.get_by_user(user_id, status="new", limit=100)
        return [v for v in vacancies if v.match_score >= min_score]

    async def mark_as_applied(self, vacancy_id: int, cover_letter: str = "") -> None:
        """Mark a vacancy as applied."""
        await self.vacancy_repo.update_status(
            vacancy_id, "applied", cover_letter=cover_letter
        )

    async def mark_as_failed(self, vacancy_id: int) -> None:
        """Mark a vacancy as failed."""
        await self.vacancy_repo.update_status(vacancy_id, "failed")

    async def mark_as_skipped(self, vacancy_id: int) -> None:
        """Mark a vacancy as skipped."""
        await self.vacancy_repo.update_status(vacancy_id, "skipped")

    @staticmethod
    def build_search_params(
        area: int = 1,
        text: str = "",
        specialization: str | None = None,
        experience: str | None = None,
        employment: str | None = None,
        schedule: str | None = None,
        salary_from: int | None = None,
        salary_to: int | None = None,
        career_direction: str = "",
        page: int = 0,
        per_page: int = 50,
    ) -> dict:
        """Build HH.ru search API parameters."""
        search_text = f"{career_direction} {text}".strip() if career_direction else text
        params: dict = {
            "text": search_text,
            "area": area,
            "page": page,
            "per_page": per_page,
            "order_by": "relevance",
        }
        if specialization:
            params["specialization"] = specialization
        if experience:
            params["experience"] = experience
        if employment:
            params["employment_type"] = employment
        if schedule:
            params["schedule"] = schedule
        if salary_from:
            params["salary"] = salary_from
            params["currency_code"] = "RUR"
        return params
