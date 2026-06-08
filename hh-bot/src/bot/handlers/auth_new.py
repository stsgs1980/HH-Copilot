"""Authorization handler — Playwright-based HH.ru authentication.

This module replaces the old OAuth-based auth.py with Playwright authentication.
"""

import logging
import base64

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

    await message.answer(
        "[WELCOME] Добро пожаловать в HH Bot!\n\n"
        "Я помогу вам автоматически находить и откликаться на релевантные "
        "вакансии с HH.ru.\n\n"
        "Для начала работы необходимо авторизоваться на HH.ru через Playwright.\n\n"
        "Для авторизации мне понадобятся:\n"
        "- Email от аккаунта HH.ru\n"
        "- Пароль\n"
        "- (Опционально) Код из SMS/Email, если включена 2FA",
        reply_markup=auth_keyboard(None),
    )
    await state.set_state(AuthStates.waiting_for_email)


@router.callback_query(F.data == "auth")
async def cq_auth(callback: CallbackQuery, state: FSMContext) -> None:
    """Handle authorization button click."""
    await callback.message.edit_text(
        "[AUTH] Введите ваш email от аккаунта HH.ru:",
    )
    await state.set_state(AuthStates.waiting_for_email)
    await callback.answer()


@router.message(AuthStates.waiting_for_email, F.text)
async def process_email(message: Message, state: FSMContext) -> None:
    """Process email input."""
    email = message.text.strip()
    if "@" not in email:
        await message.answer("[ERROR] Некорректный email. Пожалуйста, введите действительный email.")
        return

    await state.update_data(auth_email=email)
    await message.answer(
        f"[OK] Email сохранен: {email}\n\n"
        "Теперь введите ваш пароль от аккаунта HH.ru:"
    )
    await state.set_state(AuthStates.waiting_for_password)


@router.message(AuthStates.waiting_for_password, F.text)
async def process_password(message: Message, state: FSMContext) -> None:
    """Process password input and start Playwright login."""
    password = message.text.strip()
    if not password:
        await message.answer("[ERROR] Пароль не может быть пустым.")
        return

    data = await state.get_data()
    email = data.get("auth_email")
    
    if not email:
        await message.answer("[ERROR] Ошибка состояния. Попробуйте /start")
        await state.clear()
        return

    await state.set_state(AuthStates.authorizing)
    await message.answer("[PROCESSING] Запускаю авторизацию через браузер...\nЭто может занять 30-60 секунд.")

    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.browser_auth import HHBrowserAuth

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_or_create(message.from_user.id)

            # Start Playwright login
            auth = HHBrowserAuth()
            result = await auth.start_login(user.id, email, password)

            # Handle different login states
            login_state = result.get("state")

            if login_state == "success":
                # Login successful
                await auth.save_cookies_to_db(user.id, session)
                await auth.cleanup_session(user.id)
                await session.commit()

                await state.clear()
                await message.answer(
                    "[OK] Авторизация успешна!\n\n"
                    "Теперь вы можете:\n"
                    "[LIST] Загрузить резюме\n"
                    "[LIST] Искать вакансии\n"
                    "[LIST] Настраивать автоматические отклики",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )

            elif login_state == "captcha_required":
                # CAPTCHA detected
                await state.update_data(auth_email=email, auth_password=password)
                
                # Send CAPTCHA image if available
                screenshot_b64 = result.get("screenshot", "")
                if screenshot_b64:
                    try:
                        import io
                        from aiogram.types import BufferedInputFile
                        
                        screenshot_bytes = base64.b64decode(screenshot_b64)
                        await message.answer_photo(
                            BufferedInputFile(screenshot_bytes, filename="captcha.png"),
                            caption="[CAPTCHA] Обнаружена CAPTCHA. Введите текст с картинки:"
                        )
                    except Exception as e:
                        logger.error("Failed to send CAPTCHA image: %s", e)
                        await message.answer("[CAPTCHA] Обнаружена CAPTCHA (не удалось показать изображение).")
                
                await message.answer("Введите текст с CAPTCHA изображения:")
                await state.set_state(AuthStates.waiting_for_captcha)

            elif login_state == "two_fa_required":
                # 2FA required
                await state.update_data(auth_email=email, auth_password=password)
                
                # Send screenshot if available
                screenshot_b64 = result.get("screenshot", "")
                if screenshot_b64:
                    try:
                        import io
                        from aiogram.types import BufferedInputFile
                        
                        screenshot_bytes = base64.b64decode(screenshot_b64)
                        await message.answer_photo(
                            BufferedInputFile(screenshot_bytes, filename="2fa.png"),
                            caption="[2FA] Требуется код подтверждения"
                        )
                    except Exception as e:
                        logger.error("Failed to send 2FA screenshot: %s", e)
                
                await message.answer(
                    "[2FA] Требуется код подтверждения.\n"
                    "Введите код из SMS или email:"
                )
                await state.set_state(AuthStates.waiting_for_2fa)

            else:
                # Login failed
                error_msg = result.get("error", "Неизвестная ошибка")
                await state.clear()
                await message.answer(
                    f"[ERROR] Авторизация не удалась: {error_msg}\n\n"
                    "Попробуйте снова с /start",
                    reply_markup=auth_keyboard(None),
                )

    except Exception as e:
        logger.error("Authorization failed: %s", e)
        await state.clear()
        await message.answer(
            f"[ERROR] Ошибка авторизации: {str(e)[:100]}\n\n"
            "Попробуйте снова с /start",
            reply_markup=auth_keyboard(None),
        )


@router.message(AuthStates.waiting_for_captcha, F.text)
async def process_captcha(message: Message, state: FSMContext) -> None:
    """Process CAPTCHA solution."""
    captcha_text = message.text.strip()
    if not captcha_text:
        await message.answer("[ERROR] Текст CAPTCHA не может быть пустым.")
        return

    await state.set_state(AuthStates.authorizing)
    await message.answer("[PROCESSING] Проверяю CAPTCHA...")

    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.browser_auth import HHBrowserAuth

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_or_create(message.from_user.id)

            auth = HHBrowserAuth()
            result = await auth.solve_captcha(user.id, captcha_text)

            login_state = result.get("state")

            if login_state == "success":
                await auth.save_cookies_to_db(user.id, session)
                await auth.cleanup_session(user.id)
                await session.commit()

                await state.clear()
                await message.answer(
                    "[OK] Авторизация успешна! CAPTCHA пройдена.",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )

            elif login_state == "captcha_required":
                # Wrong CAPTCHA
                screenshot_b64 = result.get("screenshot", "")
                if screenshot_b64:
                    try:
                        from aiogram.types import BufferedInputFile
                        screenshot_bytes = base64.b64decode(screenshot_b64)
                        await message.answer_photo(
                            BufferedInputFile(screenshot_bytes, filename="captcha.png"),
                            caption="[CAPTCHA] Неверный текст. Попробуйте снова:"
                        )
                    except Exception:
                        pass
                
                await message.answer("[CAPTCHA] Неверный текст. Попробуйте снова:")
                await state.set_state(AuthStates.waiting_for_captcha)

            elif login_state == "two_fa_required":
                # Moved to 2FA
                await state.update_data(auth_state="2fa")
                screenshot_b64 = result.get("screenshot", "")
                if screenshot_b64:
                    try:
                        from aiogram.types import BufferedInputFile
                        screenshot_bytes = base64.b64decode(screenshot_b64)
                        await message.answer_photo(
                            BufferedInputFile(screenshot_bytes, filename="2fa.png"),
                            caption="[2FA] Требуется код подтверждения"
                        )
                    except Exception:
                        pass
                
                await message.answer("[2FA] Теперь введите код из SMS/email:")
                await state.set_state(AuthStates.waiting_for_2fa)

            else:
                # Failed
                error_msg = result.get("error", "Неизвестная ошибка")
                await state.clear()
                await message.answer(
                    f"[ERROR] Ошибка: {error_msg}\n\nПопробуйте снова с /start",
                    reply_markup=auth_keyboard(None),
                )

    except Exception as e:
        logger.error("CAPTCHA processing failed: %s", e)
        await state.clear()
        await message.answer(
            f"[ERROR] Ошибка: {str(e)[:100]}\n\nПопробуйте снова с /start",
            reply_markup=auth_keyboard(None),
        )


@router.message(AuthStates.waiting_for_2fa, F.text)
async def process_2fa(message: Message, state: FSMContext) -> None:
    """Process 2FA code."""
    code = message.text.strip()
    if not code:
        await message.answer("[ERROR] Код не может быть пустым.")
        return

    await state.set_state(AuthStates.authorizing)
    await message.answer("[PROCESSING] Проверяю код...")

    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.browser_auth import HHBrowserAuth

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_or_create(message.from_user.id)

            auth = HHBrowserAuth()
            result = await auth.submit_2fa(user.id, code)

            login_state = result.get("state")

            if login_state == "success":
                await auth.save_cookies_to_db(user.id, session)
                await auth.cleanup_session(user.id)
                await session.commit()

                await state.clear()
                await message.answer(
                    "[OK] Авторизация успешна! 2FA пройдена.",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )

            elif login_state == "two_fa_required":
                # Wrong 2FA code
                await message.answer("[2FA] Неверный код. Попробуйте снова:")
                await state.set_state(AuthStates.waiting_for_2fa)

            else:
                # Failed
                error_msg = result.get("error", "Неизвестная ошибка")
                await state.clear()
                await message.answer(
                    f"[ERROR] Ошибка: {error_msg}\n\nПопробуйте снова с /start",
                    reply_markup=auth_keyboard(None),
                )

    except Exception as e:
        logger.error("2FA processing failed: %s", e)
        await state.clear()
        await message.answer(
            f"[ERROR] Ошибка: {str(e)[:100]}\n\nПопробуйте снова с /start",
            reply_markup=auth_keyboard(None),
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
                user.hh_cookies = None
                await session.commit()

    except Exception as e:
        logger.error("Logout failed: %s", e)

    await message.answer(
        "[LOGOUT] Вы вышли из аккаунта HH.ru.\n"
        "Для повторной авторизации используйте /start",
    )


@router.message(Command("reauth"))
async def cmd_reauth(message: Message, state: FSMContext) -> None:
    """Handle /reauth command - re-authenticate with existing credentials."""
    await state.clear()
    
    try:
        from src.db.database import async_session_factory
        from src.db.repositories import UserRepository
        from src.hh.browser_auth import HHBrowserAuth

        async with async_session_factory() as session:
            user_repo = UserRepository(session)
            user = await user_repo.get_by_telegram_id(message.from_user.id)

            if not user or not user.hh_email:
                await message.answer(
                    "[ERROR] Сохраненные credentials не найдены. Используйте /start для авторизации."
                )
                return

            await message.answer("[PROCESSING] Повторная авторизация с сохраненными credentials...")

            auth = HHBrowserAuth()
            result = await auth.start_login(user.id, user.hh_email, "")

            if result.get("state") == "success":
                await auth.save_cookies_to_db(user.id, session)
                await auth.cleanup_session(user.id)
                await session.commit()

                await message.answer(
                    "[OK] Повторная авторизация успешна!",
                    reply_markup=main_menu_keyboard(is_authorized=True),
                )
            else:
                await message.answer(
                    f"[INFO] Требуется полная авторизация. Используйте /start"
                )

    except Exception as e:
        logger.error("Re-auth failed: %s", e)
        await message.answer(
            f"[ERROR] Ошибка: {str(e)[:100]}"
        )