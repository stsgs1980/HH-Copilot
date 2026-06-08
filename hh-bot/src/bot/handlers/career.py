"""Career direction change handler."""

import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import main_menu_keyboard, confirm_keyboard
from src.bot.states.states import CareerStates

logger = logging.getLogger(__name__)

router = Router()


@router.callback_query(F.data == "career")
async def cq_career(callback: CallbackQuery, state: FSMContext) -> None:
    """Show career direction change UI."""
    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_telegram_id(callback.from_user.id)

    current_direction = user.career_direction if user else None

    text = "🔄 Смена карьерного направления\n\n"
    if current_direction:
        text += f"Текущее направление: **{current_direction}**\n\n"
    text += (
        "Эта функция позволяет искать вакансии в новой сфере, "
        "сохраняя ваши текущие навыки и опыт.\n\n"
        "Бот будет:\n"
        "• Подсвечивать переносимые навыки (transferable skills)\n"
        "• Адаптировать сопроводительные письма\n"
        "• Искать вакансии с учётом нового направления\n\n"
        "Введите новое карьерное направление:"
    )

    await callback.message.edit_text(text)
    await state.set_state(CareerStates.setting_direction)
    await callback.answer()


@router.message(CareerStates.setting_direction, F.text)
async def process_career_direction(message: Message, state: FSMContext) -> None:
    """Process new career direction."""
    direction = message.text.strip()

    await state.update_data(new_direction=direction)
    await message.answer(
        f"Новое направление: **{direction}**\n\n"
        "Это будет добавлено как дополнительный фильтр к поиску вакансий, "
        "а AI будет подчёркивать переносимые навыки в сопроводительных письмах.",
        reply_markup=confirm_keyboard("confirm_career", "cancel_career"),
    )
    await state.set_state(CareerStates.confirming_direction)


@router.callback_query(F.data == "confirm_career", CareerStates.confirming_direction)
async def cq_confirm_career(callback: CallbackQuery, state: FSMContext) -> None:
    """Confirm career direction change."""
    data = await state.get_data()
    direction = data.get("new_direction", "")

    from src.db.database import async_session_factory
    from src.db.repositories import UserRepository

    async with async_session_factory() as session:
        user_repo = UserRepository(session)
        await user_repo.set_career_direction(callback.from_user.id, direction)
        await session.commit()

    await state.clear()
    await callback.message.edit_text(
        f"✅ Карьерное направление установлено: **{direction}**\n\n"
        "Теперь поиск вакансий будет учитывать это направление.",
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await callback.answer()


@router.callback_query(F.data == "cancel_career")
async def cq_cancel_career(callback: CallbackQuery, state: FSMContext) -> None:
    """Cancel career direction change."""
    await state.clear()
    await callback.message.edit_text(
        "❌ Изменение направления отменено.",
        reply_markup=main_menu_keyboard(is_authorized=True),
    )
    await callback.answer()
