"""Bot dispatcher setup and startup."""

import logging

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from src.bot.handlers import auth, resume, search, apply, negotiations, career, settings
from src.config import get_settings

logger = logging.getLogger(__name__)


def create_dispatcher() -> Dispatcher:
    """Create and configure aiogram dispatcher with all routers."""
    dp = Dispatcher()

    # Register all handler routers
    dp.include_router(auth.router)
    dp.include_router(resume.router)
    dp.include_router(search.router)
    dp.include_router(apply.router)
    dp.include_router(negotiations.router)
    dp.include_router(career.router)
    dp.include_router(settings.router)

    return dp


def create_bot() -> Bot:
    """Create aiogram Bot instance."""
    settings = get_settings()
    return Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


async def on_startup(bot: Bot) -> None:
    """Startup hook — initialize database and browser pool."""
    logger.info("Starting HH Bot...")

    from src.db.database import init_db
    await init_db()
    logger.info("Database initialized")

    logger.info("HH Bot started successfully")


async def on_shutdown(bot: Bot) -> None:
    """Shutdown hook — cleanup resources."""
    logger.info("Shutting down HH Bot...")
    logger.info("HH Bot stopped")
