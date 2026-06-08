"""HH.ru CSS selectors registry — ported from HH-Copilot.

All data-qa selectors are verified against live HH.ru (2025).
Each entry is a list of selectors in priority order for fallback resilience.
"""

HH_SELECTORS: dict[str, list[str]] = {
    # === Vacancy search page ===
    "vacancy_card": [
        '[data-qa="vacancy-serp__vacancy"]',
        ".vacancy-serp-item",
        "[class*='vacancy-serp-item']",
    ],
    "vacancy_title_link": [
        'a[data-qa="serp-item__title"]',
        'a[data-qa="vacancy-serp__vacancy-title"]',
        ".vacancy-serp-item a.bloko-link",
    ],
    "vacancy_title_text": [
        '[data-qa="serp-item__title-text"]',
        'span[data-qa="vacancy-serp__vacancy-title"]',
    ],
    "vacancy_company": [
        '[data-qa="vacancy-serp__vacancy-employer-text"]',
        'a[data-qa="vacancy-serp__vacancy-employer"]',
    ],
    "vacancy_salary": [
        '[data-qa="vacancy-serp__compensation"]',
        ".vacancy-serp-item__compensation",
    ],
    "vacancy_location": [
        '[data-qa="vacancy-serp__vacancy-address"]',
        "[data-qa*='vacancy-address']",
    ],
    "vacancy_experience": [
        '[data-qa^="vacancy-serp__vacancy-work-experience"]',
    ],
    "vacancy_tags": [
        ".bloko-tag__text",
    ],
    "reply_button": [
        '[data-qa="vacancy-serp__vacancy_response"]',
        '[data-qa="vacancy-response-link-top"]',
        'button:has-text("Откликнуться")',
        ".vacancy-response .bloko-button",
    ],
    "next_page": [
        '[data-qa="pager-next"]',
        "a.bloko-button[data-qa='pager-next']",
    ],
    "prev_page": [
        '[data-qa="pager-prev"]',
    ],

    # === Vacancy detail page ===
    "vacancy_title_on_page": [
        '[data-qa="vacancy-title"]',
        "h1.bloko-header-section-1",
    ],
    "vacancy_company_on_page": [
        '[data-qa="vacancy-company-name"]',
        'a[data-qa="vacancy-company-name"]',
        ".vacancy-company-name",
    ],
    "vacancy_description": [
        '[data-qa="vacancy-description"]',
        ".vacancy-description",
        ".g-user-content",
    ],
    "vacancy_skills": [
        '[data-qa="skills-element"]',
        ".bloko-tag__section",
    ],

    # === Application popup ===
    "response_popup": [
        '[data-qa="vacancy-response-submit-popup"]',
        ".vacancy-response-popup",
    ],
    "add_cover_letter": [
        '[data-qa="add-cover-letter"]',
        "button:has-text('Добавить сопроводительное письмо')",
        ".vacancy-response-popup-form-letter-toggle",
    ],
    "cover_letter_input": [
        'textarea[data-qa="vacancy-response-popup-form-letter-input"]',
        "textarea.vacancy-response-popup-form-letter-input",
        "textarea.bloko-textarea",
    ],
    "submit_button": [
        '[data-qa="vacancy-response-submit-popup"]',
        "button.bloko-button_primary:has-text('Откликнуться')",
    ],

    # === Application alerts ===
    "alert_magritte": [
        '[data-qa="magritte-alert"]',
    ],
    "relocation_confirm": [
        '[data-qa="relocation-warning-confirm"]',
        "button:has-text('Продолжить')",
    ],
    "test_task_warning": [
        '[data-qa="test-task-required"]',
    ],
    "already_applied": [
        '[data-qa="already-applied"]',
    ],
    "indirect_employer_alert": [
        '[data-qa="indirect-employer-alert"]',
    ],

    # === Resume page ===
    "resume_personal_name": [
        '[data-qa="resume-personal-name"]',
        ".resume-header-name",
    ],
    "resume_title": [
        '[data-qa="resume-block-title-position"]',
    ],
    "resume_salary": [
        '[data-qa="resume-block-salary"]',
    ],
    "resume_skill_tag": [
        '[data-qa="skill-tag"]',
        ".bloko-tag__text",
    ],
    "resume_experience_company": [
        '[data-qa="resume-block-experience-company"]',
    ],
    "resume_experience_position": [
        '[data-qa="resume-block-experience-position"]',
    ],
    "resume_experience_description": [
        '[data-qa="resume-block-experience-description"]',
    ],
    "resume_education": [
        '[data-qa="resume-block-education"]',
    ],

    # === Resumes list page ===
    "resumes_list_item": [
        '[data-qa="resume"]',
        ".resume-list-item",
    ],
    "resume_link": [
        'a[data-qa="resume-title-link"]',
        ".resume-list-item a",
    ],

    # === Login page ===
    "login_email_input": [
        'input[name="username"]',
        'input[type="email"]',
        'input[data-qa="login-input-username"]',
        '#login-input-username',
    ],
    "login_email_submit": [
        'button[data-qa="account-login-submit"]',
        'button[type="submit"]',
        'button:has-text("Далее")',
        'button:has-text("Продолжить")',
    ],
    "login_password_input": [
        'input[name="password"]',
        'input[type="password"]',
        'input[data-qa="login-input-password"]',
        '#login-input-password',
    ],
    "login_password_submit": [
        'button[data-qa="account-login-submit"]',
        'button[type="submit"]',
        'button:has-text("Войти")',
    ],
    "login_captcha_image": [
        'img[src*="captcha"]',
        '.g-recaptcha',
        'iframe[src*="recaptcha"]',
        '[data-qa="captcha-image"]',
    ],
    "login_captcha_input": [
        'input[name="captcha"]',
        'input[data-qa="captcha-input"]',
        'input[placeholder*="капч"]',
    ],
    "login_captcha_submit": [
        'button[data-qa="captcha-submit"]',
        'button:has-text("Отправить")',
    ],
    "login_2fa_input": [
        'input[name="code"]',
        'input[data-qa="otp-code-input"]',
        'input[placeholder*="код"]',
        'input[inputmode="numeric"]',
    ],
    "login_2fa_submit": [
        'button[data-qa="otp-submit"]',
        'button:has-text("Подтвердить")',
        'button[type="submit"]',
    ],
    "login_error": [
        '[data-qa="login-error"]',
        '.account-login-error',
        '.bloko-form-error',
    ],
    "logged_in_indicator": [
        '[data-qa="mainmenu_applicant"]',
        '[data-qa="mainmenu_user_name"]',
        'a[data-qa="mainmenu_myResumes"]',
    ],

    # === Blacklist ===
    "blacklist_add": [
        '[data-qa="vacancy__blacklist-show-add"]',
    ],

    # === Negotiations page ===
    "negotiations_list": [
        '[data-qa="negotiations"]',
        ".negotiations-list",
    ],
    "negotiation_item": [
        '[data-qa="negotiation-item"]',
    ],
    "message_input": [
        'textarea[data-qa="negotiation-message-input"]',
        "textarea.bloko-textarea",
    ],
    "send_message_button": [
        '[data-qa="negotiation-message-send"]',
        "button:has-text('Отправить')",
    ],
}


def get_selector(name: str) -> str:
    """Get the primary (first) selector for a given name."""
    selectors = HH_SELECTORS.get(name, [])
    return selectors[0] if selectors else ""


def get_selectors(name: str) -> list[str]:
    """Get all fallback selectors for a given name."""
    return HH_SELECTORS.get(name, [])
