"""Test fixtures and configuration."""

import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_settings():
    """Mock application settings."""
    from src.config import Settings
    return Settings(
        bot_token="test_token",
        hh_client_id="test_client_id",
        hh_client_secret="test_client_secret",
        openai_api_key="test_openai_key",
        database_url="sqlite+aiosqlite:///./test_data.db",
    )


@pytest.fixture
def sample_vacancy():
    """Sample vacancy data."""
    from src.hh.models import HHVacancy
    return HHVacancy(
        id="12345678",
        title="Python Developer",
        company="Test Company",
        salary_from=150000,
        salary_to=250000,
        salary_currency="RUR",
        location="Москва",
        experience="3-6 лет",
        skills=["Python", "Django", "PostgreSQL", "Docker", "Git"],
        description="Требуется Python разработчик с опытом работы...",
        url="https://hh.ru/vacancy/12345678",
    )


@pytest.fixture
def sample_resume():
    """Sample resume data."""
    from src.hh.models import HHResume
    return HHResume(
        id="resume_001",
        title="Python Developer",
        position="Middle Python Developer",
        salary_from=200000,
        salary_currency="RUR",
        skills=["Python", "Django", "FastAPI", "PostgreSQL", "Docker", "Redis", "Git"],
        experience=[
            {
                "company": "Previous Company",
                "position": "Python Developer",
                "description": "Разработка backend-сервисов",
                "start_date": "2021-01",
                "end_date": "По настоящее время",
            }
        ],
        education=[
            {
                "name": "Информатика и вычислительная техника",
                "organization": "МГУ",
                "year": "2020",
            }
        ],
        city="Москва",
    )
