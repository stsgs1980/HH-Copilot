export interface Vacancy {
  id: string;
  title: string;
  company: string;
  salary: string;
  matchScore: number;
  location: string;
  experience: string;
  description: string;
  skills: string[];
  status: "new" | "applied" | "skipped" | "blacklisted";
  publishedAt: string;
  url: string;
  matchBreakdown: {
    skills: number;
    experience: number;
    salary: number;
    location: number;
  };
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null; // null = current
  description: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  year: string;
}

export interface Resume {
  id: string;
  title: string;
  position: string;
  skills: string[];
  salary: string;
  salaryFrom: number;
  salaryTo: number;
  currency: "RUR" | "USD" | "EUR";
  city: string;
  experience: string;
  experienceYears: number;
  education: string;
  about: string;
  lastSync: string;
  isDefault: boolean;
  experienceEntries: ExperienceEntry[];
  educationEntries: EducationEntry[];
  skillGaps: string[]; // skills that would increase match score
  matchingVacancies: number; // how many vacancies match
  totalVacancies: number;
}

export interface NegotiationMessage {
  id: string;
  sender: "employer" | "me" | "bot";
  text: string;
  timestamp: string;
  isAutoReply: boolean;
}

export interface Negotiation {
  id: string;
  vacancyTitle: string;
  company: string;
  employerName: string;
  status: "active" | "closed" | "waiting";
  unread: number;
  lastMessage: string;
  lastMessageTime: string;
  autoReply: boolean;
  messages: NegotiationMessage[];
}

export interface ActivityLogEntry {
  id: string;
  type: "apply" | "interview" | "skip" | "blacklist" | "sync" | "auth" | "message";
  description: string;
  timestamp: string;
}

export interface BotStatus {
  isOnline: boolean;
  mode: "auto" | "semi-auto" | "manual";
  lastActivity: string;
  uptime: string;
  appliedToday: number;
  dailyLimit: number;
  errors: number;
  hhConnected: boolean;
  tokenExpiry: string;
}

export interface DashboardStats {
  totalVacancies: number;
  appliedToday: number;
  interviewInvites: number;
  dailyLimitRemaining: number;
}

export interface ChartData {
  day: string;
  applications: number;
  interviews: number;
}

export const mockVacancies: Vacancy[] = [
  {
    id: "v1",
    title: "Python Developer",
    company: "Яндекс",
    salary: "250 000 - 350 000 \u20BD",
    matchScore: 92,
    location: "Москва",
    experience: "3-6 лет",
    description: "Ищем опытного Python-разработчика для работы над внутренними сервисами поиска. Участие в проектировании и разработке высоконагруженных систем, код-ревью, менторинг.",
    skills: ["Python", "Django", "PostgreSQL", "Docker", "Kubernetes", "Redis"],
    status: "new",
    publishedAt: "2026-06-05",
    url: "#",
    matchBreakdown: { skills: 95, experience: 90, salary: 88, location: 95 },
  },
  {
    id: "v2",
    title: "Frontend Developer (React)",
    company: "Тинькофф",
    salary: "200 000 - 300 000 \u20BD",
    matchScore: 88,
    location: "Москва",
    experience: "2-5 лет",
    description: "Разработка клиентских приложений для финансовых сервисов. Работа с дизайн-системой, оптимизация производительности, участие в спринтах.",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Jest"],
    status: "new",
    publishedAt: "2026-06-05",
    url: "#",
    matchBreakdown: { skills: 90, experience: 85, salary: 92, location: 85 },
  },
  {
    id: "v3",
    title: "DevOps Engineer",
    company: "Сбер",
    salary: "220 000 - 320 000 \u20BD",
    matchScore: 85,
    location: "Москва",
    experience: "3-6 лет",
    description: "Поддержка и развитие CI/CD пайплайнов, управление Kubernetes-кластерами, автоматизация инфраструктуры.",
    skills: ["Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Linux"],
    status: "new",
    publishedAt: "2026-06-04",
    url: "#",
    matchBreakdown: { skills: 82, experience: 88, salary: 85, location: 85 },
  },
  {
    id: "v4",
    title: "Data Analyst",
    company: "ВКонтакте",
    salary: "180 000 - 260 000 \u20BD",
    matchScore: 78,
    location: "Санкт-Петербург",
    experience: "1-3 года",
    description: "Анализ пользовательского поведения, построение дашбордов, A/B тестирование, подготовка аналитических отчётов.",
    skills: ["SQL", "Python", "Tableau", "A/B тесты", "BigQuery"],
    status: "new",
    publishedAt: "2026-06-04",
    url: "#",
    matchBreakdown: { skills: 75, experience: 80, salary: 82, location: 75 },
  },
  {
    id: "v5",
    title: "Backend Developer (Go)",
    company: "Авито",
    salary: "280 000 - 400 000 \u20BD",
    matchScore: 73,
    location: "Москва",
    experience: "3-6 лет",
    description: "Разработка микросервисной архитектуры для платформы объявлений. Высокие нагрузки, миллионы пользователей.",
    skills: ["Go", "gRPC", "PostgreSQL", "Kafka", "Microservices"],
    status: "new",
    publishedAt: "2026-06-04",
    url: "#",
    matchBreakdown: { skills: 65, experience: 85, salary: 70, location: 72 },
  },
  {
    id: "v6",
    title: "Fullstack Developer",
    company: "Ozon",
    salary: "230 000 - 330 000 \u20BD",
    matchScore: 81,
    location: "Москва",
    experience: "2-5 лет",
    description: "Полнокружная разработка внутренних инструментов для управления складами. Frontend на React, backend на Node.js.",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
    status: "applied",
    publishedAt: "2026-06-03",
    url: "#",
    matchBreakdown: { skills: 85, experience: 78, salary: 80, location: 81 },
  },
  {
    id: "v7",
    title: "ML Engineer",
    company: "МТС",
    salary: "300 000 - 450 000 \u20BD",
    matchScore: 68,
    location: "Москва",
    experience: "3-6 лет",
    description: "Разработка ML-моделей для рекомендательных систем. Обучение, деплой и мониторинг моделей в продакшене.",
    skills: ["Python", "PyTorch", "MLOps", "Kubernetes", "SQL"],
    status: "new",
    publishedAt: "2026-06-03",
    url: "#",
    matchBreakdown: { skills: 60, experience: 75, salary: 70, location: 67 },
  },
  {
    id: "v8",
    title: "QA Automation Engineer",
    company: "Лаборатория Касперского",
    salary: "150 000 - 220 000 \u20BD",
    matchScore: 62,
    location: "Москва",
    experience: "2-4 года",
    description: "Автоматизация тестирования антивирусных продуктов. Разработка фреймворков, интеграционное тестирование.",
    skills: ["Python", "Selenium", "Pytest", "CI/CD", "Docker"],
    status: "skipped",
    publishedAt: "2026-06-03",
    url: "#",
    matchBreakdown: { skills: 55, experience: 70, salary: 65, location: 58 },
  },
  {
    id: "v9",
    title: "System Administrator (Linux)",
    company: "Ростелеком",
    salary: "120 000 - 180 000 \u20BD",
    matchScore: 55,
    location: "Новосибирск",
    experience: "3-6 лет",
    description: "Администрирование серверной инфраструктуры, мониторинг, резервное копирование, настройка сетевого оборудования.",
    skills: ["Linux", "Bash", "Zabbix", "Nginx", "Networking"],
    status: "skipped",
    publishedAt: "2026-06-02",
    url: "#",
    matchBreakdown: { skills: 50, experience: 65, salary: 45, location: 60 },
  },
  {
    id: "v10",
    title: "Senior Python Developer",
    company: "HeadHunter",
    salary: "350 000 - 500 000 \u20BD",
    matchScore: 91,
    location: "Москва",
    experience: "5+ лет",
    description: "Разработка ядра платформы hh.ru. Работа с высоконагруженными сервисами, участие в архитектурных решениях.",
    skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery", "Docker"],
    status: "applied",
    publishedAt: "2026-06-02",
    url: "#",
    matchBreakdown: { skills: 93, experience: 92, salary: 88, location: 91 },
  },
  {
    id: "v11",
    title: "React Native Developer",
    company: "Delivery Club",
    salary: "200 000 - 280 000 \u20BD",
    matchScore: 74,
    location: "Москва",
    experience: "2-4 года",
    description: "Разработка мобильного приложения для доставки еды. Работа с навигацией, картами, пуш-уведомлениями.",
    skills: ["React Native", "TypeScript", "Redux", "Firebase"],
    status: "new",
    publishedAt: "2026-06-02",
    url: "#",
    matchBreakdown: { skills: 70, experience: 78, salary: 72, location: 76 },
  },
  {
    id: "v12",
    title: "Cloud Architect",
    company: "VK Cloud",
    salary: "400 000 - 550 000 \u20BD",
    matchScore: 65,
    location: "Санкт-Петербург",
    experience: "5+ лет",
    description: "Проектирование облачных решений для enterprise-клиентов. Миграция в облако, оптимизация затрат.",
    skills: ["AWS", "Azure", "Terraform", "Kubernetes", "Security"],
    status: "new",
    publishedAt: "2026-06-01",
    url: "#",
    matchBreakdown: { skills: 55, experience: 75, salary: 60, location: 70 },
  },
  {
    id: "v13",
    title: "Data Engineer",
    company: "СберМаркет",
    salary: "250 000 - 350 000 \u20BD",
    matchScore: 79,
    location: "Москва",
    experience: "3-5 лет",
    description: "Построение data pipeline, ETL процессы, работа с озёрами данных. Spark, Airflow, Kafka.",
    skills: ["Python", "Spark", "Airflow", "Kafka", "SQL", "Hadoop"],
    status: "new",
    publishedAt: "2026-06-01",
    url: "#",
    matchBreakdown: { skills: 82, experience: 76, salary: 80, location: 78 },
  },
  {
    id: "v14",
    title: "iOS Developer",
    company: "Тинькофф",
    salary: "250 000 - 380 000 \u20BD",
    matchScore: 48,
    location: "Москва",
    experience: "2-5 лет",
    description: "Разработка мобильного банковского приложения. Swift, UIKit, работа с биометрией и безопасностью.",
    skills: ["Swift", "UIKit", "CoreData", "CI/CD"],
    status: "blacklisted",
    publishedAt: "2026-05-31",
    url: "#",
    matchBreakdown: { skills: 35, experience: 60, salary: 45, location: 52 },
  },
  {
    id: "v15",
    title: "Tech Lead (Python)",
    company: "Студия Артемия Лебедева",
    salary: "320 000 - 450 000 \u20BD",
    matchScore: 86,
    location: "Москва",
    experience: "5+ лет",
    description: "Руководство командой из 8 разработчиков. Архитектура, код-ревью, найм, онбординг. Проекты для крупных клиентов.",
    skills: ["Python", "Django", "PostgreSQL", "Docker", "Leadership", "System Design"],
    status: "new",
    publishedAt: "2026-05-31",
    url: "#",
    matchBreakdown: { skills: 88, experience: 90, salary: 82, location: 84 },
  },
  {
    id: "v16",
    title: "Junior Python Developer",
    company: "Стартап FinTech",
    salary: "80 000 - 130 000 \u20BD",
    matchScore: 42,
    location: "Удалённо",
    experience: "0-1 год",
    description: "Разработка бэкенд-сервисов для финтех-стартапа. Обучение под руководством наставника, быстрый рост.",
    skills: ["Python", "FastAPI", "SQL", "Git"],
    status: "new",
    publishedAt: "2026-05-30",
    url: "#",
    matchBreakdown: { skills: 40, experience: 30, salary: 35, location: 63 },
  },
];

export const mockResumes: Resume[] = [
  {
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
    about: "Опытный Python-разработчик с 5-летним стажем в создании высоконагруженных веб-сервисов. Специализируюсь на FastAPI и Django, имею опыт работы с микросервисной архитектурой. Успешно оптимизировал систему, обрабатывающую 10 000+ RPS. Активный участник open-source сообщества, автор нескольких библиотек для работы с асинхронным кодом.",
    lastSync: "2026-06-05T10:30:00",
    isDefault: true,
    experienceEntries: [
      {
        id: "e1",
        company: "Яндекс",
        position: "Senior Python Developer",
        startDate: "2023-03",
        endDate: null,
        description: "Разработка и поддержка внутренних сервисов поиска. Проектирование API на FastAPI, оптимизация PostgreSQL запросов, внедрение кэширования на Redis. Руководство группой из 3 разработчиков. Сократил среднее время ответа API с 200мс до 50мс.",
      },
      {
        id: "e2",
        company: "Тинькофф",
        position: "Python Developer",
        startDate: "2021-06",
        endDate: "2023-02",
        description: "Разработка бэкенд-сервисов для мобильного банка. Работа с Django REST Framework, Celery для асинхронных задач, PostgreSQL. Участвовал в миграции монолита на микросервисную архитектуру. Обрабатывал до 5000 RPS в пиковые нагрузки.",
      },
      {
        id: "e3",
        company: "Digital Horizon",
        position: "Junior Python Developer",
        startDate: "2019-08",
        endDate: "2021-05",
        description: "Разработка REST API для финтех-платформы. Написание unit и интеграционных тестов, настройка CI/CD пайплайнов. Первое знакомство с Docker и Kubernetes в продакшене.",
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
    skillGaps: ["Kubernetes", "gRPC", "Kafka", "System Design"],
    matchingVacancies: 12,
    totalVacancies: 156,
  },
  {
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
    about: "DevOps-инженер с опытом построения и поддержки облачной инфраструктуры. Экспертиза в Kubernetes, Terraform и CI/CD. Автоматизировал развертывание 50+ микросервисов, сократив время деплоя с 2 часов до 15 минут. Сторонник Infrastructure as Code и GitOps подходов.",
    lastSync: "2026-06-04T18:00:00",
    isDefault: false,
    experienceEntries: [
      {
        id: "e4",
        company: "Сбер",
        position: "DevOps Engineer",
        startDate: "2023-01",
        endDate: null,
        description: "Поддержка и развитие CI/CD пайплайнов для 30+ проектов. Управление Kubernetes-кластерами (200+ подов). Внедрение GitOps с ArgoCD. Мониторинг на базе Prometheus + Grafana. Автоматизация инфраструктуры через Terraform.",
      },
      {
        id: "e5",
        company: "VK Cloud",
        position: "Cloud Engineer",
        startDate: "2021-04",
        endDate: "2022-12",
        description: "Проектирование облачных решений для enterprise-клиентов. Миграция on-premise инфраструктуры в облако. Настройка мониторинга, алертинга и auto-scaling. Работа с AWS и OpenStack.",
      },
    ],
    educationEntries: [
      {
        id: "ed3",
        institution: "МГУ им. М.В. Ломоносова",
        degree: "Магистр, Факультет ВМК",
        year: "2020",
      },
      {
        id: "ed4",
        institution: "МГУ им. М.В. Ломоносова",
        degree: "Бакалавр, Прикладная математика и информатика",
        year: "2018",
      },
    ],
    skillGaps: ["Python", "Ansible", "Helm", "Security"],
    matchingVacancies: 8,
    totalVacancies: 156,
  },
];

export const mockNegotiations: Negotiation[] = [
  {
    id: "n1",
    vacancyTitle: "Senior Python Developer",
    company: "HeadHunter",
    employerName: "Анна Смирнова",
    status: "active",
    unread: 2,
    lastMessage: "Здравствуйте! Нам очень интересен ваш опыт. Когда вам удобно пройти техническое интервью?",
    lastMessageTime: "2026-06-05T14:30:00",
    autoReply: true,
    messages: [
      {
        id: "m1",
        sender: "bot",
        text: "Добрый день! Спасибо за приглашение. Меня заинтересовала вакансия Senior Python Developer. Готов обсудить детали.",
        timestamp: "2026-06-04T09:15:00",
        isAutoReply: true,
      },
      {
        id: "m2",
        sender: "employer",
        text: "Здравствуйте! Рады вашему отклику. Расскажите, пожалуйста, о вашем опыте работы с высоконагруженными системами.",
        timestamp: "2026-06-04T11:20:00",
        isAutoReply: false,
      },
      {
        id: "m3",
        sender: "bot",
        text: "Последние 3 года работаю с сервисами, обрабатывающими 10 000+ RPS. Использовал FastAPI, PostgreSQL с шардированием, Redis для кэширования. Есть опыт оптимизации запросов и снижения нагрузки на БД.",
        timestamp: "2026-06-04T11:25:00",
        isAutoReply: true,
      },
      {
        id: "m4",
        sender: "employer",
        text: "Отличный опыт! У нас похожие задачи. Какой уровень дохода вы рассматриваете?",
        timestamp: "2026-06-05T10:00:00",
        isAutoReply: false,
      },
      {
        id: "m5",
        sender: "bot",
        text: "Мои ожидания по доходу: от 350 000 руб. на руки. Готов обсуждать компенсационный пакет, включая ДМС и бонусы.",
        timestamp: "2026-06-05T10:05:00",
        isAutoReply: true,
      },
      {
        id: "m6",
        sender: "employer",
        text: "Здравствуйте! Нам очень интересен ваш опыт. Когда вам удобно пройти техническое интервью?",
        timestamp: "2026-06-05T14:30:00",
        isAutoReply: false,
      },
    ],
  },
  {
    id: "n2",
    vacancyTitle: "Fullstack Developer",
    company: "Ozon",
    employerName: "Дмитрий Козлов",
    status: "active",
    unread: 0,
    lastMessage: "Спасибо, ваше резюме передано технической команде. Ожидайте обратную связь.",
    lastMessageTime: "2026-06-05T09:00:00",
    autoReply: true,
    messages: [
      {
        id: "m7",
        sender: "bot",
        text: "Добрый день! Откликаюсь на позицию Fullstack Developer. Имею опыт работы и с React, и с Node.js.",
        timestamp: "2026-06-04T14:00:00",
        isAutoReply: true,
      },
      {
        id: "m8",
        sender: "employer",
        text: "Спасибо, ваше резюме передано технической команде. Ожидайте обратную связь.",
        timestamp: "2026-06-05T09:00:00",
        isAutoReply: false,
      },
    ],
  },
  {
    id: "n3",
    vacancyTitle: "Python Developer",
    company: "Яндекс",
    employerName: "Елена Петрова",
    status: "waiting",
    unread: 1,
    lastMessage: "Мы бы хотели пригласить вас на ознакомительный звонок на следующей неделе.",
    lastMessageTime: "2026-06-05T11:45:00",
    autoReply: false,
    messages: [
      {
        id: "m9",
        sender: "me",
        text: "Здравствуйте! Очень заинтересован в вакансии Python Developer в Яндексе. Готов к обсуждению.",
        timestamp: "2026-06-03T16:30:00",
        isAutoReply: false,
      },
      {
        id: "m10",
        sender: "employer",
        text: "Здравствуйте! Спасибо за отклик. Можете рассказать о вашем опыте работы с микросервисами?",
        timestamp: "2026-06-04T10:00:00",
        isAutoReply: false,
      },
      {
        id: "m11",
        sender: "me",
        text: "Да, конечно. Работал с микросервисной архитектурой на последнем проекте. FastAPI для API-шлюза, gRPC для межсервисного взаимодействия, Celery для фоновых задач.",
        timestamp: "2026-06-04T10:15:00",
        isAutoReply: false,
      },
      {
        id: "m12",
        sender: "employer",
        text: "Мы бы хотели пригласить вас на ознакомительный звонок на следующей неделе.",
        timestamp: "2026-06-05T11:45:00",
        isAutoReply: false,
      },
    ],
  },
  {
    id: "n4",
    vacancyTitle: "Data Engineer",
    company: "СберМаркет",
    employerName: "Игорь Волков",
    status: "active",
    unread: 0,
    lastMessage: "Отправил вам тестовое задание на почту. Жду решения в течение 3 дней.",
    lastMessageTime: "2026-06-04T16:00:00",
    autoReply: true,
    messages: [
      {
        id: "m13",
        sender: "bot",
        text: "Добрый день! Откликаюсь на позицию Data Engineer. Имею опыт с Spark, Airflow и Kafka.",
        timestamp: "2026-06-03T12:00:00",
        isAutoReply: true,
      },
      {
        id: "m14",
        sender: "employer",
        text: "Приветствую! Расскажите о самом сложном ETL-проекте, который вы реализовывали.",
        timestamp: "2026-06-03T15:30:00",
        isAutoReply: false,
      },
      {
        id: "m15",
        sender: "bot",
        text: "Самый сложный проект — миграция дашбордов аналитики из on-premise Hadoop в облачный Spark. Объём данных: 50TB, 200+ ETL пайплайнов. Сократил время выполнения отчётов с 4 часов до 30 минут.",
        timestamp: "2026-06-03T15:35:00",
        isAutoReply: true,
      },
      {
        id: "m16",
        sender: "employer",
        text: "Отправил вам тестовое задание на почту. Жду решения в течение 3 дней.",
        timestamp: "2026-06-04T16:00:00",
        isAutoReply: false,
      },
    ],
  },
  {
    id: "n5",
    vacancyTitle: "Tech Lead (Python)",
    company: "Студия Артемия Лебедева",
    employerName: "Мария Иванова",
    status: "closed",
    unread: 0,
    lastMessage: "К сожалению, позиция уже закрыта. Спасибо за ваш отклик!",
    lastMessageTime: "2026-06-02T17:00:00",
    autoReply: false,
    messages: [
      {
        id: "m17",
        sender: "bot",
        text: "Здравствуйте! Откликаюсь на позицию Tech Lead. Имею 5 лет опыта в Python и опыт руководства командой.",
        timestamp: "2026-06-01T10:00:00",
        isAutoReply: true,
      },
      {
        id: "m18",
        sender: "employer",
        text: "К сожалению, позиция уже закрыта. Спасибо за ваш отклик!",
        timestamp: "2026-06-02T17:00:00",
        isAutoReply: false,
      },
    ],
  },
];

export const mockActivityLog: ActivityLogEntry[] = [
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

export const mockBotStatus: BotStatus = {
  isOnline: true,
  mode: "semi-auto",
  lastActivity: "2026-06-05T14:30:00",
  uptime: "3д 7ч 22м",
  appliedToday: 4,
  dailyLimit: 20,
  errors: 1,
  hhConnected: true,
  tokenExpiry: "2026-06-12T08:00:00",
};

export const mockDashboardStats: DashboardStats = {
  totalVacancies: 156,
  appliedToday: 4,
  interviewInvites: 2,
  dailyLimitRemaining: 16,
};

export const mockChartData: ChartData[] = [
  { day: "30 мая", applications: 3, interviews: 0 },
  { day: "31 мая", applications: 5, interviews: 1 },
  { day: "1 июня", applications: 2, interviews: 0 },
  { day: "2 июня", applications: 6, interviews: 2 },
  { day: "3 июня", applications: 4, interviews: 1 },
  { day: "4 июня", applications: 3, interviews: 1 },
  { day: "5 июня", applications: 4, interviews: 2 },
];

export const activityIcons: Record<ActivityLogEntry["type"], string> = {
  apply: "\u2709\uFE0F",
  interview: "\uD83C\uDF93",
  skip: "\u23ED\uFE0F",
  blacklist: "\uD83D\uDD34",
  sync: "\uD83D\uDD04",
  auth: "\uD83D\uDD12",
  message: "\uD83D\uDCAC",
};
