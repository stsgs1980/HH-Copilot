"""Vacancy API router — search, filter, apply, skip, blacklist.

Search and apply operations use Playwright browser automation
since the HH.ru Applicant API was discontinued in Dec 2025.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import (
    VacancyResponse,
    MatchBreakdown,
    ApplyRequest,
    VacancySearchRequest,
    SuccessResponse,
)
from src.db.database import get_session
from src.db.models import Vacancy, User, Resume, ActivityLog
from src.db.repositories import VacancyRepository, UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vacancies", tags=["vacancies"])

DEFAULT_USER_ID = 1


def _format_salary(salary_from: int | None, salary_to: int | None, currency: str = "RUR") -> str:
    currency_symbol = {"RUR": "\u20bd", "USD": "$", "EUR": "\u20ac"}.get(currency, currency)
    if salary_from and salary_to:
        return f"{salary_from:,} - {salary_to:,} {currency_symbol}".replace(",", " ")
    elif salary_from:
        return f"от {salary_from:,} {currency_symbol}".replace(",", " ")
    elif salary_to:
        return f"до {salary_to:,} {currency_symbol}".replace(",", " ")
    return ""


def _vacancy_to_response(v: Vacancy) -> VacancyResponse:
    skills = json.loads(v.skills) if v.skills else []
    # Compute a basic match breakdown from available data
    score = v.match_score or 0
    breakdown = MatchBreakdown(
        skills=min(100, int(score * 1.05)),
        experience=min(100, int(score * 0.95)),
        salary=min(100, int(score * 0.9)),
        location=min(100, int(score * 0.85)),
    )
    return VacancyResponse(
        id=str(v.hh_vacancy_id),
        title=v.title,
        company=v.company or "",
        salary=_format_salary(v.salary_from, v.salary_to, v.salary_currency),
        matchScore=int(score),
        location=v.location or "",
        experience=v.experience or "",
        description=v.description or "",
        skills=skills,
        status=v.status or "new",
        publishedAt=v.created_at.isoformat() if v.created_at else "",
        url=v.url,
        matchBreakdown=breakdown,
    )


async def _get_user(session: AsyncSession) -> User:
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)
    if not user:
        user = await user_repo.create(telegram_id=0)
    return user


def _create_hh_client(user: User):
    """Create a HybridHHClient with user's saved cookies."""
    from src.hh.hybrid_client import HybridHHClient
    return HybridHHClient(
        user_id=user.id,
        cookies_json=user.hh_cookies,
    )


@router.get("", response_model=dict)
async def get_vacancies(
    status: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Get all vacancies for the dashboard user, optionally filtered by status."""
    user = await _get_user(session)
    vacancy_repo = VacancyRepository(session)

    if status:
        vacancies = await vacancy_repo.get_by_user(user.id, status=status)
    else:
        vacancies = await vacancy_repo.get_by_user(user.id)

    # Get default resume title
    resume_result = await session.execute(
        select(Resume).where(and_(Resume.user_id == user.id, Resume.is_active.is_(True)))
    )
    default_resume = resume_result.scalar_one_or_none()
    resume_title = default_resume.title if default_resume else None

    return {
        "vacancies": [_vacancy_to_response(v) for v in vacancies],
        "resumeTitle": resume_title,
    }


@router.post("/search", response_model=dict)
async def search_vacancies(
    data: VacancySearchRequest = VacancySearchRequest(),
    session: AsyncSession = Depends(get_session),
):
    """Search HH.ru vacancies via Playwright and save results to DB.

    This is the PRIMARY search endpoint — it opens a headless browser,
    navigates to HH.ru search, scrapes vacancy cards, and saves them.

    Requires the user to be authenticated (have cookies saved).
    """
    user = await _get_user(session)

    if not user.hh_cookies:
        raise HTTPException(
            status_code=401,
            detail="Не авторизован на HH.ru. Сначала выполните вход через настройки."
        )

    try:
        from src.services.vacancy_service import VacancyService

        # Build search params
        career_direction = user.career_direction or ""
        search_params = VacancyService.build_search_params(
            area=data.area,
            text=data.text,
            specialization=data.specialization,
            experience=data.experience,
            employment=data.employment,
            schedule=data.schedule,
            salary_from=data.salary_from,
            salary_to=data.salary_to,
            career_direction=career_direction,
            page=data.page,
            per_page=data.per_page,
        )

        # Search via Playwright
        hh_client = _create_hh_client(user)
        try:
            hh_vacancies = await hh_client.search_vacancies(search_params)
        finally:
            await hh_client.close()

        if not hh_vacancies:
            return {
                "vacancies": [],
                "totalFound": 0,
                "message": "Вакансии не найдены. Попробуйте изменить параметры поиска.",
            }

        # Compute match scores
        from src.matching.engine import MatchingEngine
        matching_engine = MatchingEngine()

        # Get user's default resume for matching
        resume_result = await session.execute(
            select(Resume).where(and_(Resume.user_id == user.id, Resume.is_active.is_(True)))
        )
        default_resume = resume_result.scalar_one_or_none()

        resume_skills = []
        resume_title = ""
        resume_experience = []
        if default_resume:
            resume_skills = json.loads(default_resume.skills) if default_resume.skills else []
            resume_title = default_resume.title or default_resume.position or ""
            resume_experience = json.loads(default_resume.experience) if default_resume.experience else []

        # Score each vacancy
        for vac in hh_vacancies:
            if default_resume:
                vac.match_score = matching_engine.compute_score(
                    resume_skills=resume_skills,
                    resume_title=resume_title,
                    resume_experience=resume_experience,
                    vacancy_skills=vac.skills,
                    vacancy_title=vac.title,
                    vacancy_description=vac.description,
                )
            else:
                vac.match_score = 50.0  # Default score without resume

        # Filter by min match score
        min_score = user.min_match_score or 0
        filtered = [v for v in hh_vacancies if v.match_score >= min_score]

        # Save to database
        vacancy_service = VacancyService(session)
        saved = await vacancy_service.save_vacancies(user.id, filtered)

        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action="vacancy_search",
            details=f"Найдено {len(hh_vacancies)} вакансий, {len(filtered)} с мэтчингом >= {min_score}%",
        )
        session.add(activity)
        await session.flush()

        return {
            "vacancies": [_vacancy_to_response(v) for v in saved],
            "totalFound": len(hh_vacancies),
            "matched": len(filtered),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Vacancy search failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Ошибка поиска: {str(e)[:200]}")


@router.post("/{vacancy_id}/apply", response_model=dict)
async def apply_to_vacancy(
    vacancy_id: str,
    data: ApplyRequest = ApplyRequest(),
    session: AsyncSession = Depends(get_session),
):
    """Apply to a vacancy on HH.ru via Playwright browser automation.

    After successful application, updates the vacancy status in the DB.
    Requires the user to be authenticated (have cookies saved).
    """
    user = await _get_user(session)
    vacancy_repo = VacancyRepository(session)

    vacancy = await vacancy_repo.get_by_hh_id(user.id, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    if not user.hh_cookies:
        raise HTTPException(
            status_code=401,
            detail="Не авторизован на HH.ru. Сначала выполните вход."
        )

    try:
        # Get cover letter from request or generate
        cover_letter = data.cover_letter or ""

        # Get resume_id from request or default resume
        resume_id = data.resume_id or ""
        if not resume_id:
            resume_result = await session.execute(
                select(Resume).where(and_(Resume.user_id == user.id, Resume.is_active.is_(True)))
            )
            default_resume = resume_result.scalar_one_or_none()
            if default_resume:
                resume_id = default_resume.hh_resume_id

        # Apply via Playwright
        hh_client = _create_hh_client(user)
        try:
            result = await hh_client.apply_to_vacancy(
                vacancy_id=vacancy_id,
                resume_id=resume_id,
                cover_letter=cover_letter,
                vacancy_url=vacancy.url,
            )
        finally:
            await hh_client.close()

        if result.get("success"):
            await vacancy_repo.update_status(vacancy.id, "applied", cover_letter=cover_letter)
            await vacancy_repo.session.execute(
                update(Vacancy).where(Vacancy.id == vacancy.id).values(applied_at=datetime.utcnow())
            )
            await session.flush()

            # Log activity
            activity = ActivityLog(
                user_id=user.id,
                action="vacancy_applied",
                details=f"Отклик отправлен: {vacancy.title} в {vacancy.company}",
                vacancy_id=vacancy.id,
            )
            session.add(activity)
            await session.flush()

            return {"success": True, "method": result.get("method", "browser")}
        else:
            error = result.get("error", "unknown")
            if error == "already_applied":
                await vacancy_repo.update_status(vacancy.id, "applied")
                return {"success": False, "error": "already_applied", "message": "Вы уже откликались на эту вакансию"}

            await vacancy_repo.update_status(vacancy.id, "failed")
            await session.flush()

            return {"success": False, "error": error}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Apply failed for vacancy %s: %s", vacancy_id, e)
        await vacancy_repo.update_status(vacancy.id, "failed")
        await session.flush()
        raise HTTPException(status_code=502, detail=f"Ошибка отклика: {str(e)[:200]}")


@router.post("/{vacancy_id}/skip", response_model=dict)
async def skip_vacancy(
    vacancy_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Mark a vacancy as skipped."""
    user = await _get_user(session)
    vacancy_repo = VacancyRepository(session)

    vacancy = await vacancy_repo.get_by_hh_id(user.id, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    await vacancy_repo.update_status(vacancy.id, "skipped")
    await session.flush()

    return {"success": True}


@router.post("/{vacancy_id}/blacklist", response_model=dict)
async def blacklist_vacancy(
    vacancy_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Add a vacancy to the blacklist."""
    user = await _get_user(session)
    vacancy_repo = VacancyRepository(session)

    vacancy = await vacancy_repo.get_by_hh_id(user.id, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    await vacancy_repo.update_status(vacancy.id, "blacklisted")
    await session.flush()

    return {"success": True}
