"""Vacancy search and browsing handler."""

import json
import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import (
    main_menu_keyboard,
    vacancies_list_keyboard,
    vacancy_keyboard,
)
from src.bot.states.states import SearchStates, ApplyStates

logger = logging.getLogger(__name__)

router = Router()


@router.callback_query(F.data == "search")
async def cq_search(callback: CallbackQuery, state: FSMContext) -> None:
    """Show search configuration."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user or not user.is_authorized:
            await callback.answer("❌ Сначала авторизуйтесь!", show_alert=True)
            return

    await callback.message.edit_text(
        "🔍 Поиск вакансий\n\n"
        "Отправьте поисковый запрос (например, 'Python разработчик'):",
    )
    await state.set_state(SearchStates.setting_query)
    await callback.answer()


@router.message(SearchStates.setting_query, F.text)
async def process_search_query(message: Message, state: FSMContext) -> None:
    """Process search query and start search."""
    query = message.text.strip()
    await state.update_data(search_query=query)
    await message.answer("🔄 Ищу вакансии...")

    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository, VacancyRepository
        from src.hh.hybrid_client import HybridHHClient
        from src.matching.engine import MatchingEngine
        from src.services.resume_service import ResumeService
        from src.services.vacancy_service import VacancyService

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_by_telegram_id(message.from_user.id)

            if not user or not user.hh_access_token:
                await message.answer("❌ Требуется авторизация!")
                return

            # Build search params
            search_params = VacancyService.build_search_params(
                area=1,  # Default: Moscow
                text=query,
                career_direction=user.career_direction or "",
            )

            # Search via hybrid client
            hh_client = HybridHHClient(
                access_token=user.hh_access_token,
                refresh_token=user.hh_refresh_token,
                user_id=user.id,
            )
            await hh_client.initialize()

            vacancies = await hh_client.search_vacancies(search_params)

            if not vacancies:
                await message.answer(
                    "😔 По вашему запросу ничего не найдено. Попробуйте другой запрос.",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )
                await hh_client.close()
                return

            # Get resume for matching
            resume_service = ResumeService(session)
            skills = await resume_service.get_resume_skills(user.id)
            exp_text = await resume_service.get_resume_experience_text(user.id)

            from src.hh.models import HHResume
            dummy_resume = HHResume(skills=skills, experience=[], position="")

            # Score vacancies
            engine = MatchingEngine()
            min_score = user.min_match_score
            scored = await engine.score_batch(vacancies, dummy_resume, min_score)

            # Save to database
            vacancy_service = VacancyService(session)
            saved = await vacancy_service.save_vacancies(user.id, [v for v, _ in scored])
            await session.commit()

            await hh_client.close()

        if not scored:
            await message.answer(
                f"🔍 Найдено {len(vacancies)} вакансий, но ни одна не набрала "
                f"порог {min_score}% релевантности.\n\n"
                "Попробуйте изменить запрос или снизить порог в настройках.",
                reply_markup=main_menu_keyboard(is_authorized=True),
            )
            return

        vacancy_list = [(v.id, v.title, v.match_score) for v, _ in scored]
        await state.update_data(vacancies=vacancy_list, current_page=0)

        await message.answer(
            f"🔍 Найдено {len(scored)} подходящих вакансий (из {len(vacancies)}):",
            reply_markup=vacancies_list_keyboard(vacancy_list, page=0),
        )
        await state.set_state(ApplyStates.viewing_vacancy)

    except Exception as e:
        logger.error("Search failed: %s", e)
        await message.answer(
            f"❌ Ошибка поиска: {str(e)[:100]}",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )
        await state.clear()


@router.callback_query(F.data == "suitable")
async def cq_suitable(callback: CallbackQuery, state: FSMContext) -> None:
    """Show suitable (already scored) vacancies."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository, VacancyRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user or not user.is_authorized:
            await callback.answer("❌ Сначала авторизуйтесь!", show_alert=True)
            return

        vacancy_repo = VacancyRepository(session)
        vacancies = await vacancy_repo.get_by_user(user.id, status="new", limit=50)

    suitable = [v for v in vacancies if v.match_score >= (user.min_match_score if user else 70)]

    if not suitable:
        await callback.message.edit_text(
            "📭 Нет подходящих вакансий. Запустите поиск!",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )
        return

    vacancy_list = [(v.id, v.title, v.match_score) for v in suitable]
    await state.update_data(vacancies=vacancy_list, current_page=0)

    await callback.message.edit_text(
        f"📨 Подходящие вакансии ({len(suitable)}):",
        reply_markup=vacancies_list_keyboard(vacancy_list, page=0),
    )
    await state.set_state(ApplyStates.viewing_vacancy)
    await callback.answer()


@router.callback_query(F.data.startswith("view_vac_"))
async def cq_view_vacancy(callback: CallbackQuery, state: FSMContext) -> None:
    """Show vacancy details."""
    vacancy_id = int(callback.data.replace("view_vac_", ""))

    from src.db.database import async_session_factory
    from src.db.repositories import VacancyRepository

    async with async_session_factory() as session:
        repo = VacancyRepository(session)
        vacancy = await session.get(
            __import__("src.db.models", fromlist=["Vacancy"]).Vacancy, vacancy_id
        )

    if not vacancy:
        await callback.answer("❌ Вакансия не найдена", show_alert=True)
        return

    skills = json.loads(vacancy.skills) if vacancy.skills else []
    skills_text = ", ".join(skills[:8]) if skills else "не указаны"

    salary_text = ""
    if vacancy.salary_from:
        salary_text = f"💰 {vacancy.salary_from:,}"
        if vacancy.salary_to:
            salary_text += f" - {vacancy.salary_to:,}"
        salary_text += f" {vacancy.salary_currency}\n"

    text = (
        f"📋 **{vacancy.title}**\n\n"
        f"🏢 {vacancy.company or 'Компания не указана'}\n"
        f"📍 {vacancy.location or 'Не указано'}\n"
        f"{salary_text}"
        f"📅 Опыт: {vacancy.experience or 'не указан'}\n"
        f"🛠 Навыки: {skills_text}\n"
        f"📊 Релевантность: {vacancy.match_score:.0f}%\n\n"
    )

    if vacancy.description:
        text += f"📝 {vacancy.description[:300]}...\n\n"

    await callback.message.edit_text(
        text,
        reply_markup=vacancy_keyboard(vacancy_id, vacancy.match_score, vacancy.status),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("vac_page_"))
async def cq_vacancy_page(callback: CallbackQuery, state: FSMContext) -> None:
    """Paginate through vacancies."""
    page = int(callback.data.replace("vac_page_", ""))
    data = await state.get_data()
    vacancies = data.get("vacancies", [])

    await callback.message.edit_text(
        f"📄 Страница {page + 1}:",
        reply_markup=vacancies_list_keyboard(vacancies, page=page),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("skip_"))
async def cq_skip_vacancy(callback: CallbackQuery, state: FSMContext) -> None:
    """Skip a vacancy."""
    vacancy_id = int(callback.data.replace("skip_", ""))

    from src.db.database import async_session_factory
    from src.db.repositories import VacancyRepository

    async with async_session_factory() as session:
        repo = VacancyRepository(session)
        await repo.update_status(vacancy_id, "skipped")
        await session.commit()

    await callback.message.edit_text("⏭ Вакансия пропущена.")
    # Return to suitable list
    await cq_suitable(callback, state)
