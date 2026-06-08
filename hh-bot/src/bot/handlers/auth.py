"""Authorization handler — HH.ru OAuth flow."""

import logging
from datetime import datetime, timezone

from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext

from src.bot.keyboards.inline import auth_keyboard, main_menu_keyboard
from src.bot.states.states import AuthStates
from src.config import get_settings

logger = logging.getLogger(__name__)

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    """Handle /start command."""
    await state.clear()

    settings = get_settings()
    auth = __import__("src.hh.auth", fromlist=["HHAuth"]).HHAuth()
    auth_url, _ = auth.get_auth_url(message.from_user.id)

    await message.answer(
        "[WELCOME] Добро пожаловать в HH Bot!\n\n"
        "Я помогу вам автоматически находить и откликаться на релевантные "
        "вакансии с HH.ru.\n\n"
        "Для начала работы необходимо авторизоваться на HH.ru.",
        reply_markup=auth_keyboard(auth_url),
    )


@router.callback_query(F.data == "auth")
async def cq_auth(callback: CallbackQuery, state: FSMContext) -> None:
    """Handle authorization button click."""
    auth = __import__("src.hh.auth", fromlist=["HHAuth"]).HHAuth()
    auth_url, _ = auth.get_auth_url(callback.from_user.id)

    await callback.message.edit_text(
        "[AUTH] Для авторизации на HH.ru:\n\n"
        "1. Нажмите кнопку ниже\n"
        "2. Войдите в аккаунт HH.ru\n"
        "3. Скопируйте код авторизации\n"
        "4. Отправьте код мне в чат\n\n"
        "[INFO] Код действителен 10 минут.",
        reply_markup=auth_keyboard(auth_url),
    )
    await state.set_state(AuthStates.waiting_for_code)
    await callback.answer()


@router.message(AuthStates.waiting_for_code, F.text)
async def process_auth_code(message: Message, state: FSMContext) -> None:
    """Process the authorization code from user."""
    code = message.text.strip()
    if len(code) < 10:
        await message.answer("[ERROR] Код слишком короткий. Пожалуйста, отправьте полный код авторизации.")
        return

    await state.set_state(AuthStates.authorizing)
    await message.answer("[PROCESSING] Авторизация...")

    try:
        # Import here to avoid circular imports
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.hybrid_client import HybridHHClient

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_or_create(message.from_user.id)

            hh_client = HybridHHClient(user_id=message.from_user.id)
            await hh_client.initialize()

            token_data = await hh_client.exchange_code(code, message.from_user.id)

            expires_at = datetime.fromtimestamp(
                token_data.get("created_at", 0) + token_data.get("expires_in", 0),
                tz=timezone.utc,
            )

            await user_repo.update_tokens(
                message.from_user.id,
                access_token=token_data["access_token"],
                refresh_token=token_data["refresh_token"],
                expires_at=expires_at,
            )
            await session.commit()

            await hh_client.close()

        await state.clear()
        await message.answer(
            "[OK] Авторизация успешна!\n\n"
            "Теперь вы можете:\n"
            "• Загрузить резюме\n"
            "• Искать вакансии\n"
            "• Настраивать автоматические отклики",
            reply_markup=main_menu_keyboard(is_authorized=True),
        )

    except Exception as e:
        logger.error("Authorization failed: %s", e)
        await state.set_state(AuthStates.waiting_for_code)
        await message.answer(
            "[ERROR] Ошибка авторизации. Пожалуйста, попробуйте снова.\n"
            f"Ошибка: {str(e)[:100]}"
        )


@router.message(Command("logout"))
async def cmd_logout(message: Message, state: FSMContext) -> None:
    """Handle /logout command."""
    await state.clear()
    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_by_telegram_id(message.from_user.id)
            if user:
                user.is_authorized = False
                user.hh_access_token = None
                user.hh_refresh_token = None
                await session.commit()

    except Exception as e:
        logger.error("Logout failed: %s", e)

    await message.answer(
        "[LOGOUT] Вы вышли из аккаунта HH.ru.\n"
        "Для повторной авторизации используйте /start",
    )
