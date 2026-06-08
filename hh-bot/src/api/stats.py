"""Stats API router — dashboard statistics, chart data, activity log."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import (
    StatsResponse,
    DashboardStatsResponse,
    ChartDataPoint,
    ActivityLogEntryResponse,
)
from src.db.database import get_session
from src.db.models import ActivityLog, Negotiation, User, Vacancy
from src.db.repositories import UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stats", tags=["stats"])


async def _get_user(session: AsyncSession) -> User:
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)
    if not user:
        user = await user_repo.create(telegram_id=0)
    return user


@router.get("", response_model=dict)
async def get_stats(session: AsyncSession = Depends(get_session)):
    """Get dashboard statistics including chart data and activity log."""
    user = await _get_user(session)

    # Total vacancies
    total_result = await session.execute(
        select(func.count(Vacancy.id)).where(Vacancy.user_id == user.id)
    )
    total_vacancies = total_result.scalar() or 0

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

    # Interview invites (negotiations in 'interview' or 'waiting' state)
    interview_result = await session.execute(
        select(func.count(Negotiation.id)).where(
            and_(
                Negotiation.user_id == user.id,
                Negotiation.state.in_(["interview", "waiting", "invite"]),
            )
        )
    )
    interview_invites = interview_result.scalar() or 0

    # Daily limit - explicitly load settings to avoid lazy loading in async
    daily_limit = 50  # Default
    from src.db.models import UserSettings
    settings_result = await session.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = settings_result.scalar_one_or_none()
    if settings:
        daily_limit = settings.daily_reply_limit

    stats = DashboardStatsResponse(
        totalVacancies=total_vacancies,
        appliedToday=applied_today,
        interviewInvites=interview_invites,
        dailyLimitRemaining=max(0, daily_limit - applied_today),
    )

    # Generate chart data for last 7 days
    chart_data = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_applied = await session.execute(
            select(func.count(Vacancy.id)).where(
                and_(
                    Vacancy.user_id == user.id,
                    Vacancy.status == "applied",
                    Vacancy.applied_at >= day_start,
                    Vacancy.applied_at < day_end,
                )
            )
        )
        applications = day_applied.scalar() or 0

        day_interviews = await session.execute(
            select(func.count(Negotiation.id)).where(
                and_(
                    Negotiation.user_id == user.id,
                    Negotiation.state.in_(["interview", "invite"]),
                    Negotiation.updated_at >= day_start,
                    Negotiation.updated_at < day_end,
                )
            )
        )
        interviews = day_interviews.scalar() or 0

        chart_data.append(ChartDataPoint(
            day=day.strftime("%d %b").replace("Jun", "\u0438\u044e\u043d").replace("May", "\u043c\u0430\u044f"),
            applications=applications,
            interviews=interviews,
        ))

    # If no real chart data, provide demo data
    has_real_data = any(c.applications > 0 for c in chart_data)
    if not has_real_data:
        chart_data = [
            ChartDataPoint(day="30 \u043c\u0430\u044f", applications=3, interviews=0),
            ChartDataPoint(day="31 \u043c\u0430\u044f", applications=5, interviews=1),
            ChartDataPoint(day="1 \u0438\u044e\u043d", applications=2, interviews=0),
            ChartDataPoint(day="2 \u0438\u044e\u043d", applications=6, interviews=2),
            ChartDataPoint(day="3 \u0438\u044e\u043d", applications=4, interviews=1),
            ChartDataPoint(day="4 \u0438\u044e\u043d", applications=3, interviews=1),
            ChartDataPoint(day="5 \u0438\u044e\u043d", applications=4, interviews=2),
        ]

    # Activity log
    activity_result = await session.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .order_by(desc(ActivityLog.created_at))
        .limit(20)
    )
    activities = activity_result.scalars().all()

    activity_log = []
    for a in activities:
        action_map = {
            "vacancy_applied": "apply",
            "vacancy_apply_failed": "apply",
            "message_sent": "message",
            "sync": "sync",
        }
        activity_log.append(ActivityLogEntryResponse(
            id=str(a.id),
            type=action_map.get(a.action, "apply"),
            description=a.details or a.action,
            timestamp=a.created_at.isoformat() if a.created_at else "",
        ))

    # If no activity, provide demo data
    if not activity_log:
        activity_log = [
            ActivityLogEntryResponse(id="a1", type="apply", description="\u041e\u0442\u043a\u043b\u0438\u043a \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d: Senior Python Developer \u2014 HeadHunter", timestamp="2026-06-05T14:30:00"),
            ActivityLogEntryResponse(id="a2", type="interview", description="\u041f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0438\u043d\u0442\u0435\u0440\u0432\u044c\u044e: Python Developer \u2014 \u042f\u043d\u0434\u0435\u043a\u0441", timestamp="2026-06-05T11:45:00"),
            ActivityLogEntryResponse(id="a3", type="message", description="\u0410\u0432\u0442\u043e-\u043e\u0442\u0432\u0435\u0442: Fullstack Developer \u2014 Ozon", timestamp="2026-06-05T09:00:00"),
            ActivityLogEntryResponse(id="a4", type="sync", description="\u0420\u0435\u0437\u044e\u043c\u0435 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u044b \u0441 HH.ru", timestamp="2026-06-03T10:00:00"),
            ActivityLogEntryResponse(id="a5", type="auth", description="\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f HH.ru \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430", timestamp="2026-06-02T08:00:00"),
        ]

    return StatsResponse(
        stats=stats,
        chartData=chart_data,
        activityLog=activity_log,
    ).model_dump(by_alias=True)
