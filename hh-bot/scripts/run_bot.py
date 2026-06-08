"""Entry point for running the Telegram bot."""

import asyncio
import logging
import sys

from loguru import logger


async def main() -> None:
    """Start the Telegram bot."""
    from src.bot.dispatcher import create_bot, create_dispatcher, on_startup, on_shutdown
    from src.config import get_settings

    settings = get_settings()

    if not settings.bot_token:
        logger.error("BOT_TOKEN is not set! Check your .env file.")
        sys.exit(1)

    bot = create_bot()
    dp = create_dispatcher()

    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    logger.info("Starting HH Bot polling...")
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
