"""Celery application configuration and tasks."""

import asyncio
import json
import logging
from datetime import datetime

from celery import Celery
from celery.schedules import crontab

from src.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

celery_app = Celery(
    "hh_bot",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# === Periodic task schedule ===

celery_app.conf.beat_schedule = {
    "search-vacancies-periodic": {
        "task": "src.worker.tasks.periodic_vacancy_search",
        "schedule": crontab(minute="*/30"),  # Every 30 minutes
    },
    "check-negotiations": {
        "task": "src.worker.tasks.check_new_negotiations",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
    },
    "refresh-expired-tokens": {
        "task": "src.worker.tasks.refresh_expired_tokens",
        "schedule": crontab(minute="0", hour="*/2"),  # Every 2 hours
    },
}
