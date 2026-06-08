"""Application configuration via pydantic-settings."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # === Telegram ===
    bot_token: str = Field(default="")

    # === HH.ru OAuth2 (deprecated — Applicant API discontinued Dec 2025) ===
    hh_client_id: str = Field(default="")
    hh_client_secret: str = Field(default="")
    hh_redirect_uri: str = Field(default="http://localhost:3000/auth/callback")

    # === HH.ru Playwright auth ===
    hh_email: str = Field(default="")  # Optional: pre-fill login email
    hh_password: str = Field(default="")  # Optional: pre-fill login password

    # === AI ===
    ai_provider: str = Field(default="openai")
    openai_api_key: str = Field(default="")
    openai_model: str = Field(default="gpt-4o-mini")
    anthropic_api_key: str = Field(default="")
    anthropic_model: str = Field(default="claude-3-haiku-20240307")

    # === Database ===
    database_url: str = Field(default="sqlite+aiosqlite:///./data/hh_bot.db")

    # === Redis ===
    redis_url: str = Field(default="redis://localhost:6379/0")

    # === Browser ===
    browser_headless: bool = Field(default=True)
    browser_timeout: int = Field(default=30000)

    # === Rate limits ===
    daily_reply_limit: int = Field(default=50)
    min_match_score: float = Field(default=70.0)

    # === Anti-detection ===
    anti_detect_enabled: bool = Field(default=True)
    gaussian_mean_sec: float = Field(default=10.0)
    gaussian_stddev_sec: float = Field(default=4.0)
    reading_pause_min_sec: float = Field(default=5.0)
    reading_pause_max_sec: float = Field(default=12.0)
    long_pause_every_n: int = Field(default=5)
    long_pause_duration_sec: float = Field(default=30.0)

    # === Matching engine ===
    embedding_weight: float = Field(default=0.30)
    skills_weight: float = Field(default=0.25)
    experience_weight: float = Field(default=0.20)
    position_weight: float = Field(default=0.15)
    education_weight: float = Field(default=0.10)

    @property
    def hh_auth_url(self) -> str:
        return "https://hh.ru/oauth/authorize"

    @property
    def hh_token_url(self) -> str:
        return "https://hh.ru/oauth/token"

    @property
    def hh_api_base(self) -> str:
        return "https://api.hh.ru"


@lru_cache
def get_settings() -> Settings:
    return Settings()
