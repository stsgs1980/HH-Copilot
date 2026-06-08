"""Database repository layer for data access."""

import json
from datetime import datetime

from sqlalchemy import select, update, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import (
    ActivityLog,
    Negotiation,
    Resume,
    User,
    UserSettings,
    Vacancy,
)


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        stmt = select(User).where(User.telegram_id == telegram_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, telegram_id: int) -> User:
        user = User(telegram_id=telegram_id)
        self.session.add(user)
        await self.session.flush()
        # Create default settings
        settings = UserSettings(user_id=user.id)
        self.session.add(settings)
        await self.session.flush()
        return user

    async def get_or_create(self, telegram_id: int) -> User:
        user = await self.get_by_telegram_id(telegram_id)
        if user is None:
            user = await self.create(telegram_id)
        return user

    async def update_tokens(
        self,
        telegram_id: int,
        access_token: str,
        refresh_token: str,
        expires_at: datetime,
    ) -> User:
        user = await self.get_by_telegram_id(telegram_id)
        if user:
            user.hh_access_token = access_token
            user.hh_refresh_token = refresh_token
            user.hh_token_expires_at = expires_at
            user.is_authorized = True
            await self.session.flush()
        return user

    async def set_apply_mode(self, telegram_id: int, mode: str) -> None:
        stmt = (
            update(User)
            .where(User.telegram_id == telegram_id)
            .values(apply_mode=mode)
        )
        await self.session.execute(stmt)

    async def set_career_direction(self, telegram_id: int, direction: str) -> None:
        stmt = (
            update(User)
            .where(User.telegram_id == telegram_id)
            .values(career_direction=direction)
        )
        await self.session.execute(stmt)


class ResumeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(self, user_id: int) -> list[Resume]:
        stmt = select(Resume).where(Resume.user_id == user_id).order_by(Resume.is_active.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_hh_id(self, hh_resume_id: str) -> Resume | None:
        stmt = select(Resume).where(Resume.hh_resume_id == hh_resume_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, user_id: int, hh_resume_id: str, **kwargs) -> Resume:
        resume = await self.get_by_hh_id(hh_resume_id)
        if resume is None:
            resume = Resume(user_id=user_id, hh_resume_id=hh_resume_id, **kwargs)
            self.session.add(resume)
        else:
            for key, value in kwargs.items():
                setattr(resume, key, value)
            resume.updated_at = datetime.utcnow()
        await self.session.flush()
        return resume


class VacancyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(
        self, user_id: int, status: str | None = None, limit: int = 50
    ) -> list[Vacancy]:
        stmt = select(Vacancy).where(Vacancy.user_id == user_id)
        if status:
            stmt = stmt.where(Vacancy.status == status)
        stmt = stmt.order_by(desc(Vacancy.match_score)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_hh_id(self, user_id: int, hh_vacancy_id: str) -> Vacancy | None:
        stmt = select(Vacancy).where(
            and_(Vacancy.user_id == user_id, Vacancy.hh_vacancy_id == hh_vacancy_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, user_id: int, hh_vacancy_id: str, **kwargs) -> Vacancy:
        vacancy = await self.get_by_hh_id(user_id, hh_vacancy_id)
        if vacancy is None:
            vacancy = Vacancy(user_id=user_id, hh_vacancy_id=hh_vacancy_id, **kwargs)
            self.session.add(vacancy)
        else:
            for key, value in kwargs.items():
                setattr(vacancy, key, value)
            vacancy.updated_at = datetime.utcnow()
        await self.session.flush()
        return vacancy

    async def update_status(self, vacancy_id: int, status: str, **kwargs) -> None:
        values = {"status": status, **kwargs}
        if status == "applied":
            values["applied_at"] = datetime.utcnow()
        stmt = update(Vacancy).where(Vacancy.id == vacancy_id).values(**values)
        await self.session.execute(stmt)


class NegotiationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(self, user_id: int, limit: int = 50) -> list[Negotiation]:
        stmt = (
            select(Negotiation)
            .where(Negotiation.user_id == user_id)
            .order_by(desc(Negotiation.updated_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_unread(self, user_id: int) -> list[Negotiation]:
        stmt = select(Negotiation).where(
            and_(Negotiation.user_id == user_id, Negotiation.has_unread.is_(True))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert(self, user_id: int, hh_negotiation_id: str, **kwargs) -> Negotiation:
        stmt = select(Negotiation).where(
            Negotiation.hh_negotiation_id == hh_negotiation_id
        )
        result = await self.session.execute(stmt)
        negotiation = result.scalar_one_or_none()
        if negotiation is None:
            negotiation = Negotiation(
                user_id=user_id, hh_negotiation_id=hh_negotiation_id, **kwargs
            )
            self.session.add(negotiation)
        else:
            for key, value in kwargs.items():
                setattr(negotiation, key, value)
        await self.session.flush()
        return negotiation


class ActivityLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def log(self, user_id: int, action: str, details: str | None = None, vacancy_id: int | None = None) -> None:
        entry = ActivityLog(
            user_id=user_id, action=action, details=details, vacancy_id=vacancy_id
        )
        self.session.add(entry)
        await self.session.flush()

    async def get_recent(self, user_id: int, limit: int = 20) -> list[ActivityLog]:
        stmt = (
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(desc(ActivityLog.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
