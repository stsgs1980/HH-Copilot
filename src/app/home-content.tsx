"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Sidebar,
  type TabId,
} from "@/components/dashboard/sidebar";
import { DashboardTab } from "@/components/dashboard/dashboard-tab";
import { VacanciesTab } from "@/components/dashboard/vacancies-tab";
import { ResumesTab } from "@/components/dashboard/resumes-tab";
import { NegotiationsTab } from "@/components/dashboard/negotiations-tab";
import { SettingsTab, type AppSettings } from "@/components/dashboard/settings-tab";
import { BotStatusTab } from "@/components/dashboard/bot-status-tab";
import {
  type Vacancy,
  type Negotiation,
  type BotStatus,
  type DashboardStats,
  type ChartData,
  type ActivityLogEntry,
  type Resume,
} from "@/lib/mock-data";
import {
  fetchResumes,
  fetchVacancies,
  fetchNegotiations,
  fetchStats,
  fetchBotStatus,
  fetchSettings,
  applyToVacancy as apiApply,
  skipVacancy as apiSkip,
  blacklistVacancy as apiBlacklist,
  syncResumes as apiSync,
  toggleAutoReply as apiToggleAutoReply,
  sendMessage as apiSendMessage,
  reconnectBot as apiReconnect,
  updateSettings as apiUpdateSettings,
  updateResume as apiUpdateResume,
  setDefaultResume as apiSetDefault,
  addSkill as apiAddSkill,
  removeSkill as apiRemoveSkill,
} from "@/lib/api";

const tabTitles: Record<TabId, string> = {
  resumes: "Резюме",
  vacancies: "Вакансии",
  negotiations: "Переговоры",
  dashboard: "Дашборд",
  settings: "Настройки",
  "bot-status": "Статус бота",
};

export default function HomeContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("bot-status");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data state
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    mode: "semi-auto",
    careerDirection: "Python Developer",
    letterTone: "confident",
    dailyLimit: 50,
    searchInterval: 15,
    minMatchScore: 70,
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [resumeTitle, setResumeTitle] = useState<string | null>(null);

  // Check HH.ru auth status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/hh/auth/status");
        const data = await res.json();
        if (!data.connected) {
          router.replace("/login");
          return;
        }
        setCheckingAuth(false);
      } catch {
        router.replace("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Load all data from API — resilient to individual failures
  const loadAllData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetchResumes(),
        fetchVacancies(),
        fetchNegotiations(),
        fetchStats(),
        fetchBotStatus(),
        fetchSettings(),
      ]);

      const [resumesRes, vacanciesRes, negotiationsRes, statsRes, botRes, settingsRes] = results;

      if (resumesRes.status === "fulfilled") setResumes(resumesRes.value.resumes || []);
      if (vacanciesRes.status === "fulfilled") {
        setVacancies(vacanciesRes.value.vacancies || []);
        setResumeTitle(vacanciesRes.value.resumeTitle ?? null);
      }
      if (negotiationsRes.status === "fulfilled") setNegotiations(negotiationsRes.value.negotiations || []);
      if (statsRes.status === "fulfilled") {
        setDashboardStats(statsRes.value.stats);
        setChartData(statsRes.value.chartData || []);
        setActivityLog(statsRes.value.activityLog || []);
      }
      if (botRes.status === "fulfilled") setBotStatus(botRes.value.botStatus);
      if (settingsRes.status === "fulfilled" && settingsRes.value.settings) {
        setSettings({
          mode: settingsRes.value.settings.mode || "semi-auto",
          careerDirection: settingsRes.value.settings.careerDirection || "Python Developer",
          letterTone: settingsRes.value.settings.letterTone || "confident",
          dailyLimit: settingsRes.value.settings.dailyLimit || 50,
          searchInterval: settingsRes.value.settings.searchInterval || 15,
          minMatchScore: settingsRes.value.settings.minMatchScore || 70,
        });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAuth) {
      loadAllData();
    }
  }, [loadAllData, checkingAuth]);

  // Listen for HH.ru auth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "hh-auth-success") {
        toast.success("HH.ru подключён!", {
          description: "Синхронизируем ваши данные...",
        });
        loadAllData();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadAllData]);

  const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0];
  const unreadNegotiations = negotiations.reduce((sum, n) => sum + n.unread, 0);

  // Vacancy actions
  const handleApply = useCallback(async (id: string) => {
    setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, status: "applied" as const } : v)));
    const vacancy = vacancies.find((v) => v.id === id);
    toast.success("Отклик отправлен", { description: vacancy ? `${vacancy.title} — ${vacancy.company}` : "Вакансия обработана" });
    try {
      await apiApply(id);
    } catch {
      setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, status: "new" as const } : v)));
      toast.error("Ошибка", { description: "Не удалось отправить отклик" });
    }
  }, [vacancies]);

  const handleSkip = useCallback(async (id: string) => {
    setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, status: "skipped" as const } : v)));
    toast("Вакансия пропущена", { description: "Вы можете вернуть её позже" });
    try {
      await apiSkip(id);
    } catch {
      setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, status: "new" as const } : v)));
    }
  }, []);

  const handleBlacklist = useCallback(async (id: string) => {
    setVacancies((prev) => prev.map((v) => v.id === id ? { ...v, status: "blacklisted" as const } : v));
    toast("Добавлено в чёрный список", { description: "Вакансия больше не будет отображаться" });
    try {
      await apiBlacklist(id);
    } catch {
      setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, status: "new" as const } : v)));
    }
  }, []);

  const handleResumeSync = useCallback(async () => {
    toast.success("Резюме синхронизированы", { description: "Данные обновлены с HH.ru" });
    try {
      await apiSync();
      await loadAllData();
    } catch {
      toast.error("Ошибка синхронизации");
    }
  }, [loadAllData]);

  const handleResumeUpdate = useCallback(async (resumeId: string, data: Record<string, any>) => {
    try {
      const res = await apiUpdateResume(resumeId, data);
      setResumes((prev) => prev.map((r) => (r.id === resumeId ? res.resume : r)));
      const vacanciesRes = await fetchVacancies();
      setVacancies(vacanciesRes.vacancies);
      setResumeTitle(vacanciesRes.resumeTitle);
    } catch {
      toast.error("Ошибка обновления резюме");
    }
  }, []);

  const handleSetDefault = useCallback(async (resumeId: string) => {
    try {
      await apiSetDefault(resumeId);
      setResumes((prev) => prev.map((r) => ({ ...r, isDefault: r.id === resumeId })));
      toast.success("Резюме установлено как основное");
    } catch {
      toast.error("Ошибка");
    }
  }, []);

  const handleAddSkill = useCallback(async (resumeId: string, skill: string) => {
    try {
      const res = await apiAddSkill(resumeId, skill);
      setResumes((prev) => prev.map((r) => (r.id === resumeId ? res.resume : r)));
    } catch {
      toast.error("Ошибка добавления навыка");
    }
  }, []);

  const handleRemoveSkill = useCallback(async (resumeId: string, skill: string) => {
    try {
      const res = await apiRemoveSkill(resumeId, skill);
      setResumes((prev) => prev.map((r) => (r.id === resumeId ? res.resume : r)));
    } catch {
      toast.error("Ошибка удаления навыка");
    }
  }, []);

  const handleToggleAutoReply = useCallback(async (id: string) => {
    const neg = negotiations.find((n) => n.id === id);
    setNegotiations((prev) => prev.map((n) => n.id === id ? { ...n, autoReply: !n.autoReply } : n));
    toast(neg?.autoReply ? "Авто-ответ выключен" : "Авто-ответ включен", { description: `${neg?.vacancyTitle} — ${neg?.company}` });
    try {
      await apiToggleAutoReply(id);
    } catch {
      setNegotiations((prev) => prev.map((n) => n.id === id ? { ...n, autoReply: !n.autoReply } : n));
    }
  }, [negotiations]);

  const handleSendMessage = useCallback(async (negotiationId: string, text: string) => {
    setNegotiations((prev) => prev.map((n) => n.id === negotiationId ? {
      ...n,
      messages: [...n.messages, { id: `m-${Date.now()}`, sender: "me" as const, text, timestamp: new Date().toISOString(), isAutoReply: false }],
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
    } : n));
    try {
      await apiSendMessage(negotiationId, text);
    } catch {
      toast.error("Ошибка отправки сообщения");
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    setBotStatus((prev) => prev ? { ...prev, isOnline: true } : prev);
    toast.success("Бот перезапущен", { description: "Все системы работают нормально" });
    try {
      await apiReconnect();
    } catch {}
  }, []);

  const handleSettingsChange = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    setBotStatus((prev) => prev ? { ...prev, mode: newSettings.mode, dailyLimit: newSettings.dailyLimit } : prev);
    try {
      await apiUpdateSettings(newSettings);
    } catch {}
  }, []);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Проверка авторизации...</span>
      </div>
    );
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="ml-3 text-muted-foreground">Загрузка данных...</span>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return dashboardStats && botStatus ? (
          <DashboardTab stats={dashboardStats} chartData={chartData} activityLog={activityLog} botStatus={botStatus} />
        ) : (
          <div className="text-center text-muted-foreground py-8">Не удалось загрузить данные дашборда</div>
        );
      case "vacancies":
        return <VacanciesTab vacancies={vacancies} onApply={handleApply} onSkip={handleSkip} onBlacklist={handleBlacklist} onResumeRefresh={loadAllData} resumeTitle={resumeTitle ?? defaultResume?.title ?? ""} />;
      case "resumes":
        return resumes.length > 0 ? (
          <ResumesTab resumes={resumes} onSync={handleResumeSync} onUpdateResume={handleResumeUpdate} onSetDefault={handleSetDefault} onAddSkill={handleAddSkill} onRemoveSkill={handleRemoveSkill} />
        ) : (
          <div className="text-center text-muted-foreground py-8">Резюме не найдены</div>
        );
      case "negotiations":
        return <NegotiationsTab negotiations={negotiations} onToggleAutoReply={handleToggleAutoReply} onSendMessage={handleSendMessage} />;
      case "settings":
        return <SettingsTab settings={settings} onSettingsChange={handleSettingsChange} />;
      case "bot-status":
        return botStatus ? (
          <BotStatusTab botStatus={botStatus} onReconnect={handleReconnect} onAuthChange={loadAllData} />
        ) : (
          <div className="text-center text-muted-foreground py-8">Статус бота недоступен</div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <div className="hidden lg:flex shrink-0">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} hhConnected={botStatus?.hhConnected ?? false} unreadNegotiations={unreadNegotiations} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b bg-white flex items-center px-4 gap-3 shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-neutral-900">
              <SheetTitle className="sr-only">Навигация</SheetTitle>
              <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} collapsed={false} onToggleCollapse={() => {}} hhConnected={botStatus?.hhConnected ?? false} unreadNegotiations={unreadNegotiations} />
            </SheetContent>
          </Sheet>
          <h2 className="text-base font-semibold truncate">{tabTitles[activeTab]}</h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${botStatus?.isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-xs text-muted-foreground hidden sm:inline">{botStatus?.isOnline ? "Бот онлайн" : "Бот оффлайн"}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
