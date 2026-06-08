"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Auth fields (commercial version)
    email: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Telegram integration (optional)
    telegram_id: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True, index=True)
    hh_access_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hh_refresh_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hh_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    hh_cookies: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of Playwright cookies
    hh_email: Mapped[str | None] = mapped_column(String(200), nullable=True)  # HH.ru login email
    is_authorized: Mapped[bool] = mapped_column(Boolean, default=False)
    apply_mode: Mapped[str] = mapped_column(String(20), default="semi_auto")  # auto, semi_auto, manual
    career_direction: Mapped[str | None] = mapped_column(String(200), nullable=True)
    min_match_score: Mapped[float] = mapped_column(Float, default=70.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    settings: Mapped["UserSettings"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    hh_resume_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    position: Mapped[str | None] = mapped_column(String(300), nullable=True)
    salary_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(10), default="RUR")
    skills: Mapped[str] = mapped_column(Text, default="")  # JSON array stored as text
    experience: Mapped[str] = mapped_column(Text, default="")  # JSON array stored as text
    education: Mapped[str] = mapped_column(Text, default="")  # JSON array stored as text
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # Full HH.ru JSON response
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="resumes")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    hh_vacancy_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    company: Mapped[str | None] = mapped_column(String(300), nullable=True)
    salary_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(10), default="RUR")
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    experience: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    schedule: Mapped[str | None] = mapped_column(String(50), nullable=True)
    skills: Mapped[str] = mapped_column(Text, default="")  # JSON array stored as text
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="new")  # new, processing, applied, failed, skipped
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Negotiation(Base):
    __tablename__ = "negotiations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id"), nullable=False)
    hh_negotiation_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    employer_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    vacancy_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    state: Mapped[str] = mapped_column(String(50), default="response")  # response, interview, offer, rejected, etc.
    last_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    has_unread: Mapped[bool] = mapped_column(Boolean, default=False)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    search_area: Mapped[int] = mapped_column(Integer, default=1)  # HH.ru area ID (1=Moscow)
    search_specialization: Mapped[str | None] = mapped_column(String(50), nullable=True)
    search_experience: Mapped[str | None] = mapped_column(String(20), nullable=True)
    search_employment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    search_schedule: Mapped[str | None] = mapped_column(String(50), nullable=True)
    exclude_keywords: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    include_keywords: Mapped[str] = mapped_column(Text, default="")
    ai_tone: Mapped[str] = mapped_column(String(30), default="professional")
    max_letter_words: Mapped[int] = mapped_column(Integer, default=80)
    daily_reply_limit: Mapped[int] = mapped_column(Integer, default=50)
    auto_reply_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    search_interval_min: Mapped[int] = mapped_column(Integer, default=60)  # minutes
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="settings")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    vacancy_id: Mapped[int | None] = mapped_column(ForeignKey("vacancies.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
