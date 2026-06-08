"""Main application entry point."""

import asyncio
import logging

from loguru import logger


async def run() -> None:
    """Run the bot."""
    from scripts.run_bot import main as run_bot

    await run_bot()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run())
