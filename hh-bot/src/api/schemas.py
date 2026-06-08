"""Pydantic schemas for the FastAPI REST API.

These schemas define the request/response models that the Next.js frontend
consumes. They map closely to the TypeScript interfaces in mock-data.ts
to ensure seamless frontend-backend communication.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ===== RESUMES =====


class ExperienceEntry(BaseModel):
    id: str = ""
    company: str = ""
    position: str = ""
    start_date: str = Field(default="", alias="startDate")
    end_date: str | None = Field(default=None, alias="endDate")
    description: str = ""

    model_config = {"populate_by_name": True}


class EducationEntry(BaseModel):
    id: str = ""
    institution: str = ""
    degree: str = ""
    year: str = ""


class ResumeResponse(BaseModel):
    id: str
    title: str = ""
    position: str = ""
    skills: list[str] = []
    salary: str = ""
    salary_from: int | None = Field(default=None, alias="salaryFrom")
    salary_to: int | None = Field(default=None, alias="salaryTo")
    currency: str = "RUR"
    city: str = ""
    experience: str = ""
    experience_years: int = Field(default=0, alias="experienceYears")
    education: str = ""
    about: str = ""
    last_sync: str = Field(default="", alias="lastSync")
    is_default: bool = Field(default=False, alias="isDefault")
    experience_entries: list[ExperienceEntry] = Field(default_factory=list, alias="experienceEntries")
    education_entries: list[EducationEntry] = Field(default_factory=list, alias="educationEntries")
    skill_gaps: list[str] = Field(default_factory=list, alias="skillGaps")
    matching_vacancies: int = Field(default=0, alias="matchingVacancies")
    total_vacancies: int = Field(default=0, alias="totalVacancies")

    model_config = {"populate_by_name": True}


class ResumeUpdateRequest(BaseModel):
    title: str | None = None
    position: str | None = None
    skills: list[str] | None = None
    salary: str | None = None
    salary_from: int | None = None
    salary_to: int | None = None
    currency: str | None = None
    city: str | None = None
    about: str | None = None
    is_default: bool | None = None
    experience_entries: list[ExperienceEntry] | None = None


class SkillRequest(BaseModel):
    skill: str


# ===== VACANCIES =====


class MatchBreakdown(BaseModel):
    skills: int = 0
    experience: int = 0
    salary: int = 0
    location: int = 0


class VacancyResponse(BaseModel):
    id: str
    title: str = ""
    company: str = ""
    salary: str = ""
    match_score: int = Field(default=0, alias="matchScore")
    location: str = ""
    experience: str = ""
    description: str = ""
    skills: list[str] = []
    status: str = "new"
    published_at: str = Field(default="", alias="publishedAt")
    url: str = ""
    match_breakdown: MatchBreakdown = Field(default_factory=MatchBreakdown, alias="matchBreakdown")

    model_config = {"populate_by_name": True}


class VacancySearchRequest(BaseModel):
    text: str = ""
    area: int = 1
    specialization: str | None = None
    experience: str | None = None
    employment: str | None = None
    schedule: str | None = None
    salary_from: int | None = None
    salary_to: int | None = None
    page: int = 0
    per_page: int = 50


class ApplyRequest(BaseModel):
    cover_letter: str | None = Field(default=None, alias="coverLetter")
    resume_id: str | None = Field(default=None, alias="resumeId")

    model_config = {"populate_by_name": True}


# ===== NEGOTIATIONS =====


class NegotiationMessageResponse(BaseModel):
    id: str = ""
    sender: str = "employer"
    text: str = ""
    timestamp: str = ""
    is_auto_reply: bool = Field(default=False, alias="isAutoReply")

    model_config = {"populate_by_name": True}


class NegotiationResponse(BaseModel):
    id: str
    vacancy_title: str = Field(default="", alias="vacancyTitle")
    company: str = ""
    employer_name: str = Field(default="", alias="employerName")
    status: str = "active"
    unread: int = 0
    last_message: str = Field(default="", alias="lastMessage")
    last_message_time: str = Field(default="", alias="lastMessageTime")
    auto_reply: bool = Field(default=False, alias="autoReply")
    messages: list[NegotiationMessageResponse] = []

    model_config = {"populate_by_name": True}


class SendMessageRequest(BaseModel):
    text: str
    is_auto_reply: bool = Field(default=False, alias="isAutoReply")

    model_config = {"populate_by_name": True}


# ===== DASHBOARD STATS =====


class DashboardStatsResponse(BaseModel):
    total_vacancies: int = Field(default=0, alias="totalVacancies")
    applied_today: int = Field(default=0, alias="appliedToday")
    interview_invites: int = Field(default=0, alias="interviewInvites")
    daily_limit_remaining: int = Field(default=0, alias="dailyLimitRemaining")

    model_config = {"populate_by_name": True}


class ChartDataPoint(BaseModel):
    day: str = ""
    applications: int = 0
    interviews: int = 0


class ActivityLogEntryResponse(BaseModel):
    id: str = ""
    type: str = "apply"
    description: str = ""
    timestamp: str = ""


class StatsResponse(BaseModel):
    stats: DashboardStatsResponse
    chart_data: list[ChartDataPoint] = Field(default_factory=list, alias="chartData")
    activity_log: list[ActivityLogEntryResponse] = Field(default_factory=list, alias="activityLog")

    model_config = {"populate_by_name": True}


# ===== BOT STATUS =====


class BotStatusResponse(BaseModel):
    is_online: bool = Field(default=False, alias="isOnline")
    mode: str = "semi-auto"
    last_activity: str = Field(default="", alias="lastActivity")
    uptime: str = ""
    applied_today: int = Field(default=0, alias="appliedToday")
    daily_limit: int = Field(default=50, alias="dailyLimit")
    errors: int = 0
    hh_connected: bool = Field(default=False, alias="hhConnected")
    token_expiry: str = Field(default="", alias="tokenExpiry")

    model_config = {"populate_by_name": True}


# ===== SETTINGS =====


class SettingsResponse(BaseModel):
    mode: str = "semi-auto"
    career_direction: str = Field(default="Python Developer", alias="careerDirection")
    letter_tone: str = Field(default="confident", alias="letterTone")
    daily_limit: int = Field(default=50, alias="dailyLimit")
    search_interval: int = Field(default=15, alias="searchInterval")
    min_match_score: int = Field(default=70, alias="minMatchScore")

    model_config = {"populate_by_name": True}


class SettingsUpdateRequest(BaseModel):
    mode: str | None = None
    career_direction: str | None = None
    letter_tone: str | None = None
    daily_limit: int | None = None
    search_interval: int | None = None
    min_match_score: int | None = None


# ===== GENERIC =====


class SuccessResponse(BaseModel):
    success: bool = True


class SyncResponse(BaseModel):
    success: bool = True
    synced_at: str = Field(default="", alias="syncedAt")

    model_config = {"populate_by_name": True}
