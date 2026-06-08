// HH.ru API client — uses cookies from hh-session for auth
// API docs: https://api.hh.ru/

import { hhSession } from "@/lib/hh-session";
import { readFile } from "fs/promises";
import { join } from "path";

// ===== Types =====

export interface HHVacancy {
  id: string;
  name: string;
  url: string;
  alternate_url: string; // browser link
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
    gross: boolean;
  } | null;
  employer: {
    id: string;
    name: string;
    url: string;
    logo_urls?: {
      original: string;
      [size: string]: string;
    };
  };
  area: {
    id: string;
    name: string;
  };
  experience: {
    id: string;
    name: string;
  } | null;
  employment: {
    id: string;
    name: string;
  } | null;
  schedule: {
    id: string;
    name: string;
  } | null;
  key_skills: { name: string }[];
  description: string; // HTML
  published_at: string;
  created_at: string;
  type: {
    id: string;
    name: string;
  };
  response_url?: string;
  has_test?: boolean;
  test?: { id: string } | null;
  contacts?: any;
  snippet: {
    requirement: string;
    responsibility: string;
  };
  specialty?: { id: string; name: string }[];
  professional_role?: { id: string; name: string }[];
}

export interface HHVacancySearchResult {
  items: HHVacancy[];
  found: number;
  pages: number;
  per_page: number;
  page: number;
  clusters?: any;
  arguments?: any;
}

export interface VacancySearchParams {
  text?: string;
  area?: number | number[];  // city/region ID(s)
  specialization?: string | string[];
  experience?: string;       // "noExperience" | "between1And3" | "between3And6" | "moreThan6"
  employment?: string;       // "full" | "part" | "project" | "volunteer" | "probation"
  schedule?: string;         // "fullDay" | "shift" | "flexible" | "remote" | "flyInFlyOut"
  salaryFrom?: number;
  salaryTo?: number;
  currency?: string;         // "RUR" | "USD" | "EUR"
  only_with_salary?: boolean;
  order_by?: string;         // "relevance" | "publication_time" | "salary_desc" | "salary_asc"
  page?: number;
  per_page?: number;         // max 100
  search_field?: string;     // "name" | "company_name" | "description"
}

export interface ResumeData {
  id: string;
  title: string;
  skills: string[];
  salaryFrom: number;
  salaryTo: number;
  city: string;
  experienceMonths: number;
  areaId?: string;
}

// ===== Constants =====

const HH_API_BASE = "https://api.hh.ru";
const HH_USER_AGENT = "HH-Bot/1.0 (career-assistant; stsgs1980@gmail.com)";

// Experience mapping: months → HH.ru experience IDs
export const EXPERIENCE_MAP: Record<string, string> = {
  "noExperience": "Нет опыта",
  "between1And3": "1–3 года",
  "between3And6": "3–6 лет",
  "moreThan6": "Более 6 лет",
};

// ===== Core API Request =====

interface ApiRequestOptions extends RequestInit {
  /** If true, don't require auth cookies (public endpoints like vacancy search) */
  public?: boolean;
}

async function hhApiRequest<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  const isPublic = options?.public === true;

  if (!isPublic && !hhSession.isConnected) {
    throw new Error("Не подключено к HH.ru — авторизуйтесь сначала");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${HH_API_BASE}${endpoint}`;

  // Build headers — include cookies only when authenticated
  const headers: Record<string, string> = {
    "User-Agent": HH_USER_AGENT,
    "Accept": "application/json",
  };
  if (hhSession.isConnected) {
    headers["Cookie"] = hhSession.cookieHeader;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers as Record<string, string>,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      if (isPublic) {
        // Public endpoints shouldn't return 401 — probably rate limited
        console.warn(`[HH-API] Got ${response.status} on public endpoint ${endpoint}`);
        throw new Error(`HH.ru API временно недоступен (${response.status}). Попробуйте позже.`);
      }
      throw new Error("Сессия HH.ru истекла — необходимо повторно авторизоваться");
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`[HH-API] ${response.status} from ${endpoint}:`, errorText.slice(0, 200));
      throw new Error(`HH.ru API ошибка: ${response.status}`);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Таймаут запроса к HH.ru API (30с)");
    }
    throw err;
  }
}

// ===== Search Vacancies =====

export async function searchVacancies(params: VacancySearchParams): Promise<HHVacancySearchResult> {
  const searchParams = new URLSearchParams();

  // Text search
  if (params.text) searchParams.set("text", params.text);

  // Area (city/region)
  if (params.area) {
    const areas = Array.isArray(params.area) ? params.area : [params.area];
    areas.forEach((a) => searchParams.append("area", String(a)));
  }

  // Specialization
  if (params.specialization) {
    const specs = Array.isArray(params.specialization) ? params.specialization : [params.specialization];
    specs.forEach((s) => searchParams.append("specialization", s));
  }

  // Experience
  if (params.experience) searchParams.set("experience", params.experience);

  // Employment type
  if (params.employment) searchParams.set("employment", params.employment);

  // Schedule
  if (params.schedule) searchParams.set("schedule", params.schedule);

  // Salary
  if (params.salaryFrom) searchParams.set("salary_from", String(params.salaryFrom));
  if (params.salaryTo) searchParams.set("salary_to", String(params.salaryTo));
  if (params.currency) searchParams.set("currency", params.currency);
  if (params.only_with_salary) searchParams.set("only_with_salary", "true");

  // Ordering
  searchParams.set("order_by", params.order_by || "relevance");

  // Pagination
  searchParams.set("page", String(params.page || 0));
  searchParams.set("per_page", String(Math.min(params.per_page || 20, 100)));

  // Search field
  if (params.search_field) searchParams.set("search_field", params.search_field);

  const result = await hhApiRequest<HHVacancySearchResult>(
    `/vacancies?${searchParams.toString()}`,
    { public: true } // Vacancy search is a public HH.ru API endpoint
  );

  console.log(`[HH-API] Search: found ${result.found}, page ${result.page}/${result.pages}`);
  return result;
}

// ===== Get Vacancy Details =====

export async function getVacancyDetails(vacancyId: string): Promise<HHVacancy> {
  return hhApiRequest<HHVacancy>(`/vacancies/${vacancyId}`, { public: true });
}

// ===== Get Resume Data for Matching =====

const RESUMES_PATH = join(process.cwd(), "download", "output", "parsed_resumes.json");

export async function getResumeForMatching(): Promise<ResumeData | null> {
  try {
    const raw = await readFile(RESUMES_PATH, "utf-8");
    const data = JSON.parse(raw);
    const resumes = data.resumes || [];
    if (resumes.length === 0) return null;

    // Use the first (default) resume
    const r = resumes[0];
    return {
      id: String(r.resume_id || "r1"),
      title: r.title || r.position || "",
      skills: r.key_skills || [],
      salaryFrom: r.salary?.from || 0,
      salaryTo: r.salary?.to || 0,
      city: r.area_info?.name || r.city || "",
      experienceMonths: r.total_experience_months || 0,
      areaId: r.area_id || undefined,
    };
  } catch {
    return null;
  }
}

// ===== Match Score Calculation =====

export interface MatchBreakdown {
  skills: number;
  experience: number;
  salary: number;
  location: number;
  total: number;
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/[^a-zа-яё0-9+#.]/g, "");
}

function calcExperienceScore(resumeMonths: number, vacancyExpId: string | null): number {
  if (!vacancyExpId) return 80; // no requirement = good match

  // Resume experience in years
  const years = resumeMonths / 12;

  switch (vacancyExpId) {
    case "noExperience":
      return years <= 1 ? 100 : years <= 3 ? 70 : 40; // overqualified
    case "between1And3":
      return years >= 1 && years <= 3 ? 100 : years >= 3 && years <= 6 ? 85 : years < 1 ? 40 : 50;
    case "between3And6":
      return years >= 3 && years <= 6 ? 100 : years >= 6 ? 85 : years >= 1 ? 60 : 20;
    case "moreThan6":
      return years >= 6 ? 100 : years >= 3 ? 70 : years >= 1 ? 30 : 10;
    default:
      return 60;
  }
}

function calcSalaryScore(resumeFrom: number, resumeTo: number, vacancySalary: HHVacancy["salary"]): number {
  if (!vacancySalary) return 70; // no salary info = unknown match

  const vFrom = vacancySalary.from || 0;
  const vTo = vacancySalary.to || 0;
  const rFrom = resumeFrom || 0;
  const rTo = resumeTo || 0;

  if (rFrom === 0 && rTo === 0) return 70; // no resume salary expectations

  // Check overlap between resume expectations and vacancy offer
  const overlapFrom = Math.max(rFrom, vFrom);
  const overlapTo = Math.min(rTo || Infinity, vTo || Infinity);

  if (overlapFrom <= overlapTo) {
    // There's overlap — good match
    if (rFrom >= vFrom && rTo <= vTo) return 100; // resume range inside vacancy range
    return 85; // partial overlap
  }

  // No overlap — check how far apart
  const gap = overlapFrom - (overlapTo === Infinity ? overlapFrom : overlapTo);
  const avgResume = (rFrom + rTo) / 2 || rFrom;
  if (avgResume === 0) return 70;
  const gapPercent = (gap / avgResume) * 100;

  if (gapPercent < 20) return 60;
  if (gapPercent < 40) return 40;
  return 20;
}

function calcLocationScore(resumeCity: string, vacancyArea: { id: string; name: string } | null, schedule: { id: string; name: string } | null): number {
  if (!vacancyArea) return 70;

  // Remote work — always good match
  if (schedule?.id === "remote") return 95;

  // Same city
  const vCity = vacancyArea.name.toLowerCase();
  const rCity = resumeCity.toLowerCase();
  if (rCity && vCity.includes(rCity) || rCity.includes(vCity)) return 100;

  // Different city
  return 30;
}

export function calculateMatchScore(resume: ResumeData, vacancy: HHVacancy): MatchBreakdown {
  // ===== Skills matching =====
  const resumeSkills = new Set(resume.skills.map(normalizeSkill));
  const vacancySkills = vacancy.key_skills.map((s) => normalizeSkill(s.name));

  let matchedSkills = 0;
  if (vacancySkills.length > 0 && resumeSkills.size > 0) {
    for (const vs of vacancySkills) {
      // Exact match
      if (resumeSkills.has(vs)) {
        matchedSkills++;
        continue;
      }
      // Partial match (e.g., "python3" matches "python")
      for (const rs of resumeSkills) {
        if (vs.length > 2 && rs.length > 2 && (vs.includes(rs) || rs.includes(vs))) {
          matchedSkills++;
          break;
        }
      }
    }
  }

  const skillsScore = vacancySkills.length > 0
    ? Math.round((matchedSkills / vacancySkills.length) * 100)
    : resumeSkills.size > 0 ? 60 : 50; // no vacancy requirements = moderate match

  // ===== Experience matching =====
  const experienceScore = calcExperienceScore(resume.experienceMonths, vacancy.experience?.id || null);

  // ===== Salary matching =====
  const salaryScore = calcSalaryScore(resume.salaryFrom, resume.salaryTo, vacancy.salary);

  // ===== Location matching =====
  const locationScore = calcLocationScore(resume.city, vacancy.area || null, vacancy.schedule || null);

  // ===== Total score (weighted) =====
  const total = Math.round(
    skillsScore * 0.45 +   // skills are most important
    experienceScore * 0.25 + // experience matters a lot
    salaryScore * 0.15 +    // salary is moderate
    locationScore * 0.15    // location is moderate
  );

  return {
    skills: skillsScore,
    experience: experienceScore,
    salary: salaryScore,
    location: locationScore,
    total,
  };
}

// ===== Convert HH Vacancy to App Vacancy =====

export function hhVacancyToAppVacancy(
  vacancy: HHVacancy,
  matchBreakdown: MatchBreakdown,
  status: "new" | "applied" | "skipped" | "blacklisted" = "new"
) {
  // Salary formatting
  let salary = "Не указана";
  if (vacancy.salary) {
    const from = vacancy.salary.from ? vacancy.salary.from.toLocaleString("ru-RU") : "";
    const to = vacancy.salary.to ? vacancy.salary.to.toLocaleString("ru-RU") : "";
    const currency = vacancy.salary.currency === "RUR" ? "₽" : vacancy.salary.currency;
    const gross = vacancy.salary.gross ? " до вычета" : "";
    if (from || to) {
      salary = `${from || "..."}${from && to ? " – " : ""}${to || "..."} ${currency}${gross}`;
    }
  }

  // Experience
  const experience = vacancy.experience?.name || "Не указан";

  // Description — use snippet (short text) instead of full HTML description
  const snippetParts = [];
  if (vacancy.snippet?.requirement) snippetParts.push(vacancy.snippet.requirement);
  if (vacancy.snippet?.responsibility) snippetParts.push(vacancy.snippet.responsibility);
  const description = snippetParts.join(". ") || "Описание недоступно";

  // Published date
  const publishedAt = vacancy.published_at
    ? new Date(vacancy.published_at).toISOString().split("T")[0]
    : "";

  return {
    id: vacancy.id,
    title: vacancy.name,
    company: vacancy.employer?.name || "Не указано",
    salary,
    matchScore: matchBreakdown.total,
    location: vacancy.area?.name || "Не указана",
    experience,
    description,
    skills: vacancy.key_skills.map((s) => s.name),
    status,
    publishedAt,
    url: vacancy.alternate_url || vacancy.url,
    matchBreakdown: {
      skills: matchBreakdown.skills,
      experience: matchBreakdown.experience,
      salary: matchBreakdown.salary,
      location: matchBreakdown.location,
    },
  };
}

// ===== Smart Search: auto-params from resume =====

export async function smartSearchFromResume(
  resume: ResumeData,
  extraParams?: Partial<VacancySearchParams>
): Promise<{ vacancies: any[]; totalFound: number; matched: number }> {
  // Build search text from resume title + top skills
  const searchTerms = [resume.title];
  if (resume.skills.length > 0) {
    searchTerms.push(...resume.skills.slice(0, 3));
  }
  const searchText = searchTerms.join(" ");

  // Determine experience level from resume
  let experience: string | undefined;
  const years = resume.experienceMonths / 12;
  if (years < 1) experience = "noExperience";
  else if (years < 3) experience = "between1And3";
  else if (years < 6) experience = "between3And6";
  else experience = "moreThan6";

  // Build params
  const params: VacancySearchParams = {
    text: searchText,
    experience,
    order_by: "relevance",
    per_page: 50,
    only_with_salary: false,
    ...extraParams,
  };

  // Add area if known
  if (resume.areaId) {
    params.area = parseInt(resume.areaId) || undefined;
  }

  // Add salary range if set
  if (resume.salaryFrom > 0) {
    params.salaryFrom = resume.salaryFrom;
  }

  // Search
  const result = await searchVacancies(params);

  // Calculate match scores
  const vacancies = result.items.map((v) => {
    const breakdown = calculateMatchScore(resume, v);
    return hhVacancyToAppVacancy(v, breakdown);
  });

  // Sort by match score descending
  vacancies.sort((a, b) => b.matchScore - a.matchScore);

  const matched = vacancies.filter((v) => v.matchScore >= 70).length;

  return {
    vacancies,
    totalFound: result.found,
    matched,
  };
}
