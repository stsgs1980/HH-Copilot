"""Resume service — loading, parsing, and managing user resumes."""

import json
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Resume, User
from src.db.repositories import ResumeRepository, UserRepository
from src.hh.models import HHResume

logger = logging.getLogger(__name__)


class ResumeService:
    """Service for managing user resumes from HH.ru."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.resume_repo = ResumeRepository(session)
        self.user_repo = UserRepository(session)

    async def sync_resumes_from_hh(
        self, user: User, hh_resumes: list[HHResume]
    ) -> list[Resume]:
        """Sync resumes from HH.ru API to local database.

        Creates or updates local resume records from HH.ru data.
        """
        synced = []
        for hh_resume in hh_resumes:
            resume = await self.resume_repo.upsert(
                user_id=user.id,
                hh_resume_id=hh_resume.id,
                title=hh_resume.title,
                position=hh_resume.position,
                salary_from=hh_resume.salary_from,
                salary_to=hh_resume.salary_to,
                salary_currency=hh_resume.salary_currency,
                skills=json.dumps(hh_resume.skills, ensure_ascii=False),
                experience=json.dumps(hh_resume.experience, ensure_ascii=False),
                education=json.dumps(hh_resume.education, ensure_ascii=False),
                about=hh_resume.about,
                city=hh_resume.city,
                raw_data=json.dumps(hh_resume.raw_data, ensure_ascii=False) if hh_resume.raw_data else None,
            )
            synced.append(resume)
        await self.session.flush()
        return synced

    async def get_active_resumes(self, user_id: int) -> list[Resume]:
        """Get all active resumes for a user."""
        return await self.resume_repo.get_by_user(user_id)

    async def get_resume_skills(self, user_id: int) -> list[str]:
        """Get aggregated skills from all active resumes."""
        resumes = await self.get_active_resumes(user_id)
        all_skills = set()
        for resume in resumes:
            try:
                skills = json.loads(resume.skills) if resume.skills else []
                all_skills.update(skills)
            except json.JSONDecodeError:
                continue
        return list(all_skills)

    async def get_resume_experience_text(self, user_id: int) -> str:
        """Get formatted experience text for AI prompts."""
        resumes = await self.get_active_resumes(user_id)
        parts = []
        for resume in resumes:
            try:
                experience = json.loads(resume.experience) if resume.experience else []
                for exp in experience:
                    parts.append(
                        f"{exp.get('position', '')} в {exp.get('company', '')} "
                        f"({exp.get('start_date', '')} - {exp.get('end_date', 'настоящее время')})"
                    )
            except json.JSONDecodeError:
                continue
        return "; ".join(parts) if parts else ""

    @staticmethod
    def hh_resume_to_model(hh_resume: HHResume) -> dict:
        """Convert HHResume dataclass to database-compatible dict."""
        return {
            "hh_resume_id": hh_resume.id,
            "title": hh_resume.title,
            "position": hh_resume.position,
            "salary_from": hh_resume.salary_from,
            "salary_to": hh_resume.salary_to,
            "salary_currency": hh_resume.salary_currency,
            "skills": json.dumps(hh_resume.skills, ensure_ascii=False),
            "experience": json.dumps(hh_resume.experience, ensure_ascii=False),
            "education": json.dumps(hh_resume.education, ensure_ascii=False),
            "about": hh_resume.about,
            "city": hh_resume.city,
        }
