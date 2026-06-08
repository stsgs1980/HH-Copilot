"""Application mode and apply handler."""

import json
import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import (
    apply_mode_keyboard,
    confirm_keyboard,
    main_menu_keyboard,
    resumes_keyboard,
)
from src.bot.states.states import ApplyStates

logger = logging.getLogger(__name__)

router = Router()


@router.callback_query(F.data == "apply_mode")
async def cq_apply_mode(callback: CallbackQuery, state: FSMContext) -> None:
    """Show application mode selection."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)
        current_mode = user.apply_mode if user else "semi_auto"

    await callback.message.edit_text(
        "Режим откликов\n\n"
        "• **Авто** — бот автоматически откликается на подходящие вакансии\n"
        "• **Полуавто** — бот предлагает вакансии, вы подтверждаете\n"
        "• **Ручной** — вы сами выбираете каждую вакансию\n\n"
        f"Текущий режим: **{current_mode}**",
        reply_markup=apply_mode_keyboard(current_mode),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("mode_"))
async def cq_set_mode(callback: CallbackQuery, state: FSMContext) -> None:
    """Set application mode."""
    mode = callback.data.replace("mode_", "")

    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        await user_repo.set_apply_mode(callback.from_user.id, mode)
        await session.commit()

    mode_names = {"auto": "Авто", "semi_auto": "Полуавто", "manual": "Ручной"}
    await callback.message.edit_text(
        f"[OK] Режим изменен на: **{mode_names.get(mode, mode)}**",
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("apply_"))
async def cq_apply(callback: CallbackQuery, state: FSMContext) -> None:
    """Apply to a specific vacancy."""
    vacancy_id_str = callback.data.replace("apply_", "")

    try:
        vacancy_id = int(vacancy_id_str)
    except ValueError:
        await callback.answer("❌ Неверный ID вакансии", show_alert=True)
        return

    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository, ResumeRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user or not user.hh_access_token:
            await callback.answer("❌ Требуется авторизация!", show_alert=True)
            return

        # Get user's resumes
        resume_repo = ResumeRepository(session)
        resumes = await resume_repo.get_by_user(user.id)

    if not resumes:
        await callback.answer("❌ Сначала загрузите резюме!", show_alert=True)
        return

    if len(resumes) == 1:
        # Auto-select the only resume
        await _do_apply(callback, state, vacancy_id, resumes[0].hh_resume_id)
    else:
        # Let user choose resume
        resume_list = [(r.hh_resume_id, r.title) for r in resumes]
        await state.update_data(pending_vacancy_id=vacancy_id)
        await callback.message.edit_text(
            "Выберите резюме для отклика:",
            reply_markup=resumes_keyboard(resume_list),
        )
        await state.set_state(ApplyStates.selecting_resume_for_apply)


@router.callback_query(F.data.startswith("sel_res_"), ApplyStates.selecting_resume_for_apply)
async def cq_select_resume_for_apply(callback: CallbackQuery, state: FSMContext) -> None:
    """Resume selected for application."""
    resume_id = callback.data.replace("sel_res_", "")
    data = await state.get_data()
    vacancy_id = data.get("pending_vacancy_id")

    if not vacancy_id:
        await callback.answer("❌ Ошибка: вакансия не найдена", show_alert=True)
        return

    await _do_apply(callback, state, vacancy_id, resume_id)


async def _do_apply(callback: CallbackQuery, state: FSMContext, vacancy_id: int, resume_id: str) -> None:
    """Execute the actual application."""
    await callback.message.edit_text("[PROCESSING] Отклик на вакансию...")

    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.hybrid_client import HybridHHClient
        from src.services.negotiation_service import NegotiationService
        from src.services.rate_limiter import RateLimiter
        from src.ai.cover_letter import CoverLetterGenerator

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_by_telegram_id(callback.from_user.id)

            hh_client = HybridHHClient(
                access_token=user.hh_access_token,
                refresh_token=user.hh_refresh_token,
                user_id=user.id,
            )
            await hh_client.initialize()

            rate_limiter = RateLimiter(daily_limit=user.settings.daily_reply_limit if user.settings else 50)
            letter_gen = CoverLetterGenerator()

            neg_service = NegotiationService(
                session=session,
                hh_client=hh_client,
                rate_limiter=rate_limiter,
                letter_generator=letter_gen,
            )

            result = await neg_service.apply_to_vacancy(
                user_id=user.id,
                vacancy_id=vacancy_id,
                resume_id=resume_id,
            )
            await session.commit()
            await hh_client.close()

        if result.get("success"):
            method = result.get("method", "unknown")
            method_text = "через API" if method == "api" else "через браузер"
            await callback.message.edit_text(
                f"[OK] Отклик отправлен ({method_text})!",
                reply_markup=main_menu_keyboard(is_authorized=True),
            )
        else:
            error = result.get("error", "unknown")
            if error == "already_applied":
                await callback.message.edit_text(
                    "[INFO] Вы уже откликались на эту вакансию.",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )
            elif error == "daily_limit_reached":
                await callback.message.edit_text(
                    "[WARNING] Дневной лимит откликов исчерпан.",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )
            else:
                await callback.message.edit_text(
                    f"[ERROR] Ошибка отклика: {error}",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )

    except Exception as e:
        logger.error("Apply failed: %s", e)
        await callback.message.edit_text(
            f"[ERROR] Ошибка: {str(e)[:100]}",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )


@router.callback_query(F.data == "apply_all")
async def cq_apply_all(callback: CallbackQuery, state: FSMContext) -> None:
    """Apply to all suitable vacancies."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository, ResumeRepository, VacancyRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user or not user.is_authorized:
            await callback.answer("❌ Сначала авторизуйтесь!", show_alert=True)
            return

        resume_repo = ResumeRepository(session)
        resumes = await resume_repo.get_by_user(user.id)

        vacancy_repo = VacancyRepository(session)
        vacancies = await vacancy_repo.get_by_user(user.id, status="new", limit=50)

    if not resumes:
        await callback.answer("❌ Сначала загрузите резюме!", show_alert=True)
        return

    suitable = [v for v in vacancies if v.match_score >= (user.min_match_score if user else 70)]
    if not suitable:
        await callback.answer("📭 Нет подходящих вакансий", show_alert=True)
        return

    vacancy_ids = [v.id for v in suitable]
    resume_id = resumes[0].hh_resume_id

    await callback.message.edit_text(
        f"[PROCESSING] Массовый отклик на {len(suitable)} вакансий...\n"
        "Это может занять некоторое время.",
    )

    try:
        from src.hh.hybrid_client import HybridHHClient
        from src.services.negotiation_service import NegotiationService
        from src.services.rate_limiter import RateLimiter
        from src.ai.cover_letter import CoverLetterGenerator

        async with async_session_factory() as session:
            user = await UserRepository(session).get_by_telegram_id(callback.from_user.id)
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

            results = await neg_service.batch_apply(
                user_id=user.id,
                vacancy_ids=vacancy_ids,
                resume_id=resume_id,
            )
            await session.commit()
            await hh_client.close()

        await callback.message.edit_text(
            f"[RESULTS] Результаты массового отклика:\n\n"
            f"[OK] Успешно: {results['applied']}\n"
            f"[SKIPPED] Пропущено: {results['skipped']}\n"
            f"[ERROR] Ошибки: {results['failed']}",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )

    except Exception as e:
        logger.error("Batch apply failed: %s", e)
        await callback.message.edit_text(
            f"❌ Ошибка: {str(e)[:100]}",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )
