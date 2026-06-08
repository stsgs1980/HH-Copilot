"""Entry point for running the Celery worker."""

import logging
import sys

from loguru import logger


def main() -> None:
    """Start the Celery worker with beat scheduler."""
    from src.worker.celery_app import celery_app

    logger.info("Starting Celery worker with beat scheduler...")

    argv = [
        "worker",
        "--loglevel=info",
        "--concurrency=2",
        "-Q", "celery",
    ]

    celery_app.start(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
