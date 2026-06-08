// API client for HH Bot — calls Next.js API routes which read directly from SQLite
// All routes are under /api/hh/ prefix matching the Next.js route structure

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ===== AUTH =====

export async function loginHH(email: string, password: string) {
  return apiFetch<{ state: string; error?: string; screenshot?: string }>("/api/hh/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getLoginStatus() {
  return apiFetch<{ state: string; error?: string; screenshot?: string }>("/api/hh/auth/login-status");
}

export async function solveCaptcha(captchaText: string) {
  return apiFetch<{ state: string; error?: string; screenshot?: string }>("/api/hh/auth/solve-captcha", {
    method: "POST",
    body: JSON.stringify({ text: captchaText }),
  });
}

export async function verify2FA(code: string) {
  return apiFetch<{ state: string; error?: string; screenshot?: string }>("/api/hh/auth/verify-2fa", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getAuthStatus() {
  return apiFetch<{ connected: boolean; email?: string; authMethod?: string }>("/api/hh/auth/status");
}

export async function verifySession() {
  return apiFetch<{ valid: boolean; error?: string }>("/api/hh/auth/verify-session", {
    method: "POST",
  });
}

export async function disconnectHH() {
  return apiFetch<{ success: boolean; connected: boolean }>("/api/hh/auth/disconnect", {
    method: "POST",
  });
}

// ===== RESUMES =====

export async function fetchResumes() {
  return apiFetch<{ resumes: any[] }>("/api/hh/resumes");
}

export async function updateResume(id: string, data: Record<string, any>) {
  return apiFetch<{ resume: any }>(`/api/hh/resumes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function syncResumes() {
  return apiFetch<{ success: boolean; syncedAt: string }>("/api/hh/resumes/sync", {
    method: "POST",
  });
}

export async function setDefaultResume(id: string) {
  return apiFetch<{ success: boolean }>(`/api/hh/resumes/${id}/set-default`, {
    method: "POST",
  });
}

export async function addSkill(resumeId: string, skill: string) {
  return apiFetch<{ resume: any }>(`/api/hh/resumes/${resumeId}/add-skill`, {
    method: "POST",
    body: JSON.stringify({ skill }),
  });
}

export async function removeSkill(resumeId: string, skill: string) {
  return apiFetch<{ resume: any }>(`/api/hh/resumes/${resumeId}/remove-skill`, {
    method: "POST",
    body: JSON.stringify({ skill }),
  });
}

// ===== VACANCIES =====

export async function fetchVacancies() {
  return apiFetch<{ vacancies: any[]; resumeTitle: string | null }>("/api/hh/vacancies");
}

export async function searchVacancies(params?: {
  text?: string;
  area?: number;
  specialization?: string;
  experience?: string;
  employment?: string;
  schedule?: string;
  salaryFrom?: number;
  salaryTo?: number;
  onlyWithSalary?: boolean;
  orderBy?: string;
  page?: number;
  perPage?: number;
}) {
  // Map camelCase to snake_case for API
  const apiParams: Record<string, any> = {};
  if (params?.text) apiParams.text = params.text;
  if (params?.area) apiParams.area = params.area;
  if (params?.specialization) apiParams.specialization = params.specialization;
  if (params?.experience) apiParams.experience = params.experience;
  if (params?.employment) apiParams.employment = params.employment;
  if (params?.schedule) apiParams.schedule = params.schedule;
  if (params?.salaryFrom) apiParams.salaryFrom = params.salaryFrom;
  if (params?.salaryTo) apiParams.salaryTo = params.salaryTo;
  if (params?.onlyWithSalary) apiParams.only_with_salary = true;
  if (params?.orderBy) apiParams.order_by = params.orderBy;
  if (params?.page !== undefined) apiParams.page = params.page;
  if (params?.perPage) apiParams.per_page = params.perPage;

  return apiFetch<{
    vacancies: any[];
    totalFound?: number;
    matched?: number;
    message?: string;
    page?: number;
    pages?: number;
  }>("/api/hh/vacancies/search", {
    method: "POST",
    body: JSON.stringify(apiParams),
  });
}

export async function applyToVacancy(id: string, coverLetter?: string) {
  return apiFetch<{ success: boolean }>(`/api/hh/vacancies/${id}/apply`, {
    method: "POST",
    body: JSON.stringify({ coverLetter }),
  });
}

export async function skipVacancy(id: string) {
  return apiFetch<{ success: boolean }>(`/api/hh/vacancies/${id}/skip`, {
    method: "POST",
  });
}

export async function blacklistVacancy(id: string) {
  return apiFetch<{ success: boolean }>(`/api/hh/vacancies/${id}/blacklist`, {
    method: "POST",
  });
}

// ===== NEGOTIATIONS =====

export async function fetchNegotiations() {
  return apiFetch<{ negotiations: any[] }>("/api/hh/negotiations");
}

export async function sendMessage(negotiationId: string, text: string) {
  return apiFetch<{ success: boolean; messageId: string }>(`/api/hh/negotiations/${negotiationId}/message`, {
    method: "POST",
    body: JSON.stringify({ text, isAutoReply: false }),
  });
}

export async function toggleAutoReply(negotiationId: string) {
  return apiFetch<{ success: boolean }>(`/api/hh/negotiations/${negotiationId}/toggle-auto-reply`, {
    method: "POST",
  });
}

// ===== STATS =====

export async function fetchStats() {
  return apiFetch<{
    stats: any;
    chartData: any[];
    activityLog: any[];
  }>("/api/hh/stats");
}

// ===== BOT STATUS =====

export async function fetchBotStatus() {
  return apiFetch<{ botStatus: any }>("/api/hh/bot-status");
}

export async function reconnectBot() {
  return apiFetch<{ success: boolean }>("/api/hh/bot-status/reconnect", {
    method: "POST",
  });
}

// ===== SETTINGS =====

export async function fetchSettings() {
  return apiFetch<{ settings: any }>("/api/hh/settings");
}

export async function updateSettings(data: Record<string, any>) {
  return apiFetch<{ success: boolean; settings: any }>("/api/hh/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
