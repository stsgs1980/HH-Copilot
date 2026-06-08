"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  RefreshCw,
  MapPin,
  GraduationCap,
  Clock,
  Star,
  Download,
  Check,
  X,
  Plus,
  Trash2,
  Edit3,
  Save,
  ChevronDown,
  Building2,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Resume, ExperienceEntry, EducationEntry } from "@/lib/mock-data";

interface ResumesTabProps {
  resumes: Resume[];
  onSync: () => void;
  onUpdateResume?: (resumeId: string, data: Record<string, any>) => Promise<void>;
  onSetDefault?: (resumeId: string) => Promise<void>;
  onAddSkill?: (resumeId: string, skill: string) => Promise<void>;
  onRemoveSkill?: (resumeId: string, skill: string) => Promise<void>;
}

// Skill match strength indicator (mock: how many vacancies match)
function SkillBadge({
  skill,
  matchCount,
  onRemove,
}: {
  skill: string;
  matchCount: number;
  onRemove: () => void;
}) {
  const strength =
    matchCount >= 5 ? "high" : matchCount >= 2 ? "medium" : "low";
  const colors = {
    high: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${colors[strength]} group cursor-pointer transition-all hover:shadow-sm`}
      onClick={onRemove}
      title="Нажмите чтобы удалить"
    >
      {skill}
      <span className="text-[10px] opacity-60">({matchCount})</span>
      <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}

export function ResumesTab({ resumes, onSync, onUpdateResume, onSetDefault, onAddSkill, onRemoveSkill }: ResumesTabProps) {
  const [selectedResumeId, setSelectedResumeId] = useState(
    resumes.find((r) => r.isDefault)?.id ?? resumes[0]?.id
  );
  const [syncing, setSyncing] = useState(false);
  const [skills, setSkills] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    resumes.forEach((r) => {
      map[r.id] = [...r.skills];
    });
    return map;
  });
  const [newSkillInput, setNewSkillInput] = useState("");
  const [showSkillInput, setShowSkillInput] = useState(false);

  // Editing states
  const [editingPosition, setEditingPosition] = useState<Record<string, boolean>>({});
  const [positionValues, setPositionValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    resumes.forEach((r) => {
      map[r.id] = r.position;
    });
    return map;
  });
  const [editingCity, setEditingCity] = useState<Record<string, boolean>>({});
  const [cityValues, setCityValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    resumes.forEach((r) => {
      map[r.id] = r.city;
    });
    return map;
  });
  const [salaryFromValues, setSalaryFromValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    resumes.forEach((r) => {
      map[r.id] = r.salaryFrom;
    });
    return map;
  });
  const [salaryToValues, setSalaryToValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    resumes.forEach((r) => {
      map[r.id] = r.salaryTo;
    });
    return map;
  });
  const [currencyValues, setCurrencyValues] = useState<Record<string, "RUR" | "USD" | "EUR">>(() => {
    const map: Record<string, "RUR" | "USD" | "EUR"> = {};
    resumes.forEach((r) => {
      map[r.id] = r.currency;
    });
    return map;
  });

  // About editing
  const [editingAbout, setEditingAbout] = useState<Record<string, boolean>>({});
  const [aboutValues, setAboutValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    resumes.forEach((r) => {
      map[r.id] = r.about;
    });
    return map;
  });

  // Experience editing
  const [editingExperience, setEditingExperience] = useState<Record<string, boolean>>({});
  const [experienceValues, setExperienceValues] = useState<Record<string, ExperienceEntry[]>>(() => {
    const map: Record<string, ExperienceEntry[]> = {};
    resumes.forEach((r) => {
      map[r.id] = [...r.experienceEntries];
    });
    return map;
  });

  // Education editing
  const [editingEducation, setEditingEducation] = useState<Record<string, boolean>>({});
  const [educationValues, setEducationValues] = useState<Record<string, EducationEntry[]>>(() => {
    const map: Record<string, EducationEntry[]> = {};
    resumes.forEach((r) => {
      map[r.id] = [...r.educationEntries];
    });
    return map;
  });

  const resume = resumes.find((r) => r.id === selectedResumeId) ?? resumes[0];
  const resumeId = resume?.id ?? "";

  const currentSkills = skills[resumeId] ?? [];
  const currentExperience = experienceValues[resumeId] ?? [];
  const currentEducation = educationValues[resumeId] ?? [];

  // Mock: match count per skill
  const skillMatchCounts: Record<string, number> = {
    Python: 8,
    Django: 5,
    FastAPI: 6,
    React: 4,
    TypeScript: 5,
    PostgreSQL: 7,
    Docker: 6,
    Redis: 4,
    Celery: 3,
    Git: 3,
    Kubernetes: 5,
    Terraform: 3,
    "CI/CD": 4,
    AWS: 4,
    Linux: 3,
    Bash: 2,
    Prometheus: 2,
    Grafana: 2,
  };

  const handleSync = useCallback(() => {
    setSyncing(true);
    setTimeout(() => {
      onSync();
      setSyncing(false);
    }, 1500);
  }, [onSync]);

  const addSkill = useCallback(async () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (currentSkills.includes(trimmed)) {
      toast.error("Навык уже добавлен");
      return;
    }
    // Optimistic update
    setSkills((prev) => ({
      ...prev,
      [resumeId]: [...(prev[resumeId] ?? []), trimmed],
    }));
    setNewSkillInput("");
    setShowSkillInput(false);
    toast.success(`Навык «${trimmed}» добавлен`);
    if (onAddSkill) {
      try {
        await onAddSkill(resumeId, trimmed);
      } catch {
        setSkills((prev) => ({
          ...prev,
          [resumeId]: (prev[resumeId] ?? []).filter((s) => s !== trimmed),
        }));
        toast.error("Ошибка добавления навыка");
      }
    }
  }, [newSkillInput, currentSkills, resumeId, onAddSkill]);

  const removeSkill = useCallback(
    async (skill: string) => {
      // Optimistic
      setSkills((prev) => ({
        ...prev,
        [resumeId]: (prev[resumeId] ?? []).filter((s) => s !== skill),
      }));
      toast.info(`Навык «${skill}» удалён`);
      if (onRemoveSkill) {
        try {
          await onRemoveSkill(resumeId, skill);
        } catch {
          setSkills((prev) => ({
            ...prev,
            [resumeId]: [...(prev[resumeId] ?? []), skill],
          }));
          toast.error("Ошибка удаления навыка");
        }
      }
    },
    [resumeId, onRemoveSkill]
  );

  const handleSetDefault = useCallback(async () => {
    if (!resume) return;
    toast.success("Резюме установлено как основное", {
      description: resume.title,
    });
    if (onSetDefault) {
      try {
        await onSetDefault(resume.id);
      } catch {
        toast.error("Ошибка");
      }
    }
  }, [resume, onSetDefault]);

  const handleDownloadPdf = useCallback(() => {
    if (!resume) return;
    toast.success("PDF скачивается...", {
      description: `${resume.title}.pdf`,
    });
  }, [resume]);

  const handleUpdateHh = useCallback(() => {
    toast.success("Резюме обновлено на HH.ru", {
      description: "Изменения отправлены",
    });
  }, []);

  // Save experience entry
  const updateExperienceEntry = useCallback(
    (index: number, field: keyof ExperienceEntry, value: string) => {
      setExperienceValues((prev) => {
        const entries = [...(prev[resumeId] ?? [])];
        entries[index] = { ...entries[index], [field]: value };
        return { ...prev, [resumeId]: entries };
      });
    },
    [resumeId]
  );

  // Save education entry
  const updateEducationEntry = useCallback(
    (index: number, field: keyof EducationEntry, value: string) => {
      setEducationValues((prev) => {
        const entries = [...(prev[resumeId] ?? [])];
        entries[index] = { ...entries[index], [field]: value };
        return { ...prev, [resumeId]: entries };
      });
    },
    [resumeId]
  );

  // Skill chart data: top skills by frequency
  const topSkills = currentSkills
    .map((s) => ({ name: s, count: skillMatchCounts[s] ?? 1 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCount = Math.max(...topSkills.map((s) => s.count), 1);

  // Skill gap data
  const gapRecommendations = (resume?.skillGaps ?? []).map((gap, i) => ({
    skill: gap,
    increase: [8, 12, 6, 5][i % 4],
  }));

  const matchPercentage = resume
    ? Math.round((resume.matchingVacancies / resume.totalVacancies) * 100)
    : 0;

  if (!resume) return null;

  return (
    <div className="space-y-6">
      {/* ===== A. Resume Selection Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-9">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="truncate max-w-[200px]">{resume.title}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {resumes.map((r) => (
                <DropdownMenuItem
                  key={r.id}
                  onClick={() => setSelectedResumeId(r.id)}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>{r.title}</span>
                  {r.isDefault && (
                    <Badge className="ml-1 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1 py-0">
                      Основное
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {resume.isDefault && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
              <Star className="w-3 h-3 mr-0.5" />
              Основное
            </Badge>
          )}
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Синхронизация..." : "Синхронизировать с HH.ru"}
        </Button>
      </div>

      {/* ===== B. Full Resume Editor (inline) ===== */}

      {/* --- Personal Info Section --- */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            Личная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Position */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Должность
            </label>
            {editingPosition[resume.id] ? (
              <div className="flex items-center gap-2">
                <Input
                  value={positionValues[resume.id] ?? ""}
                  onChange={(e) =>
                    setPositionValues((prev) => ({
                      ...prev,
                      [resume.id]: e.target.value,
                    }))
                  }
                  className="h-8 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingPosition((prev) => ({ ...prev, [resume.id]: false }))}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setPositionValues((prev) => ({
                      ...prev,
                      [resume.id]: resume.position,
                    }));
                    setEditingPosition((prev) => ({ ...prev, [resume.id]: false }));
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {positionValues[resume.id] ?? resume.position}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setEditingPosition((prev) => ({ ...prev, [resume.id]: true }))}
                >
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Город
            </label>
            {editingCity[resume.id] ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={cityValues[resume.id] ?? ""}
                    onChange={(e) =>
                      setCityValues((prev) => ({
                        ...prev,
                        [resume.id]: e.target.value,
                      }))
                    }
                    className="h-8 text-sm pl-8"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingCity((prev) => ({ ...prev, [resume.id]: false }))}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setCityValues((prev) => ({
                      ...prev,
                      [resume.id]: resume.city,
                    }));
                    setEditingCity((prev) => ({ ...prev, [resume.id]: false }));
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm">
                  {cityValues[resume.id] ?? resume.city}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setEditingCity((prev) => ({ ...prev, [resume.id]: true }))}
                >
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>

          {/* Salary expectations */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Зарплатные ожидания
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">от</span>
                <Input
                  type="number"
                  value={salaryFromValues[resume.id] ?? resume.salaryFrom}
                  onChange={(e) =>
                    setSalaryFromValues((prev) => ({
                      ...prev,
                      [resume.id]: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm w-28"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">до</span>
                <Input
                  type="number"
                  value={salaryToValues[resume.id] ?? resume.salaryTo}
                  onChange={(e) =>
                    setSalaryToValues((prev) => ({
                      ...prev,
                      [resume.id]: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm w-28"
                />
              </div>
              <Select
                value={currencyValues[resume.id] ?? resume.currency}
                onValueChange={(val: "RUR" | "USD" | "EUR") =>
                  setCurrencyValues((prev) => ({
                    ...prev,
                    [resume.id]: val,
                  }))
                }
              >
                <SelectTrigger className="h-8 w-24 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUR">₽ RUB</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Experience & Education summary */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {resume.experience} опыта
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              {resume.education}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* --- Skills Section --- */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Навыки
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
              {currentSkills.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {currentSkills.map((skill) => (
              <SkillBadge
                key={skill}
                skill={skill}
                matchCount={skillMatchCounts[skill] ?? 1}
                onRemove={() => removeSkill(skill)}
              />
            ))}
          </div>

          {showSkillInput ? (
            <div className="flex items-center gap-2">
              <Input
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                placeholder="Введите навык..."
                className="h-8 text-sm max-w-[200px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSkill();
                  if (e.key === "Escape") {
                    setShowSkillInput(false);
                    setNewSkillInput("");
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={addSkill}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Добавить
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setShowSkillInput(false);
                  setNewSkillInput("");
                }}
              >
                Отмена
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => setShowSkillInput(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить навык
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground">
            Число в скобках — количество вакансий, где требуется этот навык. Нажмите на навык, чтобы удалить.
          </p>
        </CardContent>
      </Card>

      {/* --- Experience Section --- */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Опыт работы
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                {currentExperience.length}
              </Badge>
            </CardTitle>
            {editingExperience[resume.id] ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingExperience((prev) => ({ ...prev, [resume.id]: false }))}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setExperienceValues((prev) => ({
                      ...prev,
                      [resume.id]: [...resume.experienceEntries],
                    }));
                    setEditingExperience((prev) => ({ ...prev, [resume.id]: false }));
                  }}
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setEditingExperience((prev) => ({ ...prev, [resume.id]: true }))}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Редактировать
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {currentExperience.map((entry, index) => (
            <div key={entry.id} className="relative">
              {index > 0 && <Separator className="mb-4" />}
              {editingExperience[resume.id] ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Компания</label>
                      <Input
                        value={entry.company}
                        onChange={(e) => updateExperienceEntry(index, "company", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Должность</label>
                      <Input
                        value={entry.position}
                        onChange={(e) => updateExperienceEntry(index, "position", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Начало</label>
                      <Input
                        value={entry.startDate}
                        onChange={(e) => updateExperienceEntry(index, "startDate", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="YYYY-MM"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        Конец {entry.endDate === null ? "(настоящее время)" : ""}
                      </label>
                      <Input
                        value={entry.endDate ?? ""}
                        onChange={(e) =>
                          updateExperienceEntry(
                            index,
                            "endDate",
                            e.target.value || "null"
                          )
                        }
                        className="h-8 text-sm"
                        placeholder="YYYY-MM или пусто"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Описание</label>
                    <Textarea
                      value={entry.description}
                      onChange={(e) => updateExperienceEntry(index, "description", e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setExperienceValues((prev) => {
                        const entries = [...(prev[resume.id] ?? [])];
                        entries.splice(index, 1);
                        return { ...prev, [resume.id]: entries };
                      });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Удалить
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">{entry.position}</h4>
                      <p className="text-sm text-emerald-700">{entry.company}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {entry.startDate} — {entry.endDate ?? "настоящее время"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              )}
            </div>
          ))}

          {editingExperience[resume.id] && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 w-full"
              onClick={() => {
                setExperienceValues((prev) => ({
                  ...prev,
                  [resume.id]: [
                    ...(prev[resume.id] ?? []),
                    {
                      id: `e-${Date.now()}`,
                      company: "",
                      position: "",
                      startDate: "",
                      endDate: null,
                      description: "",
                    },
                  ],
                }));
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить место работы
            </Button>
          )}
        </CardContent>
      </Card>

      {/* --- Education Section --- */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Образование
            </CardTitle>
            {editingEducation[resume.id] ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingEducation((prev) => ({ ...prev, [resume.id]: false }))}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEducationValues((prev) => ({
                      ...prev,
                      [resume.id]: [...resume.educationEntries],
                    }));
                    setEditingEducation((prev) => ({ ...prev, [resume.id]: false }));
                  }}
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setEditingEducation((prev) => ({ ...prev, [resume.id]: true }))}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Редактировать
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {currentEducation.map((entry, index) => (
            <div key={entry.id}>
              {index > 0 && <Separator className="mb-3" />}
              {editingEducation[resume.id] ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Учебное заведение</label>
                      <Input
                        value={entry.institution}
                        onChange={(e) => updateEducationEntry(index, "institution", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Степень</label>
                      <Input
                        value={entry.degree}
                        onChange={(e) => updateEducationEntry(index, "degree", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Год окончания</label>
                      <Input
                        value={entry.year}
                        onChange={(e) => updateEducationEntry(index, "year", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setEducationValues((prev) => {
                        const entries = [...(prev[resume.id] ?? [])];
                        entries.splice(index, 1);
                        return { ...prev, [resume.id]: entries };
                      });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Удалить
                  </Button>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold">{entry.institution}</h4>
                  <p className="text-sm text-muted-foreground">
                    {entry.degree}, {entry.year}
                  </p>
                </div>
              )}
            </div>
          ))}

          {editingEducation[resume.id] && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 w-full"
              onClick={() => {
                setEducationValues((prev) => ({
                  ...prev,
                  [resume.id]: [
                    ...(prev[resume.id] ?? []),
                    {
                      id: `ed-${Date.now()}`,
                      institution: "",
                      degree: "",
                      year: "",
                    },
                  ],
                }));
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить образование
            </Button>
          )}
        </CardContent>
      </Card>

      {/* --- About Section --- */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              О себе
            </CardTitle>
            {editingAbout[resume.id] ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingAbout((prev) => ({ ...prev, [resume.id]: false }))}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAboutValues((prev) => ({
                      ...prev,
                      [resume.id]: resume.about,
                    }));
                    setEditingAbout((prev) => ({ ...prev, [resume.id]: false }));
                  }}
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setEditingAbout((prev) => ({ ...prev, [resume.id]: true }))}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Редактировать
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {editingAbout[resume.id] ? (
            <div className="space-y-2">
              <Textarea
                value={aboutValues[resume.id] ?? ""}
                onChange={(e) =>
                  setAboutValues((prev) => ({
                    ...prev,
                    [resume.id]: e.target.value,
                  }))
                }
                className="text-sm min-h-[100px]"
                maxLength={2000}
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {(aboutValues[resume.id] ?? "").length} / 2000
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aboutValues[resume.id] ?? resume.about}
            </p>
          )}
        </CardContent>
      </Card>

      {/* --- Key Skills Highlight (chart) --- */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Покрытие навыков на рынке
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {topSkills.map((skill) => (
            <div key={skill.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{skill.name}</span>
                <span className="text-muted-foreground">
                  {skill.count} вакансий
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(skill.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-1">
            Показаны ваши навыки и количество вакансий, где они требуются
          </p>
        </CardContent>
      </Card>

      {/* ===== C. "Как вас видят работодатели" Section ===== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Как вас видят работодатели
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Match summary */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
            <div className="shrink-0">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                <span className="text-lg font-bold text-emerald-700">
                  {matchPercentage}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Ваше резюме соответствует{" "}
                <span className="text-emerald-700">{resume.matchingVacancies}</span>{" "}
                вакансиям из <span className="text-emerald-700">{resume.totalVacancies}</span>
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                На основе анализа навыков, опыта и зарплатных ожиданий
              </p>
            </div>
          </div>

          {/* Skill gaps */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-medium">Недостающие навыки</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Навыки, которые часто требуют работодатели, но которых нет в вашем резюме
            </p>
            <div className="space-y-2">
              {gapRecommendations.map((gap) => (
                <div
                  key={gap.skill}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-200"
                    >
                      {gap.skill}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-medium text-amber-800">
                        +{gap.increase}% совпадений
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1 border-amber-200 text-amber-700 hover:bg-amber-100"
                      onClick={() => {
                        setSkills((prev) => ({
                          ...prev,
                          [resume.id]: [...(prev[resume.id] ?? []), gap.skill],
                        }));
                        toast.success(`Навык «${gap.skill}» добавлен`);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      Добавить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== D. Resume Actions ===== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Действия
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
              onClick={handleUpdateHh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить на HH.ru
            </Button>
            <Button variant="outline" className="h-9" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              Скачать PDF
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Сделать основным</p>
              <p className="text-xs text-muted-foreground">
                Основное резюме используется для автоотклика
              </p>
            </div>
            <Switch
              checked={resume.isDefault}
              onCheckedChange={(checked) => {
                if (checked) handleSetDefault();
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Последняя синхронизация:{" "}
              {new Date(resume.lastSync).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
