"""Negotiations (employer chat) handler."""

import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import (
    main_menu_keyboard,
    negotiations_keyboard,
    confirm_keyboard,
)
from src.bot.states.states import NegotiationStates

logger = logging.getLogger(__name__)

router = Router()


@router.callback_query(F.data == "negotiations")
async def cq_negotiations(callback: CallbackQuery, state: FSMContext) -> None:
    """Show list of negotiations."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository, NegotiationRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user or not user.is_authorized:
            await callback.answer("❌ Сначала авторизуйтесь!", show_alert=True)
            return

        neg_repo = NegotiationRepository(session)
        negotiations = await neg_repo.get_by_user(user.id, limit=20)

    if not negotiations:
        await callback.message.edit_text(
            "💬 У вас пока нет откликов и переписки.",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )
        return

    neg_list = [(n.id, n.vacancy_title or "Без названия", n.employer_name or "Компания", n.has_unread) for n in negotiations]
    await callback.message.edit_text(
        f"💬 Переписка ({len(negotiations)}):",
        reply_markup=negotiations_keyboard(neg_list),
    )
    await state.set_state(NegotiationStates.viewing_negotiations)
    await callback.answer()


@router.callback_query(F.data.startswith("neg_"), NegotiationStates.viewing_negotiations)
async def cq_view_negotiation(callback: CallbackQuery, state: FSMContext) -> None:
    """View a specific negotiation thread."""
    neg_id = int(callback.data.replace("neg_", ""))

    from src.db.database import async_session_factory
    from src.db.repositories import NegotiationRepository
    from src.db.models import Negotiation

    async with async_session_factory() as session:
        negotiation = await session.get(Negotiation, neg_id)

    if not negotiation:
        await callback.answer("❌ Переписка не найдена", show_alert=True)
        return

    text = (
        f"💬 **{negotiation.vacancy_title or 'Вакансия'}**\n"
        f"🏢 {negotiation.employer_name or 'Компания'}\n"
        f"📌 Статус: {negotiation.state}\n\n"
    )

    if negotiation.last_message:
        text += f"Последнее сообщение:\n{negotiation.last_message[:200]}\n\n"

    text += "Отправьте ответное сообщение:"

    await state.update_data(current_negotiation_id=neg_id)
    await callback.message.edit_text(text)
    await state.set_state(NegotiationStates.composing_message)
    await callback.answer()


@router.message(NegotiationStates.composing_message, F.text)
async def process_message(message: Message, state: FSMContext) -> None:
    """Send message in negotiation thread."""
    data = await state.get_data()
    neg_id = data.get("current_negotiation_id")

    if not neg_id:
        await message.answer("❌ Ошибка: переписка не выбрана")
        return

    await message.answer("📤 Отправка сообщения...")

    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.hybrid_client import HybridHHClient
        from src.services.negotiation_service import NegotiationService
        from src.services.rate_limiter import RateLimiter
        from src.ai.cover_letter import CoverLetterGenerator

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_by_telegram_id(message.from_user.id)

            hh_client = HybridHHClient(
                access_token=user.hh_access_token,
                refresh_token=user.hh_refresh_token,
                user_id=user.id,
            )
            await hh_client.initialize()

            neg_service = NegotiationService(
                session=session,
                hh_client=hh_client,
                rate_limiter=RateLimiter(),
                letter_generator=CoverLetterGenerator(),
            )

            result = await neg_service.send_message(
                user_id=user.id,
                negotiation_id=neg_id,
                message=message.text,
            )
            await session.commit()
            await hh_client.close()

        if result.get("success"):
            await message.answer(
                "✅ Сообщение отправлено!",
                reply_markup=main_menu_keyboard(is_authorized=True),
            )
        else:
            await message.answer(
                f"❌ Ошибка отправки: {result.get('error', 'unknown')}",
                reply_markup=main_menu_keyboard(is_authorized=True),
            )

    except Exception as e:
        logger.error("Send message failed: %s", e)
        await message.answer(f"❌ Ошибка: {str(e)[:100]}")

    await state.clear()
