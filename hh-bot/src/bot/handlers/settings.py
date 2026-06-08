"""Settings handler."""

import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import main_menu_keyboard, settings_keyboard
from src.bot.states.states import SettingsStates

logger = logging.getLogger(__name__)

router = Router()


@router.callback_query(F.data == "settings")
async def cq_settings(callback: CallbackQuery, state: FSMContext) -> None:
    """Show settings menu."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)
        settings = user.settings if user else None

    if settings:
        text = (
            "⚙️ Настройки\n\n"
            f"✍️ Стиль писем: {settings.ai_tone}\n"
            f"📊 Лимит откликов/день: {settings.daily_reply_limit}\n"
            f"⏰ Интервал поиска: {settings.search_interval_min} мин\n"
            f"📊 Мин. релевантность: {user.min_match_score}%\n"
            f"🤖 Авто-отклик: {'Вкл' if settings.auto_reply_enabled else 'Выкл'}"
        )
    else:
        text = "⚙️ Настройки\n\nНастройки по умолчанию."

    await callback.message.edit_text(text, reply_markup=settings_keyboard())
    await state.set_state(SettingsStates.main_menu)
    await callback.answer()


@router.callback_query(F.data == "set_tone", SettingsStates.main_menu)
async def cq_set_tone(callback: CallbackQuery, state: FSMContext) -> None:
    """Set AI letter tone."""
    await callback.message.edit_text(
        "✍️ Выберите стиль сопроводительных писем:\n\n"
        "1. professional — профессиональный, деловой\n"
        "2. friendly — дружелюбный, открытый\n"
        "3. formal — строго формальный\n"
        "4. confident — уверенный, энергичный\n"
        "5. concise — краткий, лаконичный\n\n"
        "Отправьте номер или название стиля:",
    )
    await state.set_state(SettingsStates.setting_tone)
    await callback.answer()


@router.message(SettingsStates.setting_tone, F.text)
async def process_tone(message: Message, state: FSMContext) -> None:
    """Process tone selection."""
    tone_map = {
        "1": "professional",
        "2": "friendly",
        "3": "formal",
        "4": "confident",
        "5": "concise",
    }
    tone = tone_map.get(message.text.strip(), message.text.strip().lower())

    from src.db.database import async_session_factory
    from src.db.models import UserSettings
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(message.from_user.id)
        if user and user.settings:
            user.settings.ai_tone = tone
            await session.commit()

    await message.answer(
        f"✅ Стиль писем установлен: {tone}",
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await state.clear()


@router.callback_query(F.data == "set_limit", SettingsStates.main_menu)
async def cq_set_limit(callback: CallbackQuery, state: FSMContext) -> None:
    """Set daily reply limit."""
    await callback.message.edit_text(
        "📊 Введите максимальное количество откликов в день (1-100):",
    )
    await state.set_state(SettingsStates.setting_limit)
    await callback.answer()


@router.message(SettingsStates.setting_limit, F.text)
async def process_limit(message: Message, state: FSMContext) -> None:
    """Process limit selection."""
    try:
        limit = int(message.text.strip())
        if not 1 <= limit <= 100:
            raise ValueError
    except ValueError:
        await message.answer("❌ Введите число от 1 до 100:")
        return

    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(message.from_user.id)
        if user and user.settings:
            user.settings.daily_reply_limit = limit
            await session.commit()

    await message.answer(
        f"✅ Лимит откликов: {limit}/день",
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await state.clear()


@router.callback_query(F.data == "set_interval", SettingsStates.main_menu)
async def cq_set_interval(callback: CallbackQuery, state: FSMContext) -> None:
    """Set search interval."""
    await callback.message.edit_text(
        "⏰ Введите интервал автоматического поиска в минутах (30-1440):",
    )
    await state.set_state(SettingsStates.setting_interval)
    await callback.answer()


@router.message(SettingsStates.setting_interval, F.text)
async def process_interval(message: Message, state: FSMContext) -> None:
    """Process interval selection."""
    try:
        interval = int(message.text.strip())
        if not 30 <= interval <= 1440:
            raise ValueError
    except ValueError:
        await message.answer("❌ Введите число от 30 до 1440:")
        return

    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(message.from_user.id)
        if user and user.settings:
            user.settings.search_interval_min = interval
            await session.commit()

    await message.answer(
        f"✅ Интервал поиска: {interval} мин",
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await state.clear()


@router.callback_query(F.data == "stats")
async def cq_stats(callback: CallbackQuery, state: FSMContext) -> None:
    """Show statistics."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository, VacancyRepository, ActivityLogRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

        if not user:
            await callback.answer("❌ Пользователь не найден", show_alert=True)
            return

        vac_repo = VacancyRepository(session)
        new_vac = await vac_repo.get_by_user(user.id, status="new", limit=1000)
        applied_vac = await vac_repo.get_by_user(user.id, status="applied", limit=1000)

        log_repo = ActivityLogRepository(session)
        recent_logs = await log_repo.get_recent(user.id, limit=10)

    text = (
        "📊 Статистика\n\n"
        f"🆕 Новых вакансий: {len(new_vac)}\n"
        f"✅ Откликов отправлено: {len(applied_vac)}\n"
    )

    if recent_logs:
        text += "\n📝 Последние действия:\n"
        for log in recent_logs[:5]:
            text += f"  • {log.action}: {log.details[:50] if log.details else ''}\n"

    await callback.message.edit_text(
        text,
        reply_markup=main_menu_keyboard(is_authorized=bool(user and user.is_authorized)),
    )
    await callback.answer()


@router.callback_query(F.data == "back_main")
async def cq_back_main(callback: CallbackQuery, state: FSMContext) -> None:
    """Return to main menu."""
    await state.clear()

    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)
        is_auth = bool(user and user.is_authorized)

    await callback.message.edit_text(
        "🏠 Главное меню",
        reply_markup=main_menu_keyboard(is_authorized=is_auth),
    )
    await callback.answer()


@router.callback_query(F.data == "noop")
async def cq_noop(callback: CallbackQuery) -> None:
    """No-op handler for disabled buttons."""
    await callback.answer()
