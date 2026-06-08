// API client aligned with actual backend response schemas.
// Backend uses camelCase via Pydantic alias=True.

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = opts;

  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  state: string;
  message?: string;
  captcha_url?: string;
}

export interface LoginStatusResponse {
  session_id: string;
  state: string;
  captcha_url?: string;
  message?: string;
}

export interface AuthStatusResponse {
  connected: boolean;
  email?: string;
  tokenExpiry?: string | null;
  authMethod?: string;
}

export interface CaptchaRequest {
  captcha_text: string;
}

export interface TwoFaRequest {
  code: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/api/auth/login', { method: 'POST', body: data }),
  getStatus: () =>
    request<AuthStatusResponse>('/api/auth/status'),
  getLoginStatus: () =>
    request<LoginStatusResponse>('/api/auth/login-status'),
  solveCaptcha: (data: CaptchaRequest) =>
    request<{ state: string }>('/api/auth/solve-captcha', { method: 'POST', body: data }),
  verify2fa: (data: TwoFaRequest) =>
    request<{ state: string }>('/api/auth/verify-2fa', { method: 'POST', body: data }),
  verifySession: () =>
    request<{ valid: boolean }>('/api/auth/verify-session', { method: 'POST' }),
  disconnect: () =>
    request<{ success: boolean }>('/api/auth/disconnect', { method: 'POST' }),
};

// --- Stats ---

export interface StatsResponse {
  stats: {
    totalVacancies: number;
    appliedToday: number;
    interviewInvites: number;
    dailyLimitRemaining: number;
  };
  chartData: ChartDataPoint[];
  activityLog: ActivityLogEntry[];
}

export interface ChartDataPoint {
  day: string;
  applications: number;
  interviews: number;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export const statsApi = {
  getStats: () => request<StatsResponse>('/api/stats'),
};

// --- Vacancies ---

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
  status: string;
  publishedAt: string;
  url: string;
  matchBreakdown: {
    skills: number;
    experience: number;
    salary: number;
    location: number;
  };
}

export interface VacancyListResponse {
  vacancies: Vacancy[];
  resumeTitle?: string;
}

export const vacanciesApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<VacancyListResponse>(`/api/vacancies${query}`);
  },
  apply: (id: string) =>
    request<{ success: boolean }>(`/api/vacancies/${id}/apply`, { method: 'POST' }),
  skip: (id: string) =>
    request<{ success: boolean }>(`/api/vacancies/${id}/skip`, { method: 'POST' }),
};

// --- Resumes ---

export interface Resume {
  id: string;
  title: string;
  position: string;
  skills: string[];
  salary: string;
  salaryFrom?: number;
  salaryTo?: number;
  currency: string;
  city: string;
  experience: string;
  experienceYears: number;
  education: string;
  about: string;
  lastSync: string;
  isDefault: boolean;
  experienceEntries: { id: string; company: string; position: string; startDate: string; endDate?: string | null; description: string }[];
  educationEntries: { id: string; institution: string; degree: string; year: string }[];
  skillGaps: string[];
  matchingVacancies: number;
  totalVacancies: number;
}

export interface ResumeListResponse {
  resumes: Resume[];
}

export const resumesApi = {
  list: () => request<ResumeListResponse>('/api/resumes'),
  sync: () => request<{ success: boolean; syncedAt: string }>('/api/resumes/sync', { method: 'POST' }),
};

// --- Negotiations ---

export interface NegotiationMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isAutoReply: boolean;
}

export interface Negotiation {
  id: string;
  vacancyTitle: string;
  company: string;
  employerName: string;
  status: string;
  unread: number;
  lastMessage: string;
  lastMessageTime: string;
  autoReply: boolean;
  messages: NegotiationMessage[];
}

export interface NegotiationListResponse {
  negotiations: Negotiation[];
}

export const negotiationsApi = {
  list: () => request<NegotiationListResponse>('/api/negotiations'),
};

// --- Settings ---

export interface UserSettings {
  mode: string;
  careerDirection: string;
  letterTone: string;
  dailyLimit: number;
  searchInterval: number;
  minMatchScore: number;
}

export interface SettingsResponse {
  settings: UserSettings;
}

export const settingsApi = {
  get: () => request<SettingsResponse>('/api/settings'),
  update: (data: Partial<UserSettings>) =>
    request<SettingsResponse>('/api/settings', { method: 'PUT', body: data }),
};

// --- Bot Status ---

export interface BotStatus {
  isOnline: boolean;
  mode: string;
  lastActivity: string;
  uptime: string;
  appliedToday: number;
  dailyLimit: number;
  errors: number;
  hhConnected: boolean;
  tokenExpiry: string;
}

export const botStatusApi = {
  get: () => request<BotStatus>('/api/bot-status'),
};
