"""Auth filter for aiogram handlers."""

from aiogram.filters import BaseFilter
from aiogram.types import Message


class IsAuthorizedFilter(BaseFilter):
    """Filter that checks if user is authorized on HH.ru."""

    async def __call__(self, message: Message) -> bool:
        # This will be injected with user data via middleware
        # For now, check via message.user_shared or custom attribute
        return getattr(message, "_is_authorized", False)
