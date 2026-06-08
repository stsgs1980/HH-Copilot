"""Text sanitization and validation utilities — ported from HH-Copilot.

Skill reference: sanitize-validate
- Prompt injection filtering (7 regex rules from HH-Copilot)
- AI content validation
- HTML/URL sanitization
- Unicode stripping (ASCII + Cyrillic policy)
"""

import re


# === Prompt injection patterns (from HH-Copilot sanitizeForPrompt) ===

PROMPT_INJECTION_PATTERNS = [
    (re.compile(r"ignore\s+(all\s+)?previous\s*(instructions|prompts|rules|context)?", re.IGNORECASE), "[filtered]"),
    (re.compile(r"forget\s+(all\s+)?previous", re.IGNORECASE), "[filtered]"),
    (re.compile(r"system\s*:", re.IGNORECASE), "[filtered]"),
    (re.compile(r"disregard\s+(all\s+)?(previous|above|prior)", re.IGNORECASE), "[filtered]"),
    (re.compile(r"you\s+are\s+now", re.IGNORECASE), "[filtered]"),
    (re.compile(r"new\s+instructions?", re.IGNORECASE), "[filtered]"),
    (re.compile(r"(override|bypass|skip)\s+(all\s+)?(rules|filters|safety)", re.IGNORECASE), "[filtered]"),
]


def sanitize_for_prompt(text: str) -> str:
    """Sanitize text before including in AI prompt.

    - Removes quotes, newlines
    - Filters prompt injection patterns
    - Truncates to 500 characters
    """
    text = str(text or "")
    text = text.replace('"', " ").replace("\n", " ").replace("\r", " ")
    for pattern, replacement in PROMPT_INJECTION_PATTERNS:
        text = pattern.sub(replacement, text)
    return text.strip()[:500]


def validate_ai_content(letter: str, max_length: int = 2000) -> str:
    """Validate and clean AI-generated content.

    - Strips HTML tags
    - Removes markdown headers
    - Rejects content with URLs or script injection
    - Limits length
    """
    if not letter or not isinstance(letter, str):
        return ""
    letter = re.sub(r"<[^>]*>", "", letter)  # Strip HTML
    letter = re.sub(r"^#+\s*", "", letter, flags=re.MULTILINE)  # Strip markdown headers
    letter = letter.replace("**", "")  # Strip bold
    letter = letter.strip()
    if len(letter) > max_length:
        letter = letter[:max_length]
    # Reject content with URLs or scripts
    if re.search(r"https?://", letter, re.IGNORECASE):
        return ""
    if re.search(r"javascript:", letter, re.IGNORECASE):
        return ""
    if re.search(r"on\w+\s*=", letter, re.IGNORECASE):
        return ""
    return letter.strip()


def esc_html(text: str) -> str:
    """HTML entity encoding."""
    mapping = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}
    return re.sub(r'[&><"\']', lambda m: mapping[m.group()], str(text or ""))


def safe_href(url: str) -> str:
    """Block dangerous URL schemes (javascript:, data:, vbscript:)."""
    if not url or not isinstance(url, str):
        return "#"
    s = url.strip().lower()
    if s.startswith(("javascript:", "data:", "vbscript:")):
        return "#"
    return url


def strip_emoji(text: str) -> str:
    """Remove emoji and Unicode graphics from text."""
    return re.sub(
        r"[\U0001F000-\U0001FFFF]|[\u2600-\u27BF]|[\uFE00-\uFEFF]|"
        r"[\U0001F900-\U0001F9FF]|[\u2702-\u27B0]|[\u2300-\u23FF]|"
        r"[\u2B50-\u2B55]|[\u25AA-\u25FE]|[\u2000-\u206F]",
        "",
        str(text or ""),
    )


def strip_unicode(text: str) -> str:
    """ASCII + Cyrillic only (HH-Copilot Unicode Policy [C] level)."""
    return re.sub(r"[^\x20-\x7E\u0400-\u04FF]", "", str(text or ""))


def strip_unicode_lenient(text: str) -> str:
    """ASCII + Cyrillic + diagram symbols ([I] level)."""
    return re.sub(r"[^\x20-\x7E\u0400-\u04FF\-\>\<\=\|\+\^]", "", str(text or ""))


def extract_vacancy_id(url: str) -> str | None:
    """Extract vacancy ID from HH.ru URL."""
    match = re.search(r"/vacancy/(\d+)", url)
    return match.group(1) if match else None


def has_contact_email(text: str) -> bool:
    """Check if text contains an email address."""
    return bool(re.search(r"[\w.-]+@[\w.-]+\.\w+", text))


def parse_salary_range(salary_text: str) -> tuple[int | None, int | None, str]:
    """Parse HH.ru salary text into (from, to, currency).

    Examples:
        '100 000 - 150 000 руб.' -> (100000, 150000, 'RUR')
        'от 80 000 USD' -> (80000, None, 'USD')
        'до 200 000 руб.' -> (None, 200000, 'RUR')
    """
    if not salary_text:
        return None, None, "RUR"

    currency = "USD" if "USD" in salary_text else ("EUR" if "EUR" in salary_text else "RUR")

    # Find all groups of digits possibly separated by spaces (e.g. "100 000")
    number_groups = re.findall(r"\d[\d\s]*\d|\d", salary_text)
    clean_numbers = [int(re.sub(r"\s", "", n)) for n in number_groups if re.sub(r"\s", "", n)]

    if "от" in salary_text and "до" not in salary_text:
        return clean_numbers[0] if clean_numbers else None, None, currency
    if "до" in salary_text and "от" not in salary_text:
        return None, clean_numbers[0] if clean_numbers else None, currency
    if len(clean_numbers) >= 2:
        return clean_numbers[0], clean_numbers[1], currency
    if len(clean_numbers) == 1:
        return clean_numbers[0], clean_numbers[0], currency
    return None, None, currency
