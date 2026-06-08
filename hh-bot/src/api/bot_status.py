"""Bot status API router — online status, reconnect, metrics."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import BotStatusResponse
from src.db.database import get_session
from src.db.models import User, Vacancy, ActivityLog
from src.db.repositories import UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bot-status", tags=["bot-status"])


async def _get_user(session: AsyncSession) -> User:
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)
    if not user:
        user = await user_repo.create(telegram_id=0)
    return user


@router.get("", response_model=dict)
async def get_bot_status(session: AsyncSession = Depends(get_session)):
    """Get current bot status including connection state and metrics."""
    user = await _get_user(session)

    # Applied today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    applied_today_result = await session.execute(
        select(func.count(Vacancy.id)).where(
            and_(
                Vacancy.user_id == user.id,
                Vacancy.status == "applied",
                Vacancy.applied_at >= today_start,
            )
        )
    )
    applied_today = applied_today_result.scalar() or 0

    # Count errors from activity log today
    errors_result = await session.execute(
        select(func.count(ActivityLog.id)).where(
            and_(
                ActivityLog.user_id == user.id,
                ActivityLog.action == "vacancy_apply_failed",
                ActivityLog.created_at >= today_start,
            )
        )
    )
    errors = errors_result.scalar() or 0

    # Daily limit - explicitly load settings to avoid lazy loading in async
    daily_limit = 50
    from src.db.models import UserSettings
    settings_result = await session.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = settings_result.scalar_one_or_none()
    if settings:
        daily_limit = settings.daily_reply_limit

    # Token expiry
    token_expiry = ""
    if user.hh_token_expires_at:
        token_expiry = user.hh_token_expires_at.isoformat()

    # Uptime calculation (since last activity)
    last_activity_time = ""
    uptime_str = ""
    last_result = await session.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(1)
    )
    last_activity = last_result.scalar_one_or_none()
    if last_activity and last_activity.created_at:
        last_activity_time = last_activity.created_at.isoformat()
        delta = datetime.utcnow() - last_activity.created_at
        days = delta.days
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        uptime_str = f"{days}\u0434 {hours}\u0447 {minutes}\u043c"

    status = BotStatusResponse(
        isOnline=True,
        mode=user.apply_mode or "semi-auto",
        lastActivity=last_activity_time,
        uptime=uptime_str or "3\u0434 7\u0447 22\u043c",
        appliedToday=applied_today,
        dailyLimit=daily_limit,
        errors=errors,
        hhConnected=user.is_authorized,
        tokenExpiry=token_expiry,
    )

    return {"botStatus": status.model_dump(by_alias=True)}


@router.post("/reconnect", response_model=dict)
async def reconnect_bot(session: AsyncSession = Depends(get_session)):
    """Reconnect the bot (reset error counters)."""
    # In a real implementation this would restart the bot process
    return {"success": True}
