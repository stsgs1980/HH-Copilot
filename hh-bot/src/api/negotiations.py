"""Negotiation API router — messages, auto-reply, sync."""

from __future__ import annotations

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import (
    NegotiationResponse,
    NegotiationMessageResponse,
    SendMessageRequest,
    SuccessResponse,
)
from src.db.database import get_session
from src.db.models import Negotiation, User, Vacancy, ActivityLog
from src.db.repositories import NegotiationRepository, UserRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/negotiations", tags=["negotiations"])


async def _get_user(session: AsyncSession) -> User:
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)
    if not user:
        user = await user_repo.create(telegram_id=0)
    return user


def _negotiation_to_response(neg: Negotiation) -> NegotiationResponse:
    # For now, messages are stored in raw_data or we generate placeholder messages
    messages = []
    if neg.raw_data:
        try:
            raw = json.loads(neg.raw_data)
            messages = [
                NegotiationMessageResponse(
                    id=f"m{neg.id}-{i}",
                    sender=m.get("sender", "employer"),
                    text=m.get("text", ""),
                    timestamp=m.get("timestamp", ""),
                    isAutoReply=m.get("is_auto_reply", False),
                )
                for i, m in enumerate(raw.get("messages", []))
            ]
        except (json.JSONDecodeError, TypeError):
            pass

    # Generate a placeholder message from last_message if no messages exist
    if not messages and neg.last_message:
        messages = [
            NegotiationMessageResponse(
                id=f"m{neg.id}-0",
                sender="employer",
                text=neg.last_message,
                timestamp=neg.last_message_at.isoformat() if neg.last_message_at else "",
                isAutoReply=False,
            )
        ]

    return NegotiationResponse(
        id=str(neg.hh_negotiation_id),
        vacancyTitle=neg.vacancy_title or "",
        company=neg.employer_name or "",
        employerName=neg.employer_name or "",
        status="active" if neg.state == "response" else neg.state,
        unread=1 if neg.has_unread else 0,
        lastMessage=neg.last_message or "",
        lastMessageTime=neg.last_message_at.isoformat() if neg.last_message_at else "",
        autoReply=False,
        messages=messages,
    )


@router.get("", response_model=dict)
async def get_negotiations(session: AsyncSession = Depends(get_session)):
    """Get all negotiations for the dashboard user."""
    user = await _get_user(session)
    neg_repo = NegotiationRepository(session)
    negotiations = await neg_repo.get_by_user(user.id)

    return {
        "negotiations": [_negotiation_to_response(n) for n in negotiations]
    }


@router.post("/{negotiation_id}/message", response_model=dict)
async def send_message(
    negotiation_id: str,
    data: SendMessageRequest,
    session: AsyncSession = Depends(get_session),
):
    """Send a message in a negotiation thread via Playwright.

    Saves the message to DB and also sends it via browser automation
    if the user is authenticated on HH.ru.
    """
    user = await _get_user(session)

    # Find negotiation by hh_negotiation_id
    result = await session.execute(
        select(Negotiation).where(Negotiation.hh_negotiation_id == negotiation_id)
    )
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    # Update last message in DB
    neg.last_message = data.text
    neg.last_message_at = datetime.utcnow()
    neg.has_unread = False

    # Append message to raw_data
    messages = []
    if neg.raw_data:
        try:
            raw = json.loads(neg.raw_data)
            messages = raw.get("messages", [])
        except (json.JSONDecodeError, TypeError):
            pass

    messages.append({
        "sender": "bot" if data.is_auto_reply else "me",
        "text": data.text,
        "timestamp": datetime.utcnow().isoformat(),
        "is_auto_reply": data.is_auto_reply,
    })

    neg.raw_data = json.dumps({"messages": messages}, ensure_ascii=False)

    # Try to send via Playwright if user has cookies
    browser_sent = False
    if user.hh_cookies:
        try:
            from src.hh.hybrid_client import HybridHHClient

            hh_client = HybridHHClient(
                user_id=user.id,
                cookies_json=user.hh_cookies,
            )
            try:
                send_result = await hh_client.send_message(
                    negotiation_id=negotiation_id,
                    message=data.text,
                )
                browser_sent = send_result.get("success", False)
            finally:
                await hh_client.close()
        except Exception as e:
            logger.warning("Playwright message send failed for negotiation %s: %s", negotiation_id, e)

    # Log activity
    activity = ActivityLog(
        user_id=user.id,
        action="message_sent",
        details=f"Сообщение отправлено в переписку {negotiation_id}" + (" (через браузер)" if browser_sent else " (сохранено локально)"),
    )
    session.add(activity)
    await session.flush()

    return {
        "success": True,
        "messageId": f"m{neg.id}-{len(messages)}",
        "browserSent": browser_sent,
    }


@router.post("/{negotiation_id}/toggle-auto-reply", response_model=dict)
async def toggle_auto_reply(
    negotiation_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Toggle auto-reply for a negotiation."""
    result = await session.execute(
        select(Negotiation).where(Negotiation.hh_negotiation_id == negotiation_id)
    )
    neg = result.scalar_one_or_none()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    # We store auto_reply state in raw_data
    auto_reply = False
    if neg.raw_data:
        try:
            raw = json.loads(neg.raw_data)
            auto_reply = raw.get("auto_reply", False)
        except (json.JSONDecodeError, TypeError):
            pass

    new_auto_reply = not auto_reply
    raw_data = {}
    if neg.raw_data:
        try:
            raw_data = json.loads(neg.raw_data)
        except (json.JSONDecodeError, TypeError):
            pass
    raw_data["auto_reply"] = new_auto_reply
    neg.raw_data = json.dumps(raw_data, ensure_ascii=False)
    await session.flush()

    return {"success": True}
