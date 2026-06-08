"""Celery tasks for background processing."""

import asyncio
import json
import logging
from datetime import datetime, timezone

from src.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper to run async code from synchronous Celery tasks."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="src.worker.tasks.periodic_vacancy_search", bind=True, max_retries=2)
def periodic_vacancy_search(self) -> dict:
    """Search for new vacancies for all active users.

    Runs periodically (every 30 min) via Celery Beat.
    For each user with auto-search enabled:
    1. Get search parameters from user settings
    2. Search HH.ru via hybrid client
    3. Score and save vacancies
    4. Notify user about new matches (if auto mode)
    """

    async def _search():
        from src.db.database import async_session_factory
        from src.db.models import User, UserSettings
        from src.db.repositories import UserRepository, VacancyRepository
        from src.hh.hybrid_client import HybridHHClient
        from src.matching.engine import MatchingEngine
        from src.services.resume_service import ResumeService
        from src.services.vacancy_service import VacancyService

        results = {"users_processed": 0, "vacancies_found": 0, "errors": 0}

        async with async_session_factory() as session:
            from sqlalchemy import select
            stmt = select(User).where(User.is_authorized.is_(True))
            db_result = await session.execute(stmt)
            users = list(db_result.scalars().all())

        for user in users:
            try:
                async with async_session_factory() as session:
                    if not user.hh_access_token:
                        continue

                    # Get user settings
                    settings = user.settings
                    if not settings or not settings.auto_reply_enabled:
                        continue

                    # Build search params
                    search_params = VacancyService.build_search_params(
                        area=settings.search_area,
                        text="",
                        specialization=settings.search_specialization,
                        experience=settings.search_experience,
                        employment=settings.search_employment,
                        schedule=settings.search_schedule,
                        career_direction=user.career_direction or "",
                    )

                    # Search
                    hh_client = HybridHHClient(
                        access_token=user.hh_access_token,
                        refresh_token=user.hh_refresh_token,
                        user_id=user.id,
                    )
                    await hh_client.initialize()

                    vacancies = await hh_client.search_vacancies(search_params)
                    results["vacancies_found"] += len(vacancies)

                    # Score and save
                    if vacancies:
                        resume_service = ResumeService(session)
                        skills = await resume_service.get_resume_skills(user.id)

                        from src.hh.models import HHResume
                        dummy_resume = HHResume(skills=skills, position="")

                        engine = MatchingEngine()
                        scored = await engine.score_batch(vacancies, dummy_resume, user.min_match_score)

                        vacancy_service = VacancyService(session)
                        await vacancy_service.save_vacancies(user.id, [v for v, _ in scored])
                        await session.commit()

                        # Auto-apply if in auto mode
                        if user.apply_mode == "auto" and scored:
                            from src.services.negotiation_service import NegotiationService
                            from src.services.rate_limiter import RateLimiter
                            from src.ai.cover_letter import CoverLetterGenerator

                            resumes = await resume_service.get_active_resumes(user.id)
                            if resumes:
                                neg_service = NegotiationService(
                                    session=session,
                                    hh_client=hh_client,
                                    rate_limiter=RateLimiter(settings.daily_reply_limit),
                                    letter_generator=CoverLetterGenerator(),
                                )
                                suitable_ids = [v.id for v, _ in scored[:10]]
                                await neg_service.batch_apply(user.id, suitable_ids, resumes[0].hh_resume_id)
                                await session.commit()

                    await hh_client.close()
                    results["users_processed"] += 1

            except Exception as e:
                logger.error("Periodic search failed for user %d: %s", user.id, e)
                results["errors"] += 1

        return results

    return run_async(_search())


@celery_app.task(name="src.worker.tasks.check_new_negotiations", bind=True, max_retries=1)
def check_new_negotiations(self) -> dict:
    """Check for new messages in negotiations and notify users."""

    async def _check():
        from src.db.database import async_session_factory
        from src.db.models import User
        from src.db.repositories import UserRepository, NegotiationRepository
        from src.hh.hybrid_client import HybridHHClient

        results = {"checked": 0, "new_messages": 0}

        async with async_session_factory() as session:
            from sqlalchemy import select
            stmt = select(User).where(User.is_authorized.is_(True))
            db_result = await session.execute(stmt)
            users = list(db_result.scalars().all())

        for user in users:
            try:
                async with async_session_factory() as session:
                    if not user.hh_access_token:
                        continue

                    hh_client = HybridHHClient(
                        access_token=user.hh_access_token,
                        refresh_token=user.hh_refresh_token,
                        user_id=user.id,
                    )
                    await hh_client.initialize()

                    negotiations = await hh_client.get_negotiations()
                    unread = [n for n in negotiations if n.has_unread]

                    if unread:
                        # Notify user via Telegram
                        from src.bot.dispatcher import create_bot
                        bot = create_bot()
                        for neg in unread[:5]:
                            try:
                                await bot.send_message(
                                    user.telegram_id,
                                    f"💬 Новое сообщение от {neg.employer_name}\n"
                                    f"Вакансия: {neg.vacancy_title}",
                                )
                            except Exception:
                                pass
                        results["new_messages"] += len(unread)

                    # Sync to database
                    from src.services.negotiation_service import NegotiationService
                    from src.services.rate_limiter import RateLimiter
                    from src.ai.cover_letter import CoverLetterGenerator

                    neg_service = NegotiationService(
                        session=session,
                        hh_client=hh_client,
                        rate_limiter=RateLimiter(),
                        letter_generator=CoverLetterGenerator(),
                    )
                    await neg_service.sync_negotiations(user.id)
                    await session.commit()

                    await hh_client.close()
                    results["checked"] += 1

            except Exception as e:
                logger.error("Negotiation check failed for user %d: %s", user.id, e)

        return results

    return run_async(_check())


@celery_app.task(name="src.worker.tasks.refresh_expired_tokens", bind=True)
def refresh_expired_tokens(self) -> dict:
    """Refresh expired HH.ru OAuth tokens for active users."""

    async def _refresh():
        from src.db.database import async_session_factory
        from src.db.models import User
        from src.hh.api_client import HHApiClient

        results = {"refreshed": 0, "failed": 0}

        async with async_session_factory() as session:
            from sqlalchemy import select
            now = datetime.now(timezone.utc)
            stmt = select(User).where(
                User.is_authorized.is_(True),
                User.hh_token_expires_at < now,
            )
            db_result = await session.execute(stmt)
            users = list(db_result.scalars().all())

        for user in users:
            try:
                async with async_session_factory() as session:
                    if not user.hh_refresh_token:
                        continue

                    api_client = HHApiClient(
                        access_token=user.hh_access_token,
                        refresh_token=user.hh_refresh_token,
                    )
                    token_data = await api_client.refresh_access_token()

                    from src.db.repositories import UserRepository
                    user_repo = UserRepository(session)
                    expires_at = datetime.fromtimestamp(
                        token_data.get("created_at", 0) + token_data.get("expires_in", 0),
                        tz=timezone.utc,
                    )
                    await user_repo.update_tokens(
                        user.telegram_id,
                        access_token=token_data["access_token"],
                        refresh_token=token_data["refresh_token"],
                        expires_at=expires_at,
                    )
                    await session.commit()
                    await api_client.close()
                    results["refreshed"] += 1

            except Exception as e:
                logger.error("Token refresh failed for user %d: %s", user.id, e)
                results["failed"] += 1

        return results

    return run_async(_refresh())
