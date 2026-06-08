"""Negotiation service — applying to vacancies and managing employer chats."""

import json
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.cover_letter import CoverLetterGenerator
from src.db.models import Negotiation, Vacancy
from src.db.repositories import ActivityLogRepository, NegotiationRepository, VacancyRepository
from src.hh.hybrid_client import HybridHHClient
from src.services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class NegotiationService:
    """Service for applying to vacancies and managing negotiations."""

    def __init__(
        self,
        session: AsyncSession,
        hh_client: HybridHHClient,
        rate_limiter: RateLimiter,
        letter_generator: CoverLetterGenerator,
    ):
        self.session = session
        self.hh_client = hh_client
        self.rate_limiter = rate_limiter
        self.letter_generator = letter_generator
        self.neg_repo = NegotiationRepository(session)
        self.vacancy_repo = VacancyRepository(session)
        self.log_repo = ActivityLogRepository(session)

    async def apply_to_vacancy(
        self,
        user_id: int,
        vacancy_id: int,
        resume_id: str,
        cover_letter: str | None = None,
        auto_generate_letter: bool = True,
    ) -> dict:
        """Apply to a single vacancy.

        Args:
            vacancy_id: Internal database vacancy ID
            resume_id: HH.ru resume ID
            cover_letter: Pre-written cover letter (or None to auto-generate)
            auto_generate_letter: Generate cover letter with AI if not provided

        Returns:
            Dict with success status and details
        """
        # Check rate limit
        if self.rate_limiter.is_limit_reached():
            return {"success": False, "error": "daily_limit_reached"}

        # Get vacancy from database
        vacancy = await self.session.get(Vacancy, vacancy_id)
        if not vacancy:
            return {"success": False, "error": "vacancy_not_found"}

        # Generate cover letter if not provided
        if not cover_letter and auto_generate_letter:
            try:
                vacancy_skills = json.loads(vacancy.skills) if vacancy.skills else []
                cover_letter = await self.letter_generator.generate(
                    vacancy_title=vacancy.title,
                    vacancy_company=vacancy.company,
                    vacancy_tags=vacancy_skills,
                    vacancy_experience=vacancy.experience,
                )
            except Exception as e:
                logger.error("Cover letter generation failed: %s", e)
                cover_letter = None

        # Apply via hybrid client
        result = await self.hh_client.apply_to_vacancy(
            vacancy_id=vacancy.hh_vacancy_id,
            resume_id=resume_id,
            cover_letter=cover_letter or "",
            vacancy_url=vacancy.url,
        )

        # Update database
        if result.get("success"):
            await self.vacancy_repo.update_status(
                vacancy_id, "applied", cover_letter=cover_letter
            )
            self.rate_limiter.increment_reply()
            await self.log_repo.log(
                user_id=user_id,
                action="vacancy_applied",
                details=f"Applied to {vacancy.title} at {vacancy.company}",
                vacancy_id=vacancy_id,
            )
        else:
            error = result.get("error", "unknown")
            if error == "already_applied":
                await self.vacancy_repo.update_status(vacancy_id, "skipped")
                self.rate_limiter.increment_skipped()
            else:
                await self.vacancy_repo.update_status(vacancy_id, "failed")
                self.rate_limiter.increment_error()
            await self.log_repo.log(
                user_id=user_id,
                action="vacancy_apply_failed",
                details=f"Failed: {error}",
                vacancy_id=vacancy_id,
            )

        return result

    async def batch_apply(
        self,
        user_id: int,
        vacancy_ids: list[int],
        resume_id: str,
    ) -> dict:
        """Apply to multiple vacancies in batch.

        Respects rate limits and anti-detection timing.
        """
        from src.hh.anti_detect import BatchTimingController

        timing = BatchTimingController()
        results = {"applied": 0, "failed": 0, "skipped": 0, "errors": []}

        for vacancy_id in vacancy_ids:
            if self.rate_limiter.is_limit_reached():
                results["errors"].append("Daily limit reached")
                break

            result = await self.apply_to_vacancy(
                user_id=user_id,
                vacancy_id=vacancy_id,
                resume_id=resume_id,
            )

            if result.get("success"):
                results["applied"] += 1
            elif result.get("error") == "already_applied":
                results["skipped"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(result.get("error", "unknown"))

            # Anti-detection delay between applications
            await timing.between_applications()

        return results

    async def send_message(
        self,
        user_id: int,
        negotiation_id: int,
        message: str,
    ) -> dict:
        """Send a message in a negotiation thread."""
        negotiation = await self.session.get(Negotiation, negotiation_id)
        if not negotiation:
            return {"success": False, "error": "negotiation_not_found"}

        result = await self.hh_client.send_message(
            negotiation_id=negotiation.hh_negotiation_id,
            message=message,
        )

        if result.get("success"):
            negotiation.last_message = message
            negotiation.last_message_at = datetime.utcnow()
            await self.log_repo.log(
                user_id=user_id,
                action="message_sent",
                details=f"Message sent in negotiation {negotiation.hh_negotiation_id}",
            )

        return result

    async def sync_negotiations(
        self, user_id: int
    ) -> list[Negotiation]:
        """Sync negotiations from HH.ru to local database."""
        hh_negotiations = await self.hh_client.get_negotiations()
        synced = []
        for neg in hh_negotiations:
            # Find related vacancy
            db_negotiation = await self.neg_repo.upsert(
                user_id=user_id,
                hh_negotiation_id=neg.id,
                employer_name=neg.employer_name,
                vacancy_title=neg.vacancy_title,
                state=neg.state,
                has_unread=neg.has_unread,
            )
            synced.append(db_negotiation)
        await self.session.flush()
        return synced
