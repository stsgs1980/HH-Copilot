"""Cover letter generation using LLM.

Skill reference: LLM
- Uses OpenAI API (GPT-4o-mini by default)
- Falls back to template if AI fails
- Sanitizes all inputs and outputs
"""

import logging
from typing import Any

from openai import AsyncOpenAI

from src.ai.prompts import (
    FALLBACK_LETTER,
    SYSTEM_PROMPT,
    build_cover_letter_prompt,
    build_relevance_assessment_prompt,
)
from src.ai.sanitizer import (
    sanitize_resume_for_prompt,
    sanitize_vacancy_for_prompt,
    validate_cover_letter,
)
from src.config import get_settings

logger = logging.getLogger(__name__)


class CoverLetterGenerator:
    """AI-powered cover letter generator with fallback."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.settings.openai_api_key,
            )
        return self._client

    async def generate(
        self,
        vacancy_title: str,
        vacancy_company: str,
        vacancy_tags: list[str] | None = None,
        vacancy_experience: str = "",
        resume_skills: list[str] | None = None,
        resume_experience: str = "",
        resume_position: str = "",
        tone: str = "professional",
        max_words: int = 80,
        career_direction: str = "",
    ) -> str:
        """Generate a cover letter using AI.

        Falls back to template if AI fails or content is invalid.
        """
        # Sanitize all inputs
        vac = sanitize_vacancy_for_prompt(
            vacancy_title, vacancy_company, vacancy_tags or [], vacancy_experience
        )
        res = sanitize_resume_for_prompt(
            resume_skills or [], resume_experience, resume_position
        )

        # Build prompt
        user_prompt = build_cover_letter_prompt(
            title=vac["title"],
            company=vac["company"],
            tags=vac["tags"],
            experience=vac["experience"],
            resume_skills=res["skills"],
            resume_experience=res["experience"],
            tone=tone,
            max_words=max_words,
            career_direction=career_direction,
        )

        # Try AI generation
        try:
            response = await self.client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=300,
            )
            raw_letter = response.choices[0].message.content or ""
            validated = validate_cover_letter(raw_letter)
            if validated:
                return validated
            logger.warning("AI content validation failed, using fallback")
        except Exception as e:
            logger.error("AI cover letter generation failed: %s", e)

        # Fallback
        return FALLBACK_LETTER.format(
            title=vacancy_title,
            company=vacancy_company,
        )

    async def assess_relevance(
        self,
        vacancy_title: str,
        vacancy_skills: list[str],
        vacancy_experience: str,
        resume_position: str,
        resume_skills: list[str],
        resume_experience: str,
    ) -> int:
        """Assess relevance of a vacancy to a resume (0-100 score).

        Used as a secondary signal in the matching engine when
        the primary scoring is inconclusive (borderline cases).
        """
        try:
            prompt = build_relevance_assessment_prompt(
                vacancy_title=vacancy_title,
                vacancy_skills=", ".join(vacancy_skills[:10]),
                vacancy_experience=vacancy_experience,
                resume_position=resume_position,
                resume_skills=", ".join(resume_skills[:15]),
                resume_experience=resume_experience[:300],
            )
            response = await self.client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Оцени релевантность. Ответь только числом от 0 до 100.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=10,
            )
            score_text = response.choices[0].message.content or "0"
            score = int("".join(c for c in score_text if c.isdigit()))
            return min(100, max(0, score))
        except Exception as e:
            logger.error("AI relevance assessment failed: %s", e)
            return 50  # Neutral fallback
