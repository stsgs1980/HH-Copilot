// Types matching the frontend mock-data interfaces

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
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
  skillGaps: string[];
  matchingVacancies: number;
  totalVacancies: number;
}

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
  coverLetter?: string;
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

export interface AppSettings {
  mode: "auto" | "semi-auto" | "manual";
  careerDirection: string;
  letterTone: "confident" | "friendly" | "formal";
  dailyLimit: number;
  searchInterval: number;
  minMatchScore: number;
}
