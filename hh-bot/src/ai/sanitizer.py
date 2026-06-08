"""Input/output sanitization for AI interactions.

Skill reference: sanitize-validate
- Prompt injection filtering
- AI content validation
- Unicode/emoji stripping
"""

from src.utils.text import (
    esc_html,
    sanitize_for_prompt,
    strip_emoji,
    strip_unicode,
    validate_ai_content,
)


def sanitize_vacancy_for_prompt(
    title: str,
    company: str,
    tags: list[str],
    experience: str,
) -> dict[str, str]:
    """Sanitize vacancy data before including in AI prompts."""
    return {
        "title": sanitize_for_prompt(strip_emoji(title)),
        "company": sanitize_for_prompt(strip_emoji(company)),
        "tags": [sanitize_for_prompt(strip_emoji(t)) for t in tags[:10]],
        "experience": sanitize_for_prompt(experience),
    }


def sanitize_resume_for_prompt(
    skills: list[str],
    experience: str,
    position: str,
) -> dict[str, str]:
    """Sanitize resume data before including in AI prompts."""
    return {
        "skills": [sanitize_for_prompt(strip_emoji(s)) for s in skills[:15]],
        "experience": sanitize_for_prompt(experience[:500]),
        "position": sanitize_for_prompt(position),
    }


def validate_cover_letter(letter: str) -> str:
    """Validate and clean AI-generated cover letter.

    Returns empty string if content is unsafe.
    """
    # First, strip emoji and validate
    cleaned = strip_emoji(letter)
    validated = validate_ai_content(cleaned)
    if not validated:
        return ""
    # Ensure minimum length
    if len(validated.strip()) < 20:
        return ""
    return validated
