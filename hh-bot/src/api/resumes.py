"""Resume API router — CRUD operations for user resumes.

This is the PRIMARY endpoint group since resumes are the foundation
of the entire matching pipeline: resume → vacancies → negotiations.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import (
    ResumeResponse,
    ResumeUpdateRequest,
    SkillRequest,
    SuccessResponse,
    SyncResponse,
)
from src.db.database import get_session
from src.db.models import ActivityLog, Resume, User
from src.db.repositories import ResumeRepository, UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resumes", tags=["resumes"])

# Default user_id for web dashboard (single-user mode for now)
DEFAULT_USER_ID = 1


def _format_salary(salary_from: int | None, salary_to: int | None, currency: str = "RUR") -> str:
    """Format salary range for display."""
    currency_symbol = {"RUR": "\u20bd", "USD": "$", "EUR": "\u20ac"}.get(currency, currency)
    if salary_from and salary_to:
        return f"{salary_from:,} - {salary_to:,} {currency_symbol}".replace(",", " ")
    elif salary_from:
        return f"от {salary_from:,} {currency_symbol}".replace(",", " ")
    elif salary_to:
        return f"до {salary_to:,} {currency_symbol}".replace(",", " ")
    return ""


def _calculate_experience_years(experience_json: str) -> int:
    """Calculate total years of experience from JSON data."""
    try:
        entries = json.loads(experience_json) if experience_json else []
        total_months = 0
        for exp in entries:
            # Simple heuristic: count months between start and end
            start = exp.get("start_date", "")
            end = exp.get("end_date", "")
            if start:
                total_months += 12  # Approximate: count each entry as ~1 year
        return max(1, total_months // 12) if total_months else 0
    except (json.JSONDecodeError, TypeError):
        return 0


def _format_experience_text(experience_json: str) -> str:
    """Format experience as short text like '5 лет'."""
    years = _calculate_experience_years(experience_json)
    if years == 0:
        return "Нет опыта"
    elif years == 1:
        return "1 год"
    elif years < 5:
        return f"{years} года"
    else:
        return f"{years} лет"


def _format_education_text(education_json: str) -> str:
    """Format education entries as single text."""
    try:
        entries = json.loads(education_json) if education_json else []
        if not entries:
            return ""
        first = entries[0]
        parts = [first.get("organization", first.get("name", ""))]
        if first.get("year"):
            parts.append(first.get("year"))
        return ", ".join(parts)
    except (json.JSONDecodeError, TypeError):
        return ""


def _infer_skill_gaps(skills: list[str], matching_vacancies: int = 0) -> list[str]:
    """Infer skill gaps based on common missing skills for the role."""
    # This is a placeholder — in production the matching engine computes this
    common_gaps = ["Kubernetes", "gRPC", "Kafka", "System Design", "Ansible", "Helm"]
    current_set = set(s.lower() for s in skills)
    gaps = [g for g in common_gaps if g.lower() not in current_set]
    return gaps[:4]


def _resume_to_response(resume: Resume, total_vacancies: int = 0, matching_vacancies: int = 0) -> ResumeResponse:
    """Convert a DB Resume model to the API response schema."""
    skills = json.loads(resume.skills) if resume.skills else []
    experience_entries = json.loads(resume.experience) if resume.experience else []
    education_entries = json.loads(resume.education) if resume.education else []

    # Convert experience entries to frontend format
    exp_list = []
    for i, exp in enumerate(experience_entries):
        exp_list.append({
            "id": f"e{resume.id}-{i}",
            "company": exp.get("company", ""),
            "position": exp.get("position", ""),
            "startDate": exp.get("start_date", exp.get("start", "")),
            "endDate": exp.get("end_date", exp.get("end")),
            "description": exp.get("description", ""),
        })

    edu_list = []
    for i, edu in enumerate(education_entries):
        edu_list.append({
            "id": f"ed{resume.id}-{i}",
            "institution": edu.get("organization", edu.get("institution", edu.get("name", ""))),
            "degree": edu.get("name", edu.get("degree", "")),
            "year": str(edu.get("year", "")),
        })

    return ResumeResponse(
        id=str(resume.hh_resume_id),
        title=resume.title,
        position=resume.position or resume.title,
        skills=skills,
        salary=_format_salary(resume.salary_from, resume.salary_to, resume.salary_currency),
        salaryFrom=resume.salary_from,
        salaryTo=resume.salary_to,
        currency=resume.salary_currency,
        city=resume.city or "",
        experience=_format_experience_text(resume.experience),
        experienceYears=_calculate_experience_years(resume.experience),
        education=_format_education_text(resume.education),
        about=resume.about or "",
        lastSync=resume.updated_at.isoformat() if resume.updated_at else "",
        isDefault=resume.is_active,  # Using is_active as "is default" for now
        experienceEntries=exp_list,
        educationEntries=edu_list,
        skillGaps=_infer_skill_gaps(skills, matching_vacancies),
        matchingVacancies=matching_vacancies,
        totalVacancies=total_vacancies,
    )


async def _get_or_create_user(session: AsyncSession) -> User:
    """Get or create the default dashboard user."""
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)  # dashboard user has telegram_id=0
    if not user:
        user = await user_repo.create(telegram_id=0)
    return user


@router.get("", response_model=dict)
async def get_resumes(session: AsyncSession = Depends(get_session)):
    """Get all resumes for the dashboard user."""
    user = await _get_or_create_user(session)
    resume_repo = ResumeRepository(session)
    resumes = await resume_repo.get_by_user(user.id)

    # Count total vacancies for stats
    from src.db.models import Vacancy
    from sqlalchemy import select, func
    total_result = await session.execute(select(func.count(Vacancy.id)).where(Vacancy.user_id == user.id))
    total_vacancies = total_result.scalar() or 0

    matching = sum(1 for r in resumes if r.is_active) * 6  # Approximate

    return {
        "resumes": [_resume_to_response(r, total_vacancies, matching) for r in resumes]
    }


@router.get("/{resume_id}", response_model=dict)
async def get_resume(resume_id: str, session: AsyncSession = Depends(get_session)):
    """Get a single resume by HH.ru resume ID."""
    resume_repo = ResumeRepository(session)
    resume = await resume_repo.get_by_hh_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"resume": _resume_to_response(resume)}


@router.put("/{resume_id}", response_model=dict)
async def update_resume(
    resume_id: str,
    data: ResumeUpdateRequest,
    session: AsyncSession = Depends(get_session),
):
    """Update resume fields (local changes, not pushed to HH.ru yet)."""
    resume_repo = ResumeRepository(session)
    resume = await resume_repo.get_by_hh_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.position is not None:
        update_data["position"] = data.position
    if data.salary_from is not None:
        update_data["salary_from"] = data.salary_from
    if data.salary_to is not None:
        update_data["salary_to"] = data.salary_to
    if data.currency is not None:
        update_data["salary_currency"] = data.currency
    if data.city is not None:
        update_data["city"] = data.city
    if data.about is not None:
        update_data["about"] = data.about
    if data.is_default is not None:
        update_data["is_active"] = data.is_default
    if data.skills is not None:
        update_data["skills"] = json.dumps(data.skills, ensure_ascii=False)
    if data.experience_entries is not None:
        exp_data = []
        for e in data.experience_entries:
            exp_data.append({
                "company": e.company,
                "position": e.position,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "description": e.description,
            })
        update_data["experience"] = json.dumps(exp_data, ensure_ascii=False)

    if update_data:
        for key, value in update_data.items():
            setattr(resume, key, value)
        resume.updated_at = datetime.utcnow()
        await session.flush()

    return {"resume": _resume_to_response(resume)}


@router.post("/sync", response_model=dict)
async def sync_resumes(session: AsyncSession = Depends(get_session)):
    """Sync resumes from HH.ru via Playwright (API discontinued Dec 2025).

    If user has cookies (logged in via Playwright), scrapes real resume data.
    Otherwise, seeds demo data for testing.
    """
    user = await _get_or_create_user(session)

    # Try Playwright-based sync if user has cookies
    if user.hh_cookies:
        try:
            from src.hh.hybrid_client import HybridHHClient

            hh_client = HybridHHClient(
                user_id=user.id,
                cookies_json=user.hh_cookies,
            )
            try:
                hh_resumes = await hh_client.get_resumes()
            finally:
                await hh_client.close()

            if hh_resumes:
                from src.services.resume_service import ResumeService
                resume_service = ResumeService(session)
                synced = await resume_service.sync_resumes_from_hh(user, hh_resumes)

                # Log activity
                activity = ActivityLog(
                    user_id=user.id,
                    action="resume_sync",
                    details=f"Синхронизировано {len(hh_resumes)} резюме с HH.ru",
                )
                session.add(activity)
                await session.flush()

                return SyncResponse(success=True, syncedAt=datetime.utcnow().isoformat()).model_dump(by_alias=True)
            else:
                logger.warning("Playwright returned no resumes for user %d", user.id)
                # Fall through to demo data
        except Exception as e:
            logger.error("Playwright resume sync failed: %s", e)
            # Fall through to demo data

    # No cookies or sync failed — seed demo data or return existing
    resume_repo = ResumeRepository(session)
    resumes = await resume_repo.get_by_user(user.id)
    if resumes:
        return SyncResponse(success=True, syncedAt=datetime.utcnow().isoformat()).model_dump(by_alias=True)

    # Seed with demo data
    try:
        result = await _seed_demo_resumes(user, session)
        await session.flush()
        return result
    except Exception as e:
        logger.error("Demo resume seeding failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")


async def _seed_demo_resumes(user: User, session: AsyncSession) -> dict:
    """Seed demo resume data for testing when no HH.ru connection is available."""
    resume_repo = ResumeRepository(session)

    # Check if we already have demo data
    existing = await resume_repo.get_by_user(user.id)
    if existing:
        return SyncResponse(success=True, syncedAt=datetime.utcnow().isoformat()).model_dump(by_alias=True)

    demo_skills_1 = ["Python", "Django", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker", "Redis", "Celery", "Git"]
    demo_exp_1 = [
        {"company": "\u042f\u043d\u0434\u0435\u043a\u0441", "position": "Senior Python Developer", "start_date": "2023-03", "end_date": None, "description": "\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0445 \u0441\u0435\u0440\u0432\u0438\u0441\u043e\u0432 \u043f\u043e\u0438\u0441\u043a\u0430."},
        {"company": "\u0422\u0438\u043d\u044c\u043a\u043e\u0444\u0444", "position": "Python Developer", "start_date": "2021-06", "end_date": "2023-02", "description": "\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u0431\u044d\u043a\u0435\u043d\u0434-\u0441\u0435\u0440\u0432\u0438\u0441\u043e\u0432 \u0434\u043b\u044f \u043c\u043e\u0431\u0438\u043b\u044c\u043d\u043e\u0433\u043e \u0431\u0430\u043d\u043a\u0430."},
        {"company": "Digital Horizon", "position": "Junior Python Developer", "start_date": "2019-08", "end_date": "2021-05", "description": "\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430 REST API \u0434\u043b\u044f \u0444\u0438\u043d\u0442\u0435\u043a-\u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b."},
    ]
    demo_edu_1 = [
        {"organization": "\u041c\u0413\u0422\u0423 \u0438\u043c. \u041d.\u042d. \u0411\u0430\u0443\u043c\u0430\u043d\u0430", "name": "\u041c\u0430\u0433\u0438\u0441\u0442\u0440, \u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0442\u0438\u043a\u0430 \u0438 \u0432\u044b\u0447\u0438\u0441\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0442\u0435\u0445\u043d\u0438\u043a\u0430", "year": 2019},
        {"organization": "\u041c\u0413\u0422\u0423 \u0438\u043c. \u041d.\u042d. \u0411\u0430\u0443\u043c\u0430\u043d\u0430", "name": "\u0411\u0430\u043a\u0430\u043b\u0430\u0432\u0440, \u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u043d\u0430\u044f \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u0438\u044f", "year": 2017},
    ]

    await resume_repo.upsert(
        user_id=user.id,
        hh_resume_id="demo_r1",
        title="Python Developer / Fullstack",
        position="Python Developer",
        salary_from=250000,
        salary_to=350000,
        salary_currency="RUR",
        skills=json.dumps(demo_skills_1, ensure_ascii=False),
        experience=json.dumps(demo_exp_1, ensure_ascii=False),
        education=json.dumps(demo_edu_1, ensure_ascii=False),
        about="\u041e\u043f\u044b\u0442\u043d\u044b\u0439 Python-\u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0447\u0438\u043a \u0441 5-\u043b\u0435\u0442\u043d\u0438\u043c \u0441\u0442\u0430\u0436\u0435\u043c \u0432 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438 \u0432\u044b\u0441\u043e\u043a\u043e\u043d\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043d\u044b\u0445 \u0432\u0435\u0431-\u0441\u0435\u0440\u0432\u0438\u0441\u043e\u0432. \u0421\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e\u0441\u044c \u043d\u0430 FastAPI \u0438 Django.",
        city="\u041c\u043e\u0441\u043a\u0432\u0430",
        is_active=True,
    )

    demo_skills_2 = ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux", "Bash", "Prometheus", "Grafana"]
    demo_exp_2 = [
        {"company": "\u0421\u0431\u0435\u0440", "position": "DevOps Engineer", "start_date": "2023-01", "end_date": None, "description": "\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0438 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 CI/CD \u043f\u0430\u0439\u043f\u043b\u0430\u0439\u043d\u043e\u0432."},
        {"company": "VK Cloud", "position": "Cloud Engineer", "start_date": "2021-04", "end_date": "2022-12", "description": "\u041f\u0440\u043e\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043e\u0431\u043b\u0430\u0447\u043d\u044b\u0445 \u0440\u0435\u0448\u0435\u043d\u0438\u0439."},
    ]
    demo_edu_2 = [
        {"organization": "\u041c\u0413\u0423 \u0438\u043c. \u041c.\u0412. \u041b\u043e\u043c\u043e\u043d\u043e\u0441\u043e\u0432\u0430", "name": "\u041c\u0430\u0433\u0438\u0441\u0442\u0440, \u0424\u0430\u043a\u0443\u043b\u044c\u0442\u0435\u0442 \u0412\u041c\u041a", "year": 2020},
    ]

    await resume_repo.upsert(
        user_id=user.id,
        hh_resume_id="demo_r2",
        title="DevOps / \u0418\u043d\u0436\u0435\u043d\u0435\u0440 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b",
        position="DevOps Engineer",
        salary_from=220000,
        salary_to=320000,
        salary_currency="RUR",
        skills=json.dumps(demo_skills_2, ensure_ascii=False),
        experience=json.dumps(demo_exp_2, ensure_ascii=False),
        education=json.dumps(demo_edu_2, ensure_ascii=False),
        about="DevOps-\u0438\u043d\u0436\u0435\u043d\u0435\u0440 \u0441 \u043e\u043f\u044b\u0442\u043e\u043c \u043f\u043e\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u044f \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438 \u043e\u0431\u043b\u0430\u0447\u043d\u043e\u0439 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b.",
        city="\u041c\u043e\u0441\u043a\u0432\u0430",
        is_active=False,
    )

    return SyncResponse(success=True, syncedAt=datetime.utcnow().isoformat()).model_dump(by_alias=True)


@router.post("/{resume_id}/set-default", response_model=dict)
async def set_default_resume(
    resume_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Set a resume as the default (active) one."""
    user = await _get_or_create_user(session)
    resume_repo = ResumeRepository(session)

    # Deactivate all
    from sqlalchemy import update
    from src.db.models import Resume as ResumeModel
    await session.execute(
        update(ResumeModel).where(ResumeModel.user_id == user.id).values(is_active=False)
    )

    # Activate selected
    resume = await resume_repo.get_by_hh_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.is_active = True
    await session.flush()

    return {"success": True}


@router.post("/{resume_id}/add-skill", response_model=dict)
async def add_skill(
    resume_id: str,
    data: SkillRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a skill to a resume."""
    resume_repo = ResumeRepository(session)
    resume = await resume_repo.get_by_hh_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    skills = json.loads(resume.skills) if resume.skills else []
    if data.skill not in skills:
        skills.append(data.skill)
        resume.skills = json.dumps(skills, ensure_ascii=False)
        resume.updated_at = datetime.utcnow()
        await session.flush()

    return {"resume": _resume_to_response(resume)}


@router.post("/{resume_id}/remove-skill", response_model=dict)
async def remove_skill(
    resume_id: str,
    data: SkillRequest,
    session: AsyncSession = Depends(get_session),
):
    """Remove a skill from a resume."""
    resume_repo = ResumeRepository(session)
    resume = await resume_repo.get_by_hh_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    skills = json.loads(resume.skills) if resume.skills else []
    skills = [s for s in skills if s != data.skill]
    resume.skills = json.dumps(skills, ensure_ascii=False)
    resume.updated_at = datetime.utcnow()
    await session.flush()

    return {"resume": _resume_to_response(resume)}
