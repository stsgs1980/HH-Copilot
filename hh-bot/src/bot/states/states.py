"""Telegram bot FSM states."""

from aiogram.fsm.state import State, StatesGroup


class AuthStates(StatesGroup):
    """States for OAuth authorization flow."""
    waiting_for_code = State()
    authorizing = State()


class ResumeStates(StatesGroup):
    """States for resume management."""
    selecting_resume = State()
    viewing_resume = State()


class SearchStates(StatesGroup):
    """States for vacancy search configuration."""
    setting_query = State()
    setting_area = State()
    setting_experience = State()
    setting_salary = State()
    setting_filters = State()


class ApplyStates(StatesGroup):
    """States for application mode selection."""
    selecting_mode = State()
    confirming_apply = State()
    viewing_vacancy = State()
    selecting_resume_for_apply = State()


class CareerStates(StatesGroup):
    """States for career direction change."""
    setting_direction = State()
    confirming_direction = State()


class NegotiationStates(StatesGroup):
    """States for negotiation/chat management."""
    viewing_negotiations = State()
    composing_message = State()
    selecting_negotiation = State()


class SettingsStates(StatesGroup):
    """States for user settings."""
    main_menu = State()
    setting_tone = State()
    setting_limit = State()
    setting_interval = State()
