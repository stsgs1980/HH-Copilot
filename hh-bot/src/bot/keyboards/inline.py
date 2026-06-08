"""Inline keyboard factories for the Telegram bot."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def auth_keyboard(auth_url: str) -> InlineKeyboardMarkup:
    """Keyboard with HH.ru authorization button."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔑 Авторизоваться на HH.ru", url=auth_url)],
        ]
    )


def main_menu_keyboard(is_authorized: bool = False) -> InlineKeyboardMarkup:
    """Main menu keyboard."""
    buttons = []
    if is_authorized:
        buttons.extend([
            [InlineKeyboardButton(text="📋 Мои резюме", callback_data="resumes")],
            [InlineKeyboardButton(text="🔍 Поиск вакансий", callback_data="search")],
            [InlineKeyboardButton(text="📨 Подходящие вакансии", callback_data="suitable")],
            [InlineKeyboardButton(text="💬 Переписка", callback_data="negotiations")],
            [InlineKeyboardButton(text="🤖 Режим откликов", callback_data="apply_mode")],
            [InlineKeyboardButton(text="🔄 Смена направления", callback_data="career")],
            [InlineKeyboardButton(text="⚙️ Настройки", callback_data="settings")],
        ])
    else:
        buttons.append([InlineKeyboardButton(text="🔑 Авторизоваться", callback_data="auth")])
    buttons.append([InlineKeyboardButton(text="📊 Статистика", callback_data="stats")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def apply_mode_keyboard(current_mode: str = "semi_auto") -> InlineKeyboardMarkup:
    """Keyboard for selecting application mode."""
    modes = [
        ("🤖 Авто", "mode_auto", "auto"),
        ("👀 Полуавто", "mode_semi_auto", "semi_auto"),
        ("✋ Ручной", "mode_manual", "manual"),
    ]
    buttons = []
    for text, callback, mode in modes:
        prefix = "✅ " if mode == current_mode else ""
        buttons.append([InlineKeyboardButton(text=f"{prefix}{text}", callback_data=callback)])
    buttons.append([InlineKeyboardButton(text="◀️ Назад", callback_data="back_main")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def vacancy_keyboard(
    vacancy_id: int,
    match_score: float,
    status: str = "new",
) -> InlineKeyboardMarkup:
    """Keyboard for a single vacancy."""
    buttons = []
    if status == "new":
        buttons.append([
            InlineKeyboardButton(
                text=f"✅ Откликнуться ({match_score:.0f}%)",
                callback_data=f"apply_{vacancy_id}",
            )
        ])
    elif status == "applied":
        buttons.append([InlineKeyboardButton(text="✅ Уже откликнулись", callback_data="noop")])
    buttons.append([
        InlineKeyboardButton(text="⏭ Пропустить", callback_data=f"skip_{vacancy_id}"),
        InlineKeyboardButton(text="🚫 В ЧС", callback_data=f"blacklist_{vacancy_id}"),
    ])
    buttons.append([InlineKeyboardButton(text="◀️ К списку", callback_data="suitable")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def vacancies_list_keyboard(
    vacancies: list[tuple[int, str, float]],
    page: int = 0,
    per_page: int = 5,
) -> InlineKeyboardMarkup:
    """Keyboard for browsing vacancies list with pagination."""
    start = page * per_page
    end = start + per_page
    page_vacancies = vacancies[start:end]

    buttons = []
    for vac_id, title, score in page_vacancies:
        short_title = title[:30] + "..." if len(title) > 30 else title
        buttons.append([
            InlineKeyboardButton(
                text=f"[{score:.0f}%] {short_title}",
                callback_data=f"view_vac_{vac_id}",
            )
        ])

    # Pagination
    nav_buttons = []
    if page > 0:
        nav_buttons.append(InlineKeyboardButton(text="◀️ Назад", callback_data=f"vac_page_{page - 1}"))
    if end < len(vacancies):
        nav_buttons.append(InlineKeyboardButton(text="Вперед ▶️", callback_data=f"vac_page_{page + 1}"))
    if nav_buttons:
        buttons.append(nav_buttons)

    buttons.append([
        InlineKeyboardButton(text="🤖 Откликнуться на все подходящие", callback_data="apply_all"),
        InlineKeyboardButton(text="◀️ Меню", callback_data="back_main"),
    ])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def resumes_keyboard(resumes: list[tuple[str, str]]) -> InlineKeyboardMarkup:
    """Keyboard for selecting a resume."""
    buttons = []
    for resume_id, title in resumes:
        short_title = title[:35] + "..." if len(title) > 35 else title
        buttons.append([InlineKeyboardButton(text=short_title, callback_data=f"sel_res_{resume_id}")])
    buttons.append([InlineKeyboardButton(text="◀️ Меню", callback_data="back_main")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def negotiations_keyboard(negotiations: list[tuple[int, str, str, bool]]) -> InlineKeyboardMarkup:
    """Keyboard for selecting a negotiation thread."""
    buttons = []
    for neg_id, title, employer, has_unread in negotiations:
        prefix = "🆕 " if has_unread else ""
        short_title = f"{prefix}{employer[:20]} - {title[:20]}"
        buttons.append([InlineKeyboardButton(text=short_title, callback_data=f"neg_{neg_id}")])
    buttons.append([InlineKeyboardButton(text="🔄 Обновить", callback_data="negotiations")])
    buttons.append([InlineKeyboardButton(text="◀️ Меню", callback_data="back_main")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def settings_keyboard() -> InlineKeyboardMarkup:
    """Keyboard for settings menu."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✍️ Стиль писем", callback_data="set_tone")],
            [InlineKeyboardButton(text="📊 Лимит откликов", callback_data="set_limit")],
            [InlineKeyboardButton(text="⏰ Интервал поиска", callback_data="set_interval")],
            [InlineKeyboardButton(text="◀️ Меню", callback_data="back_main")],
        ]
    )


def confirm_keyboard(callback_yes: str, callback_no: str = "back_main") -> InlineKeyboardMarkup:
    """Generic confirmation keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Да", callback_data=callback_yes),
                InlineKeyboardButton(text="❌ Нет", callback_data=callback_no),
            ]
        ]
    )
