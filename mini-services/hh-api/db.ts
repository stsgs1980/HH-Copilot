import { Database } from "bun:sqlite";
import type {
  Resume, Vacancy, Negotiation, NegotiationMessage,
  ActivityLogEntry, BotStatus, DashboardStats, ChartData, AppSettings,
  ExperienceEntry, EducationEntry,
} from "./types";

const db = new Database("/home/z/my-project/mini-services/hh-api/hh-bot.db", { create: true });

// Enable WAL mode for better performance
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    skills TEXT NOT NULL DEFAULT '[]',
    salary TEXT NOT NULL DEFAULT '',
    salaryFrom INTEGER NOT NULL DEFAULT 0,
    salaryTo INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'RUR',
    city TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    experienceYears INTEGER NOT NULL DEFAULT 0,
    education TEXT NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    lastSync TEXT NOT NULL DEFAULT '',
    isDefault INTEGER NOT NULL DEFAULT 0,
    experienceEntries TEXT NOT NULL DEFAULT '[]',
    educationEntries TEXT NOT NULL DEFAULT '[]',
    skillGaps TEXT NOT NULL DEFAULT '[]',
    matchingVacancies INTEGER NOT NULL DEFAULT 0,
    totalVacancies INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS vacancies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    salary TEXT NOT NULL DEFAULT '',
    matchScore INTEGER NOT NULL DEFAULT 0,
    location TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    skills TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new',
    publishedAt TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '#',
    matchBreakdown TEXT NOT NULL DEFAULT '{}',
    coverLetter TEXT
  );

  CREATE TABLE IF NOT EXISTS negotiations (
    id TEXT PRIMARY KEY,
    vacancyTitle TEXT NOT NULL,
    company TEXT NOT NULL,
    employerName TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    unread INTEGER NOT NULL DEFAULT 0,
    lastMessage TEXT NOT NULL DEFAULT '',
    lastMessageTime TEXT NOT NULL DEFAULT '',
    autoReply INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS negotiation_messages (
    id TEXT PRIMARY KEY,
    negotiationId TEXT NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    isAutoReply INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (negotiationId) REFERENCES negotiations(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bot_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    isOnline INTEGER NOT NULL DEFAULT 1,
    mode TEXT NOT NULL DEFAULT 'semi-auto',
    lastActivity TEXT NOT NULL DEFAULT '',
    uptime TEXT NOT NULL DEFAULT '0д 0ч 0м',
    appliedToday INTEGER NOT NULL DEFAULT 0,
    dailyLimit INTEGER NOT NULL DEFAULT 50,
    errors INTEGER NOT NULL DEFAULT 0,
    hhConnected INTEGER NOT NULL DEFAULT 0,
    tokenExpiry TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mode TEXT NOT NULL DEFAULT 'semi-auto',
    careerDirection TEXT NOT NULL DEFAULT 'Python Developer',
    letterTone TEXT NOT NULL DEFAULT 'confident',
    dailyLimit INTEGER NOT NULL DEFAULT 50,
    searchInterval INTEGER NOT NULL DEFAULT 15,
    minMatchScore INTEGER NOT NULL DEFAULT 70
  );

  CREATE TABLE IF NOT EXISTS chart_data (
    day TEXT PRIMARY KEY,
    applications INTEGER NOT NULL DEFAULT 0,
    interviews INTEGER NOT NULL DEFAULT 0
  );
`);

// Check if we need to seed
const resumeCount = db.query("SELECT COUNT(*) as cnt FROM resumes").get() as { cnt: number };
if (resumeCount.cnt === 0) {
  seedDatabase();
}

function seedDatabase() {
  const now = new Date().toISOString();

  // === SEED RESUMES ===
  const resume1: Resume = {
    id: "r1",
    title: "Python Developer / Fullstack",
    position: "Python Developer",
    skills: ["Python", "Django", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker", "Redis", "Celery", "Git"],
    salary: "250 000 - 350 000 \u20BD",
    salaryFrom: 250000,
    salaryTo: 350000,
    currency: "RUR",
    city: "Москва",
    experience: "5 лет",
    experienceYears: 5,
    education: "МГТУ им. Баумана, Информатика и вычислительная техника",
    about: "Опытный Python-разработчик с 5-летним стажем в создании высоконагруженных веб-сервисов. Специализируюсь на FastAPI, Django и микросервисной архитектуре. Имею опыт руководства небольшой командой (3 человека). Увлекаюсь оптимизацией производительности и DevOps-практиками. Ищу позицию Senior/Lead Python Developer в продуктовой компании.",
    lastSync: "2026-06-05T10:30:00",
    isDefault: true,
    experienceEntries: [
      {
        id: "e1",
        company: "TechCorp",
        position: "Senior Python Developer",
        startDate: "2023-03",
        endDate: null,
        description: "Разработка и поддержка микросервисной платформы для обработки платежей. Руководство командой из 3 разработчиков. Внедрение CI/CD пайплайнов, оптимизация запросов к БД (снижение времени ответа на 40%).",
      },
      {
        id: "e2",
        company: "DataFlow",
        position: "Python Developer",
        startDate: "2021-01",
        endDate: "2023-02",
        description: "Разработка ETL-пайплайнов для обработки больших данных. Интеграция с внешними API, автоматизация отчётности. Стек: Python, Airflow, PostgreSQL, Redis.",
      },
      {
        id: "e3",
        company: "WebStudio",
        position: "Junior Python Developer",
        startDate: "2019-06",
        endDate: "2020-12",
        description: "Разработка бэкенд-сервисов на Django. REST API, интеграция с фронтендом на React. Изучение основ DevOps и Docker.",
      },
    ],
    educationEntries: [
      {
        id: "ed1",
        institution: "МГТУ им. Н.Э. Баумана",
        degree: "Магистр, Информатика и вычислительная техника",
        year: "2019",
      },
      {
        id: "ed2",
        institution: "МГТУ им. Н.Э. Баумана",
        degree: "Бакалавр, Программная инженерия",
        year: "2017",
      },
    ],
    skillGaps: ["Kubernetes", "gRPC", "Kafka"],
    matchingVacancies: 8,
    totalVacancies: 16,
  };

  const resume2: Resume = {
    id: "r2",
    title: "DevOps / Инженер инфраструктуры",
    position: "DevOps Engineer",
    skills: ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux", "Bash", "Prometheus", "Grafana"],
    salary: "220 000 - 320 000 \u20BD",
    salaryFrom: 220000,
    salaryTo: 320000,
    currency: "RUR",
    city: "Москва",
    experience: "4 года",
    experienceYears: 4,
    education: "МГУ, Факультет ВМК",
    about: "DevOps-инженер с опытом построения и поддержки Kubernetes-кластеров в продакшене. Автоматизация инфраструктуры через Terraform и Ansible. Мониторинг, алертинг, incident management. Ищу позицию Senior DevOps / SRE.",
    lastSync: "2026-06-04T18:00:00",
    isDefault: false,
    experienceEntries: [
      {
        id: "e4",
        company: "CloudProvider",
        position: "DevOps Engineer",
        startDate: "2022-05",
        endDate: null,
        description: "Поддержка Kubernetes-кластеров (50+ нод). Автоматизация деплоя через ArgoCD. Мониторинг на базе Prometheus + Grafana. On-call поддержка.",
      },
      {
        id: "e5",
        company: "FinTech Startup",
        position: "System Administrator",
        startDate: "2020-08",
        endDate: "2022-04",
        description: "Администрирование Linux-серверов. Настройка CI/CD пайплайнов (GitLab CI). Миграция в облако AWS.",
      },
    ],
    educationEntries: [
      {
        id: "ed3",
        institution: "МГУ им. М.В. Ломоносова",
        degree: "Магистр, Вычислительная математика и кибернетика",
        year: "2020",
      },
    ],
    skillGaps: ["Ansible", "Helm", "Service Mesh"],
    matchingVacancies: 5,
    totalVacancies: 16,
  };

  const insertResume = db.prepare(`
    INSERT INTO resumes (id, title, position, skills, salary, salaryFrom, salaryTo, currency,
      city, experience, experienceYears, education, about, lastSync, isDefault,
      experienceEntries, educationEntries, skillGaps, matchingVacancies, totalVacancies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of [resume1, resume2]) {
    insertResume.run(
      r.id, r.title, r.position, JSON.stringify(r.skills), r.salary,
      r.salaryFrom, r.salaryTo, r.currency, r.city, r.experience,
      r.experienceYears, r.education, r.about, r.lastSync,
      r.isDefault ? 1 : 0,
      JSON.stringify(r.experienceEntries),
      JSON.stringify(r.educationEntries),
      JSON.stringify(r.skillGaps),
      r.matchingVacancies, r.totalVacancies
    );
  }

  // === SEED VACANCIES ===
  const vacancies: Vacancy[] = [
    {
      id: "v1", title: "Python Developer", company: "Яндекс",
      salary: "250 000 - 350 000 \u20BD", matchScore: 92, location: "Москва",
      experience: "3-6 лет",
      description: "Ищем опытного Python-разработчика для работы над внутренними сервисами поиска. Участие в проектировании и разработке высоконагруженных систем, код-ревью, менторинг.",
      skills: ["Python", "Django", "PostgreSQL", "Docker", "Kubernetes", "Redis"],
      status: "new", publishedAt: "2026-06-05", url: "#",
      matchBreakdown: { skills: 95, experience: 90, salary: 88, location: 95 },
    },
    {
      id: "v2", title: "Frontend Developer (React)", company: "Тинькофф",
      salary: "200 000 - 300 000 \u20BD", matchScore: 88, location: "Москва",
      experience: "2-5 лет",
      description: "Разработка клиентских приложений для финансовых сервисов. Работа с дизайн-системой, оптимизация производительности.",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Jest"],
      status: "new", publishedAt: "2026-06-05", url: "#",
      matchBreakdown: { skills: 90, experience: 85, salary: 92, location: 85 },
    },
    {
      id: "v3", title: "DevOps Engineer", company: "Сбер",
      salary: "220 000 - 320 000 \u20BD", matchScore: 85, location: "Москва",
      experience: "3-6 лет",
      description: "Поддержка и развитие CI/CD пайплайнов, управление Kubernetes-кластерами, автоматизация инфраструктуры.",
      skills: ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux"],
      status: "new", publishedAt: "2026-06-04", url: "#",
      matchBreakdown: { skills: 82, experience: 88, salary: 85, location: 85 },
    },
    {
      id: "v4", title: "Data Analyst", company: "ВКонтакте",
      salary: "180 000 - 260 000 \u20BD", matchScore: 78, location: "Санкт-Петербург",
      experience: "1-3 года",
      description: "Анализ пользовательского поведения, построение дашбордов, A/B тестирование.",
      skills: ["SQL", "Python", "Tableau", "A/B тесты", "BigQuery"],
      status: "new", publishedAt: "2026-06-04", url: "#",
      matchBreakdown: { skills: 75, experience: 80, salary: 82, location: 75 },
    },
    {
      id: "v5", title: "Backend Developer (Go)", company: "Авито",
      salary: "280 000 - 400 000 \u20BD", matchScore: 73, location: "Москва",
      experience: "3-6 лет",
      description: "Разработка микросервисной архитектуры для платформы объявлений.",
      skills: ["Go", "gRPC", "PostgreSQL", "Kafka", "Microservices"],
      status: "new", publishedAt: "2026-06-04", url: "#",
      matchBreakdown: { skills: 65, experience: 85, salary: 70, location: 72 },
    },
    {
      id: "v6", title: "Fullstack Developer", company: "Ozon",
      salary: "230 000 - 330 000 \u20BD", matchScore: 81, location: "Москва",
      experience: "2-5 лет",
      description: "Полнокружная разработка внутренних инструментов для управления складами.",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
      status: "applied", publishedAt: "2026-06-03", url: "#",
      matchBreakdown: { skills: 85, experience: 78, salary: 80, location: 81 },
    },
    {
      id: "v7", title: "ML Engineer", company: "МТС",
      salary: "300 000 - 450 000 \u20BD", matchScore: 68, location: "Москва",
      experience: "3-6 лет",
      description: "Разработка ML-моделей для рекомендательных систем.",
      skills: ["Python", "PyTorch", "MLOps", "Kubernetes", "SQL"],
      status: "new", publishedAt: "2026-06-03", url: "#",
      matchBreakdown: { skills: 60, experience: 75, salary: 70, location: 67 },
    },
    {
      id: "v8", title: "QA Automation Engineer", company: "Лаборатория Касперского",
      salary: "150 000 - 220 000 \u20BD", matchScore: 62, location: "Москва",
      experience: "2-4 года",
      description: "Автоматизация тестирования антивирусных продуктов.",
      skills: ["Python", "Selenium", "Pytest", "CI/CD", "Docker"],
      status: "skipped", publishedAt: "2026-06-03", url: "#",
      matchBreakdown: { skills: 55, experience: 70, salary: 65, location: 58 },
    },
    {
      id: "v9", title: "System Administrator (Linux)", company: "Ростелеком",
      salary: "120 000 - 180 000 \u20BD", matchScore: 55, location: "Новосибирск",
      experience: "3-6 лет",
      description: "Администрирование серверной инфраструктуры, мониторинг.",
      skills: ["Linux", "Bash", "Zabbix", "Nginx", "Networking"],
      status: "skipped", publishedAt: "2026-06-02", url: "#",
      matchBreakdown: { skills: 50, experience: 65, salary: 45, location: 60 },
    },
    {
      id: "v10", title: "Senior Python Developer", company: "HeadHunter",
      salary: "350 000 - 500 000 \u20BD", matchScore: 91, location: "Москва",
      experience: "5+ лет",
      description: "Разработка ядра платформы hh.ru. Работа с высоконагруженными сервисами.",
      skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery", "Docker"],
      status: "applied", publishedAt: "2026-06-02", url: "#",
      matchBreakdown: { skills: 93, experience: 92, salary: 88, location: 91 },
    },
    {
      id: "v11", title: "React Native Developer", company: "Delivery Club",
      salary: "200 000 - 280 000 \u20BD", matchScore: 74, location: "Москва",
      experience: "2-4 года",
      description: "Разработка мобильного приложения для доставки еды.",
      skills: ["React Native", "TypeScript", "Redux", "Firebase"],
      status: "new", publishedAt: "2026-06-02", url: "#",
      matchBreakdown: { skills: 70, experience: 78, salary: 72, location: 76 },
    },
    {
      id: "v12", title: "Cloud Architect", company: "VK Cloud",
      salary: "400 000 - 550 000 \u20BD", matchScore: 65, location: "Санкт-Петербург",
      experience: "5+ лет",
      description: "Проектирование облачных решений для enterprise-клиентов.",
      skills: ["AWS", "Azure", "Terraform", "Kubernetes", "Security"],
      status: "new", publishedAt: "2026-06-01", url: "#",
      matchBreakdown: { skills: 55, experience: 75, salary: 60, location: 70 },
    },
    {
      id: "v13", title: "Data Engineer", company: "СберМаркет",
      salary: "250 000 - 350 000 \u20BD", matchScore: 79, location: "Москва",
      experience: "3-5 лет",
      description: "Построение data pipeline, ETL процессы. Spark, Airflow, Kafka.",
      skills: ["Python", "Spark", "Airflow", "Kafka", "SQL", "Hadoop"],
      status: "new", publishedAt: "2026-06-01", url: "#",
      matchBreakdown: { skills: 82, experience: 76, salary: 80, location: 78 },
    },
    {
      id: "v14", title: "iOS Developer", company: "Тинькофф",
      salary: "250 000 - 380 000 \u20BD", matchScore: 48, location: "Москва",
      experience: "2-5 лет",
      description: "Разработка мобильного банковского приложения. Swift, UIKit.",
      skills: ["Swift", "UIKit", "CoreData", "CI/CD"],
      status: "blacklisted", publishedAt: "2026-05-31", url: "#",
      matchBreakdown: { skills: 35, experience: 60, salary: 45, location: 52 },
    },
    {
      id: "v15", title: "Tech Lead (Python)", company: "Студия Артемия Лебедева",
      salary: "320 000 - 450 000 \u20BD", matchScore: 86, location: "Москва",
      experience: "5+ лет",
      description: "Руководство командой из 8 разработчиков. Архитектура, код-ревью, найм.",
      skills: ["Python", "Django", "PostgreSQL", "Docker", "Leadership", "System Design"],
      status: "new", publishedAt: "2026-05-31", url: "#",
      matchBreakdown: { skills: 88, experience: 90, salary: 82, location: 84 },
    },
    {
      id: "v16", title: "Junior Python Developer", company: "Стартап FinTech",
      salary: "80 000 - 130 000 \u20BD", matchScore: 42, location: "Удалённо",
      experience: "0-1 год",
      description: "Разработка бэкенд-сервисов для финтех-стартапа.",
      skills: ["Python", "FastAPI", "SQL", "Git"],
      status: "new", publishedAt: "2026-05-30", url: "#",
      matchBreakdown: { skills: 40, experience: 30, salary: 35, location: 63 },
    },
  ];

  const insertVacancy = db.prepare(`
    INSERT INTO vacancies (id, title, company, salary, matchScore, location, experience,
      description, skills, status, publishedAt, url, matchBreakdown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const v of vacancies) {
    insertVacancy.run(
      v.id, v.title, v.company, v.salary, v.matchScore, v.location,
      v.experience, v.description, JSON.stringify(v.skills), v.status,
      v.publishedAt, v.url, JSON.stringify(v.matchBreakdown)
    );
  }

  // === SEED NEGOTIATIONS ===
  const negotiations: Negotiation[] = [
    {
      id: "n1", vacancyTitle: "Senior Python Developer", company: "HeadHunter",
      employerName: "Анна Смирнова", status: "active", unread: 2,
      lastMessage: "Здравствуйте! Нам очень интересен ваш опыт. Когда вам удобно пройти техническое интервью?",
      lastMessageTime: "2026-06-05T14:30:00", autoReply: true,
      messages: [
        { id: "m1", sender: "bot", text: "Добрый день! Спасибо за приглашение. Меня заинтересовала вакансия Senior Python Developer. Готов обсудить детали.", timestamp: "2026-06-04T09:15:00", isAutoReply: true },
        { id: "m2", sender: "employer", text: "Здравствуйте! Рады вашему отклику. Расскажите, пожалуйста, о вашем опыте работы с высоконагруженными системами.", timestamp: "2026-06-04T11:20:00", isAutoReply: false },
        { id: "m3", sender: "bot", text: "Последние 3 года работаю с сервисами, обрабатывающими 10 000+ RPS. Использовал FastAPI, PostgreSQL с шардированием, Redis для кэширования.", timestamp: "2026-06-04T11:25:00", isAutoReply: true },
        { id: "m4", sender: "employer", text: "Отличный опыт! У нас похожие задачи. Какой уровень дохода вы рассматриваете?", timestamp: "2026-06-05T10:00:00", isAutoReply: false },
        { id: "m5", sender: "bot", text: "Мои ожидания по доходу: от 350 000 руб. на руки. Готов обсуждать компенсационный пакет.", timestamp: "2026-06-05T10:05:00", isAutoReply: true },
        { id: "m6", sender: "employer", text: "Здравствуйте! Нам очень интересен ваш опыт. Когда вам удобно пройти техническое интервью?", timestamp: "2026-06-05T14:30:00", isAutoReply: false },
      ],
    },
    {
      id: "n2", vacancyTitle: "Fullstack Developer", company: "Ozon",
      employerName: "Дмитрий Козлов", status: "active", unread: 0,
      lastMessage: "Спасибо, ваше резюме передано технической команде. Ожидайте обратную связь.",
      lastMessageTime: "2026-06-05T09:00:00", autoReply: true,
      messages: [
        { id: "m7", sender: "bot", text: "Добрый день! Откликаюсь на позицию Fullstack Developer. Имею опыт работы и с React, и с Node.js.", timestamp: "2026-06-04T14:00:00", isAutoReply: true },
        { id: "m8", sender: "employer", text: "Спасибо, ваше резюме передано технической команде. Ожидайте обратную связь.", timestamp: "2026-06-05T09:00:00", isAutoReply: false },
      ],
    },
    {
      id: "n3", vacancyTitle: "Python Developer", company: "Яндекс",
      employerName: "Елена Петрова", status: "waiting", unread: 1,
      lastMessage: "Мы бы хотели пригласить вас на ознакомительный звонок на следующей неделе.",
      lastMessageTime: "2026-06-05T11:45:00", autoReply: false,
      messages: [
        { id: "m9", sender: "me", text: "Здравствуйте! Очень заинтересован в вакансии Python Developer в Яндексе.", timestamp: "2026-06-03T16:30:00", isAutoReply: false },
        { id: "m10", sender: "employer", text: "Здравствуйте! Спасибо за отклик. Можете рассказать о вашем опыте работы с микросервисами?", timestamp: "2026-06-04T10:00:00", isAutoReply: false },
        { id: "m11", sender: "me", text: "Да, конечно. Работал с микросервисной архитектурой на последнем проекте. FastAPI для API-шлюза, gRPC для межсервисного взаимодействия.", timestamp: "2026-06-04T10:15:00", isAutoReply: false },
        { id: "m12", sender: "employer", text: "Мы бы хотели пригласить вас на ознакомительный звонок на следующей неделе.", timestamp: "2026-06-05T11:45:00", isAutoReply: false },
      ],
    },
    {
      id: "n4", vacancyTitle: "Data Engineer", company: "СберМаркет",
      employerName: "Игорь Волков", status: "active", unread: 0,
      lastMessage: "Отправил вам тестовое задание на почту. Жду решения в течение 3 дней.",
      lastMessageTime: "2026-06-04T16:00:00", autoReply: true,
      messages: [
        { id: "m13", sender: "bot", text: "Добрый день! Откликаюсь на позицию Data Engineer. Имею опыт с Spark, Airflow и Kafka.", timestamp: "2026-06-03T12:00:00", isAutoReply: true },
        { id: "m14", sender: "employer", text: "Приветствую! Расскажите о самом сложном ETL-проекте, который вы реализовывали.", timestamp: "2026-06-03T15:30:00", isAutoReply: false },
        { id: "m15", sender: "bot", text: "Самый сложный проект — миграция дашбордов аналитики из on-premise Hadoop в облачный Spark. Объём данных: 50TB, 200+ ETL пайплайнов.", timestamp: "2026-06-03T15:35:00", isAutoReply: true },
        { id: "m16", sender: "employer", text: "Отправил вам тестовое задание на почту. Жду решения в течение 3 дней.", timestamp: "2026-06-04T16:00:00", isAutoReply: false },
      ],
    },
    {
      id: "n5", vacancyTitle: "Tech Lead (Python)", company: "Студия Артемия Лебедева",
      employerName: "Мария Иванова", status: "closed", unread: 0,
      lastMessage: "К сожалению, позиция уже закрыта. Спасибо за ваш отклик!",
      lastMessageTime: "2026-06-02T17:00:00", autoReply: false,
      messages: [
        { id: "m17", sender: "bot", text: "Здравствуйте! Откликаюсь на позицию Tech Lead. Имею 5 лет опыта в Python и опыт руководства командой.", timestamp: "2026-06-01T10:00:00", isAutoReply: true },
        { id: "m18", sender: "employer", text: "К сожалению, позиция уже закрыта. Спасибо за ваш отклик!", timestamp: "2026-06-02T17:00:00", isAutoReply: false },
      ],
    },
  ];

  const insertNegotiation = db.prepare(`
    INSERT INTO negotiations (id, vacancyTitle, company, employerName, status, unread,
      lastMessage, lastMessageTime, autoReply)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO negotiation_messages (id, negotiationId, sender, text, timestamp, isAutoReply)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const n of negotiations) {
    insertNegotiation.run(
      n.id, n.vacancyTitle, n.company, n.employerName, n.status,
      n.unread, n.lastMessage, n.lastMessageTime, n.autoReply ? 1 : 0
    );
    for (const m of n.messages) {
      insertMessage.run(m.id, n.id, m.sender, m.text, m.timestamp, m.isAutoReply ? 1 : 0);
    }
  }

  // === SEED ACTIVITY LOG ===
  const activityLog: ActivityLogEntry[] = [
    { id: "a1", type: "apply", description: "Отклик отправлен: Senior Python Developer — HeadHunter", timestamp: "2026-06-05T14:30:00" },
    { id: "a2", type: "interview", description: "Приглашение на интервью: Python Developer — Яндекс", timestamp: "2026-06-05T11:45:00" },
    { id: "a3", type: "message", description: "Авто-ответ: Fullstack Developer — Ozon", timestamp: "2026-06-05T09:00:00" },
    { id: "a4", type: "apply", description: "Отклик отправлен: Fullstack Developer — Ozon", timestamp: "2026-06-04T14:00:00" },
    { id: "a5", type: "message", description: "Сообщение от работодателя: Data Engineer — СберМаркет", timestamp: "2026-06-04T16:00:00" },
    { id: "a6", type: "skip", description: "Пропущена вакансия: iOS Developer — Тинькофф (совпадение 48%)", timestamp: "2026-06-03T20:00:00" },
    { id: "a7", type: "blacklist", description: "Вакансия добавлена в чёрный список: System Administrator — Ростелеком", timestamp: "2026-06-03T19:30:00" },
    { id: "a8", type: "sync", description: "Резюме синхронизированы с HH.ru", timestamp: "2026-06-03T10:00:00" },
    { id: "a9", type: "apply", description: "Отклик отправлен: Python Developer — Яндекс", timestamp: "2026-06-03T09:15:00" },
    { id: "a10", type: "auth", description: "Авторизация HH.ru подтверждена, токен обновлён", timestamp: "2026-06-02T08:00:00" },
  ];

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, ?, ?, ?)
  `);
  for (const a of activityLog) {
    insertActivity.run(a.id, a.type, a.description, a.timestamp);
  }

  // === SEED BOT STATUS ===
  db.prepare(`
    INSERT INTO bot_status (id, isOnline, mode, lastActivity, uptime, appliedToday, dailyLimit, errors, hhConnected, tokenExpiry)
    VALUES (1, 1, 'semi-auto', ?, '3д 7ч 22м', 4, 50, 1, 1, '2026-06-12T08:00:00')
  `).run("2026-06-05T14:30:00");

  // === SEED SETTINGS ===
  db.prepare(`
    INSERT INTO settings (id, mode, careerDirection, letterTone, dailyLimit, searchInterval, minMatchScore)
    VALUES (1, 'semi-auto', 'Python Developer', 'confident', 50, 15, 70)
  `).run();

  // === SEED CHART DATA ===
  const chartData: ChartData[] = [
    { day: "30 мая", applications: 3, interviews: 0 },
    { day: "31 мая", applications: 5, interviews: 1 },
    { day: "1 июня", applications: 2, interviews: 0 },
    { day: "2 июня", applications: 6, interviews: 2 },
    { day: "3 июня", applications: 4, interviews: 1 },
    { day: "4 июня", applications: 3, interviews: 1 },
    { day: "5 июня", applications: 4, interviews: 2 },
  ];

  const insertChart = db.prepare(`
    INSERT INTO chart_data (day, applications, interviews) VALUES (?, ?, ?)
  `);
  for (const c of chartData) {
    insertChart.run(c.day, c.applications, c.interviews);
  }

  console.log("[DB] Database seeded successfully");
}

// Helper to parse a resume row from DB
export function parseResume(row: any): Resume {
  return {
    ...row,
    skills: JSON.parse(row.skills),
    experienceEntries: JSON.parse(row.experienceEntries),
    educationEntries: JSON.parse(row.educationEntries),
    skillGaps: JSON.parse(row.skillGaps),
    isDefault: row.isDefault === 1,
  };
}

// Helper to parse a vacancy row from DB
export function parseVacancy(row: any): Vacancy {
  return {
    ...row,
    skills: JSON.parse(row.skills),
    matchBreakdown: JSON.parse(row.matchBreakdown),
  };
}

// Helper to parse a negotiation with messages
export function parseNegotiation(row: any, messages: any[]): Negotiation {
  return {
    ...row,
    unread: row.unread,
    autoReply: row.autoReply === 1,
    messages: messages.map((m: any) => ({
      ...m,
      isAutoReply: m.isAutoReply === 1,
    })),
  };
}

export { db };
