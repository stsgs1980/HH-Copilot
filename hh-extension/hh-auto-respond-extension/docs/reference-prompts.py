"""AI prompt templates for cover letter generation.

Skill reference: LLM (z-ai-web-dev-sdk / OpenAI API)
"""

SYSTEM_PROMPT = (
    "Ты профессиональный HR-ассистент. Пиши краткие сопроводительные письма "
    "на русском языке. Без заголовков, только текст письма. "
    "Письмо должно быть персонализированным, упоминать конкретные навыки "
    "и опыт соискателя, релевантные вакансии. "
    "Не используй шаблонные фразы типа 'динамично развивающуюся компанию'."
)

USER_PROMPT_TEMPLATE = (
    "Напиши краткое сопроводительное письмо для отклика на вакансию "
    '"{title}" в компанию "{company}".'
    "{tags_clause}"
    "{experience_clause}"
    "{resume_skills_clause}"
    "{resume_experience_clause}"
    " Стиль: {tone}. Максимум {max_words} слов. От первого лица."
)

CAREER_CHANGE_PROMPT_ADDON = (
    " Важно: соискатель меняет карьерное направление на '{new_direction}'. "
    "Подчеркни переносимые навыки (transferable skills) из прошлого опыта, "
    "которые релевантны новой позиции."
)

RELEVANCE_ASSESSMENT_PROMPT = (
    "Оцени релевантность кандидата для вакансии по шкале от 0 до 100. "
    "Ответь только числом.\n\n"
    "Вакансия: {vacancy_title}\n"
    "Требуемые навыки: {vacancy_skills}\n"
    "Требуемый опыт: {vacancy_experience}\n\n"
    "Кандидат: {resume_position}\n"
    "Навыки кандидата: {resume_skills}\n"
    "Опыт кандидата: {resume_experience}"
)

FALLBACK_LETTER = (
    "Здравствуйте!\n\n"
    "Меня заинтересовала вакансия {title} в компании {company}. "
    "Мой опыт и навыки хорошо подходят для этой позиции. "
    "Буду рад обсудить детали на интервью.\n\n"
    "С уважением."
)

# AI tone options
AI_TONES = {
    "professional": "профессиональный, деловой",
    "friendly": "дружелюбный, открытый",
    "formal": "строго формальный",
    "confident": "уверенный, энергичный",
    "concise": "краткий, лаконичный",
}


def build_cover_letter_prompt(
    title: str,
    company: str,
    tags: list[str] | None = None,
    experience: str = "",
    resume_skills: list[str] | None = None,
    resume_experience: str = "",
    tone: str = "professional",
    max_words: int = 80,
    career_direction: str = "",
) -> str:
    """Build user prompt for cover letter generation."""
    tags_clause = f" Ключевые навыки вакансии: {', '.join(tags)}." if tags else ""
    experience_clause = f" Требуемый опыт: {experience}." if experience else ""
    resume_skills_clause = (
        f" Навыки кандидата: {', '.join(resume_skills)}." if resume_skills else ""
    )
    resume_experience_clause = (
        f" Опыт кандидата: {resume_experience}." if resume_experience else ""
    )

    prompt = USER_PROMPT_TEMPLATE.format(
        title=title,
        company=company,
        tags_clause=tags_clause,
        experience_clause=experience_clause,
        resume_skills_clause=resume_skills_clause,
        resume_experience_clause=resume_experience_clause,
        tone=AI_TONES.get(tone, tone),
        max_words=max_words,
    )

    if career_direction:
        prompt += CAREER_CHANGE_PROMPT_ADDON.format(new_direction=career_direction)

    return prompt
