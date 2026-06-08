"""Resume management handler."""

import json
import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import main_menu_keyboard, resumes_keyboard
from src.bot.states.states import ResumeStates

logger = logging.getLogger(__name__)

router = Router()


@router.callback_query(F.data == "resumes")
async def cq_resumes(callback: CallbackQuery, state: FSMContext) -> None:
    """Show user's resumes."""
    from src.db.database import async_session_factory
    from src.db.repositories import ResumeRepository, UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user or not user.is_authorized:
            await callback.answer("❌ Сначала авторизуйтесь!", show_alert=True)
            return

        resume_repo = ResumeRepository(session)
        resumes = await resume_repo.get_by_user(user.id)

    if not resumes:
        await callback.message.edit_text(
            "📋 У вас пока нет загруженных резюме.\n\n"
            "Нажмите кнопку ниже, чтобы загрузить резюме с HH.ru.",
            reply_markup=__import__("src.bot.keyboards.inline", fromlist=["confirm_keyboard"]).confirm_keyboard(
                "sync_resumes", "back_main"
            ),
        )
    else:
        resume_list = [(r.hh_resume_id, r.title) for r in resumes]
        await callback.message.edit_text(
            f"📋 Ваши резюме ({len(resumes)}):",
            reply_markup=resumes_keyboard(resume_list),
        )

    await callback.answer()


@router.callback_query(F.data == "sync_resumes")
async def cq_sync_resumes(callback: CallbackQuery, state: FSMContext) -> None:
    """Sync resumes from HH.ru."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository
    from src.hh.hybrid_client import HybridHHClient
    from src.services.resume_service import ResumeService

    await callback.message.edit_text("🔄 Загрузка резюме с HH.ru...")

    try:
        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_by_telegram_id(callback.from_user.id)

            if not user or not user.hh_access_token:
                await callback.message.edit_text("❌ Требуется авторизация!")
                return

            hh_client = HybridHHClient(
                access_token=user.hh_access_token,
                refresh_token=user.hh_refresh_token,
                user_id=user.id,
            )
            await hh_client.initialize()

            # Get resumes from HH.ru
            hh_resumes = await hh_client.get_resumes()

            # Sync to database
            resume_service = ResumeService(session)
            synced = await resume_service.sync_resumes_from_hh(user, hh_resumes)
            await session.commit()

            await hh_client.close()

        resume_list = [(r.hh_resume_id, r.title) for r in synced]
        await callback.message.edit_text(
            f"✅ Загружено {len(synced)} резюме:",
            reply_markup=resumes_keyboard(resume_list),
        )

    except Exception as e:
        logger.error("Resume sync failed: %s", e)
        await callback.message.edit_text(
            f"❌ Ошибка загрузки резюме: {str(e)[:100]}",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )


@router.callback_query(F.data.startswith("sel_res_"))
async def cq_select_resume(callback: CallbackQuery, state: FSMContext) -> None:
    """Show resume details."""
    resume_id = callback.data.replace("sel_res_", "")

    from src.db.database import async_session_factory
    from src.db.repositories import ResumeRepository

    async with async_session_factory() as session:
        repo = ResumeRepository(session)
        resume = await repo.get_by_hh_id(resume_id)

    if not resume:
        await callback.answer("❌ Резюме не найдено", show_alert=True)
        return

    skills = json.loads(resume.skills) if resume.skills else []
    skills_text = ", ".join(skills[:10]) if skills else "не указаны"

    salary_text = ""
    if resume.salary_from:
        salary_text = f"💰 Зарплата: {resume.salary_from:,}"
        if resume.salary_to:
            salary_text += f" - {resume.salary_to:,}"
        salary_text += f" {resume.salary_currency}\n"

    text = (
        f"📋 **{resume.title}**\n\n"
        f"📍 Город: {resume.city or 'не указан'}\n"
        f"{salary_text}"
        f"🛠 Навыки: {skills_text}\n"
        f"📝 О себе: {resume.about[:200] if resume.about else 'не указано'}\n\n"
        f"🆔 ID: {resume.hh_resume_id}"
    )

    await callback.message.edit_text(
        text,
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await callback.answer()
