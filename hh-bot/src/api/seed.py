"""Seed demo data for the dashboard — vacancies, negotiations, and activity log."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import ActivityLog, Negotiation, Resume, User, UserSettings, Vacancy
from src.db.repositories import UserRepository

logger = logging.getLogger(__name__)


async def seed_demo_data(session: AsyncSession) -> None:
    """Seed comprehensive demo data for the dashboard."""
    user_repo = UserRepository(session)
    user = await user_repo.get_by_telegram_id(0)
    if not user:
        user = await user_repo.create(telegram_id=0)

    # Check if we already have data
    from sqlalchemy import select, func
    result = await session.execute(select(func.count(Vacancy.id)).where(Vacancy.user_id == user.id))
    vacancy_count = result.scalar()
    resume_result = await session.execute(select(func.count(Resume.id)).where(Resume.user_id == user.id))
    resume_count = resume_result.scalar()
    has_vacancies = vacancy_count is not None and vacancy_count > 0
    has_resumes = resume_count is not None and resume_count > 0

    if has_vacancies and has_resumes:
        logger.info("Demo data already exists, skipping seed")
        return

    now = datetime.utcnow()

    # Seed resumes first if not present
    if not has_resumes:
        logger.info("Seeding demo resumes...")
        from src.db.repositories import ResumeRepository
        resume_repo = ResumeRepository(session)

        demo_skills_1 = ["Python", "Django", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker", "Redis", "Celery", "Git"]
        demo_exp_1 = [
            {"company": "Яндекс", "position": "Senior Python Developer", "start_date": "2023-03", "end_date": None, "description": "Разработка и поддержка внутренних сервисов поиска."},
            {"company": "Тинькофф", "position": "Python Developer", "start_date": "2021-06", "end_date": "2023-02", "description": "Разработка бэкенд-сервисов для мобильного банка."},
            {"company": "Digital Horizon", "position": "Junior Python Developer", "start_date": "2019-08", "end_date": "2021-05", "description": "Разработка REST API для финтек-платформы."},
        ]
        demo_edu_1 = [
            {"organization": "МГТУ им. Н.Э. Баумана", "name": "Магистр, Информатика и вычислительная техника", "year": 2019},
            {"organization": "МГТУ им. Н.Э. Баумана", "name": "Бакалавр, Программная инженерия", "year": 2017},
        ]

        await resume_repo.upsert(
            user_id=user.id,
            hh_resume_id="demo_r1",
            title="Python Developer / Fullstack",
            position="Python Developer",
            salary_from=250000,
            salary_to=350000,
            salary_currency="RUR",
            skills=json.dumps(demo_skills_1, ensure_ascii=False),
            experience=json.dumps(demo_exp_1, ensure_ascii=False),
            education=json.dumps(demo_edu_1, ensure_ascii=False),
            about="Опытный Python-разработчик с 5-летним стажем в создании высоконагруженных веб-сервисов. Специализируюсь на FastAPI и Django.",
            city="Москва",
            is_active=True,
        )

        demo_skills_2 = ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux", "Bash", "Prometheus", "Grafana"]
        demo_exp_2 = [
            {"company": "Сбер", "position": "DevOps Engineer", "start_date": "2023-01", "end_date": None, "description": "Поддержка и развитие CI/CD пайплайнов."},
            {"company": "VK Cloud", "position": "Cloud Engineer", "start_date": "2021-04", "end_date": "2022-12", "description": "Проектирование облачных решений."},
        ]
        demo_edu_2 = [
            {"organization": "МГУ им. М.В. Ломоносова", "name": "Магистр, Факультет ВМК", "year": 2020},
        ]

        await resume_repo.upsert(
            user_id=user.id,
            hh_resume_id="demo_r2",
            title="DevOps / Инженер инфраструктуры",
            position="DevOps Engineer",
            salary_from=220000,
            salary_to=320000,
            salary_currency="RUR",
            skills=json.dumps(demo_skills_2, ensure_ascii=False),
            experience=json.dumps(demo_exp_2, ensure_ascii=False),
            education=json.dumps(demo_edu_2, ensure_ascii=False),
            about="DevOps-инженер с опытом построения и поддержки облачной инфраструктуры.",
            city="Москва",
            is_active=False,
        )
        await session.flush()
        logger.info("Demo resumes seeded")

    if has_vacancies:
        logger.info("Vacancies already exist, skipping vacancy seed")
        return

    vacancies_data = [
        {"hh_id": "v1", "title": "Python Developer", "company": "Яндекс", "salary_from": 250000, "salary_to": 350000, "location": "Москва", "experience": "3-6 лет", "skills": ["Python", "Django", "PostgreSQL", "Docker", "Kubernetes", "Redis"], "score": 92, "status": "new", "days_ago": 1},
        {"hh_id": "v2", "title": "Frontend Developer (React)", "company": "Тинькофф", "salary_from": 200000, "salary_to": 300000, "location": "Москва", "experience": "2-5 лет", "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Jest"], "score": 88, "status": "new", "days_ago": 1},
        {"hh_id": "v3", "title": "DevOps Engineer", "company": "Сбер", "salary_from": 220000, "salary_to": 320000, "location": "Москва", "experience": "3-6 лет", "skills": ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux"], "score": 85, "status": "new", "days_ago": 2},
        {"hh_id": "v4", "title": "Data Analyst", "company": "ВКонтакте", "salary_from": 180000, "salary_to": 260000, "location": "Санкт-Петербург", "experience": "1-3 года", "skills": ["SQL", "Python", "Tableau", "A/B тесты", "BigQuery"], "score": 78, "status": "new", "days_ago": 2},
        {"hh_id": "v5", "title": "Backend Developer (Go)", "company": "Авито", "salary_from": 280000, "salary_to": 400000, "location": "Москва", "experience": "3-6 лет", "skills": ["Go", "gRPC", "PostgreSQL", "Kafka", "Microservices"], "score": 73, "status": "new", "days_ago": 2},
        {"hh_id": "v6", "title": "Fullstack Developer", "company": "Ozon", "salary_from": 230000, "salary_to": 330000, "location": "Москва", "experience": "2-5 лет", "skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"], "score": 81, "status": "applied", "days_ago": 3},
        {"hh_id": "v7", "title": "ML Engineer", "company": "МТС", "salary_from": 300000, "salary_to": 450000, "location": "Москва", "experience": "3-6 лет", "skills": ["Python", "PyTorch", "MLOps", "Kubernetes", "SQL"], "score": 68, "status": "new", "days_ago": 3},
        {"hh_id": "v8", "title": "QA Automation Engineer", "company": "Лаборатория Касперского", "salary_from": 150000, "salary_to": 220000, "location": "Москва", "experience": "2-4 года", "skills": ["Python", "Selenium", "Pytest", "CI/CD", "Docker"], "score": 62, "status": "skipped", "days_ago": 3},
        {"hh_id": "v9", "title": "System Administrator (Linux)", "company": "Ростелеком", "salary_from": 120000, "salary_to": 180000, "location": "Новосибирск", "experience": "3-6 лет", "skills": ["Linux", "Bash", "Zabbix", "Nginx", "Networking"], "score": 55, "status": "skipped", "days_ago": 4},
        {"hh_id": "v10", "title": "Senior Python Developer", "company": "HeadHunter", "salary_from": 350000, "salary_to": 500000, "location": "Москва", "experience": "5+ лет", "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery", "Docker"], "score": 91, "status": "applied", "days_ago": 4},
        {"hh_id": "v11", "title": "React Native Developer", "company": "Delivery Club", "salary_from": 200000, "salary_to": 280000, "location": "Москва", "experience": "2-4 года", "skills": ["React Native", "TypeScript", "Redux", "Firebase"], "score": 74, "status": "new", "days_ago": 5},
        {"hh_id": "v12", "title": "Cloud Architect", "company": "VK Cloud", "salary_from": 400000, "salary_to": 550000, "location": "Санкт-Петербург", "experience": "5+ лет", "skills": ["AWS", "Azure", "Terraform", "Kubernetes", "Security"], "score": 65, "status": "new", "days_ago": 5},
        {"hh_id": "v13", "title": "Data Engineer", "company": "СберМаркет", "salary_from": 250000, "salary_to": 350000, "location": "Москва", "experience": "3-5 лет", "skills": ["Python", "Spark", "Airflow", "Kafka", "SQL", "Hadoop"], "score": 79, "status": "new", "days_ago": 5},
        {"hh_id": "v14", "title": "iOS Developer", "company": "Тинькофф", "salary_from": 250000, "salary_to": 380000, "location": "Москва", "experience": "2-5 лет", "skills": ["Swift", "UIKit", "CoreData", "CI/CD"], "score": 48, "status": "blacklisted", "days_ago": 6},
        {"hh_id": "v15", "title": "Tech Lead (Python)", "company": "Студия Артемия Лебедева", "salary_from": 320000, "salary_to": 450000, "location": "Москва", "experience": "5+ лет", "skills": ["Python", "Django", "PostgreSQL", "Docker", "Leadership", "System Design"], "score": 86, "status": "new", "days_ago": 6},
        {"hh_id": "v16", "title": "Junior Python Developer", "company": "Стартап FinTech", "salary_from": 80000, "salary_to": 130000, "location": "Удалённо", "experience": "0-1 год", "skills": ["Python", "FastAPI", "SQL", "Git"], "score": 42, "status": "new", "days_ago": 7},
    ]

    for v in vacancies_data:
        vacancy = Vacancy(
            user_id=user.id,
            hh_vacancy_id=v["hh_id"],
            title=v["title"],
            company=v["company"],
            salary_from=v["salary_from"],
            salary_to=v["salary_to"],
            salary_currency="RUR",
            location=v["location"],
            experience=v["experience"],
            skills=json.dumps(v["skills"], ensure_ascii=False),
            description=f"Описание вакансии {v['title']} в {v['company']}",
            url=f"https://hh.ru/vacancy/{v['hh_id']}",
            match_score=v["score"],
            status=v["status"],
            created_at=now - timedelta(days=v["days_ago"]),
            applied_at=now - timedelta(days=v["days_ago"] - 1) if v["status"] == "applied" else None,
        )
        session.add(vacancy)

    # Seed negotiations
    negotiations_data = [
        {
            "hh_id": "n1", "vacancy_title": "Senior Python Developer", "employer": "HeadHunter",
            "state": "response", "has_unread": True, "last_msg": "Здравствуйте! Нам очень интересен ваш опыт. Когда вам удобно пройти техническое интервью?",
            "messages": [
                {"sender": "bot", "text": "Добрый день! Спасибо за приглашение. Меня заинтересовала вакансия Senior Python Developer.", "is_auto_reply": True},
                {"sender": "employer", "text": "Здравствуйте! Рады вашему отклику. Расскажите о вашем опыте с высоконагруженными системами.", "is_auto_reply": False},
                {"sender": "bot", "text": "Последние 3 года работаю с сервисами, обрабатывающими 10 000+ RPS.", "is_auto_reply": True},
                {"sender": "employer", "text": "Здравствуйте! Нам очень интересен ваш опыт. Когда вам удобно пройти техническое интервью?", "is_auto_reply": False},
            ]
        },
        {
            "hh_id": "n2", "vacancy_title": "Fullstack Developer", "employer": "Ozon",
            "state": "response", "has_unread": False, "last_msg": "Спасибо, ваше резюме передано технической команде.",
            "messages": [
                {"sender": "bot", "text": "Добрый день! Откликаюсь на позицию Fullstack Developer.", "is_auto_reply": True},
                {"sender": "employer", "text": "Спасибо, ваше резюме передано технической команде. Ожидайте обратную связь.", "is_auto_reply": False},
            ]
        },
        {
            "hh_id": "n3", "vacancy_title": "Python Developer", "employer": "Яндекс",
            "state": "invite", "has_unread": True, "last_msg": "Мы бы хотели пригласить вас на ознакомительный звонок на следующей неделе.",
            "messages": [
                {"sender": "me", "text": "Здравствуйте! Очень заинтересован в вакансии Python Developer в Яндексе.", "is_auto_reply": False},
                {"sender": "employer", "text": "Здравствуйте! Можете рассказать о вашем опыте работы с микросервисами?", "is_auto_reply": False},
                {"sender": "me", "text": "Да, конечно. Работал с микросервисной архитектурой на последнем проекте.", "is_auto_reply": False},
                {"sender": "employer", "text": "Мы бы хотели пригласить вас на ознакомительный звонок на следующей неделе.", "is_auto_reply": False},
            ]
        },
        {
            "hh_id": "n4", "vacancy_title": "Data Engineer", "employer": "СберМаркет",
            "state": "response", "has_unread": False, "last_msg": "Отправил вам тестовое задание на почту. Жду решения в течение 3 дней.",
            "messages": [
                {"sender": "bot", "text": "Добрый день! Откликаюсь на позицию Data Engineer.", "is_auto_reply": True},
                {"sender": "employer", "text": "Отправил вам тестовое задание на почту. Жду решения в течение 3 дней.", "is_auto_reply": False},
            ]
        },
        {
            "hh_id": "n5", "vacancy_title": "Tech Lead (Python)", "employer": "Студия Артемия Лебедева",
            "state": "rejected", "has_unread": False, "last_msg": "К сожалению, позиция уже закрыта. Спасибо за ваш отклик!",
            "messages": [
                {"sender": "bot", "text": "Здравствуйте! Откликаюсь на позицию Tech Lead.", "is_auto_reply": True},
                {"sender": "employer", "text": "К сожалению, позиция уже закрыта. Спасибо за ваш отклик!", "is_auto_reply": False},
            ]
        },
    ]

    for n in negotiations_data:
        neg = Negotiation(
            user_id=user.id,
            vacancy_id=1,  # placeholder
            hh_negotiation_id=n["hh_id"],
            employer_name=n["employer"],
            vacancy_title=n["vacancy_title"],
            state=n["state"],
            has_unread=n["has_unread"],
            last_message=n["last_msg"],
            last_message_at=now - timedelta(hours=2),
            raw_data=json.dumps({"messages": n["messages"], "auto_reply": True}, ensure_ascii=False),
        )
        session.add(neg)

    # Seed activity log
    activities = [
        ("vacancy_applied", "Отклик отправлен: Senior Python Developer — HeadHunter", 1),
        ("message_sent", "Приглашение на интервью: Python Developer — Яндекс", 2),
        ("vacancy_applied", "Отклик отправлен: Fullstack Developer — Ozon", 3),
        ("sync", "Резюме синхронизированы с HH.ru", 4),
        ("auth", "Авторизация HH.ru подтверждена, токен обновлён", 5),
    ]
    for action, details, hours_ago in activities:
        log = ActivityLog(
            user_id=user.id,
            action=action,
            details=details,
            created_at=now - timedelta(hours=hours_ago),
        )
        session.add(log)

    await session.flush()
    logger.info("Demo data seeded: %d vacancies, %d negotiations, %d activities",
                len(vacancies_data), len(negotiations_data), len(activities))
