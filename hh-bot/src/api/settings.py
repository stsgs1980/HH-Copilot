"""Settings API router - user preferences and search configuration."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import SettingsResponse, SettingsUpdateRequest
from src.db.database import get_session
from src.db.models import User, UserSettings
from src.db.repositories import UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


async def _get_user(session: AsyncSession) -> User:
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)
    if not user:
        user = await user_repo.create(telegram_id=0)
    return user


async def _get_settings(session: AsyncSession, user_id: int) -> UserSettings | None:
    """Explicitly load settings to avoid lazy loading in async context."""
    result = await session.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )
    return result.scalar_one_or_none()


def _settings_to_response(user: User, settings: UserSettings | None) -> SettingsResponse:
    career = user.career_direction
    if not career and settings and settings.search_specialization:
        career = settings.search_specialization
    if not career:
        career = "Python Developer"
    return SettingsResponse(
        mode=user.apply_mode or "semi-auto",
        careerDirection=career,
        letterTone=settings.ai_tone if settings else "confident",
        dailyLimit=settings.daily_reply_limit if settings else 50,
        searchInterval=settings.search_interval_min if settings else 15,
        minMatchScore=int(user.min_match_score) if user.min_match_score else 70,
    )


@router.get("", response_model=dict)
async def get_settings(session: AsyncSession = Depends(get_session)):
    """Get current settings."""
    user = await _get_user(session)
    settings = await _get_settings(session, user.id)

    return {
        "settings": _settings_to_response(user, settings).model_dump(by_alias=True)
    }


@router.post("", response_model=dict)
async def update_settings(
    data: SettingsUpdateRequest,
    session: AsyncSession = Depends(get_session),
):
    """Update user settings."""
    user = await _get_user(session)
    settings = await _get_settings(session, user.id)

    if not settings:
        settings = UserSettings(user_id=user.id)
        session.add(settings)

    if data.mode is not None:
        user.apply_mode = data.mode
    if data.career_direction is not None:
        user.career_direction = data.career_direction
    if data.letter_tone is not None:
        settings.ai_tone = data.letter_tone
    if data.daily_limit is not None:
        settings.daily_reply_limit = data.daily_limit
    if data.search_interval is not None:
        settings.search_interval_min = data.search_interval
    if data.min_match_score is not None:
        user.min_match_score = float(data.min_match_score)

    await session.flush()

    return {
        "success": True,
        "settings": _settings_to_response(user, settings).model_dump(by_alias=True),
    }
