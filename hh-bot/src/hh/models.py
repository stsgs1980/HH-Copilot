"""Pydantic models for HH.ru data structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class HHVacancy:
    """Parsed vacancy from HH.ru search or API."""

    id: str = ""
    title: str = ""
    company: str = ""
    salary_from: int | None = None
    salary_to: int | None = None
    salary_currency: str = "RUR"
    location: str = ""
    experience: str = ""
    employment: str = ""
    schedule: str = ""
    skills: list[str] = field(default_factory=list)
    description: str = ""
    url: str = ""
    has_direct_reply: bool = False
    has_contact_email: bool = False
    match_score: float = 0.0
    status: str = "new"
    raw_data: dict[str, Any] | None = None


@dataclass
class HHResume:
    """Parsed resume from HH.ru."""

    id: str = ""
    title: str = ""
    position: str = ""
    salary_from: int | None = None
    salary_to: int | None = None
    salary_currency: str = "RUR"
    skills: list[str] = field(default_factory=list)
    experience: list[dict[str, Any]] = field(default_factory=list)
    education: list[dict[str, Any]] = field(default_factory=list)
    about: str = ""
    city: str = ""
    name: str = ""
    email: str = ""
    phone: str = ""
    raw_data: dict[str, Any] | None = None


@dataclass
class HHNegotiation:
    """Negotiation (dialog) with employer."""

    id: str = ""
    vacancy_id: str = ""
    vacancy_title: str = ""
    employer_name: str = ""
    state: str = "response"
    messages: list[dict[str, Any]] = field(default_factory=list)
    has_unread: bool = False
    url: str = ""


@dataclass
class HHTokenData:
    """OAuth2 token response from HH.ru."""

    access_token: str = ""
    refresh_token: str = ""
    token_type: str = "bearer"
    expires_in: int = 0
    created_at: int = 0


# === HH.ru API dictionary models ===

@dataclass
class HHArea:
    id: str = ""
    name: str = ""
    parent_id: str | None = None


@dataclass
class HHSpecialization:
    id: str = ""
    name: str = ""
    professions: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class HHDictionaries:
    """HH.ru reference dictionaries (experience, employment, schedule, etc.)."""
    experience: list[dict[str, Any]] = field(default_factory=list)
    employment: list[dict[str, Any]] = field(default_factory=list)
    schedule: list[dict[str, Any]] = field(default_factory=list)
    currency: list[dict[str, Any]] = field(default_factory=list)
    vacancy_type: list[dict[str, Any]] = field(default_factory=list)
