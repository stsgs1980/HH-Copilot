"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Send,
  SkipForward,
  Ban,
  Briefcase,
  MapPin,
  Clock,
  Search,
  Zap,
  Filter,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Vacancy } from "@/lib/mock-data";

// ===== HH.ru Reference Data =====

const HH_AREAS = [
  { id: 1, name: "Москва" },
  { id: 2, name: "Санкт-Петербург" },
  { id: 4, name: "Новосибирск" },
  { id: 54, name: "Екатеринбург" },
  { id: 65, name: "Казань" },
  { id: 76, name: "Ростов-на-Дону" },
  { id: 99, name: "Нижний Новгород" },
  { id: 104, name: "Челябинск" },
  { id: 36, name: "Самара" },
  { id: 66, name: "Краснодар" },
  { id: 88, name: "Уфа" },
  { id: 159, name: "Воронеж" },
  { id: 113, name: "Пермь" },
  { id: 160, name: "Волгоград" },
  { id: 61, name: "Красноярск" },
] as const;

const HH_EXPERIENCE = [
  { id: "", name: "Любой опыт" },
  { id: "noExperience", name: "Нет опыта" },
  { id: "between1And3", name: "1–3 года" },
  { id: "between3And6", name: "3–6 лет" },
  { id: "moreThan6", name: "Более 6 лет" },
] as const;

const HH_EMPLOYMENT = [
  { id: "", name: "Любая занятость" },
  { id: "full", name: "Полная" },
  { id: "part", name: "Частичная" },
  { id: "project", name: "Проектная" },
  { id: "volunteer", name: "Волонтёрство" },
  { id: "probation", name: "Стажировка" },
] as const;

const HH_SCHEDULE = [
  { id: "", name: "Любой график" },
  { id: "fullDay", name: "Полный день" },
  { id: "shift", name: "Сменный" },
  { id: "flexible", name: "Гибкий" },
  { id: "remote", name: "Удалённая работа" },
  { id: "flyInFlyOut", name: "Вахтовый метод" },
] as const;

const HH_ORDER = [
  { id: "relevance", name: "По релевантности" },
  { id: "publication_time", name: "По дате публикации" },
  { id: "salary_desc", name: "Зарплата ↓" },
  { id: "salary_asc", name: "Зарплата ↑" },
] as const;

// ===== Component Props =====

interface VacanciesTabProps {
  vacancies: Vacancy[];
  onApply: (id: string) => void;
  onSkip: (id: string) => void;
  onBlacklist: (id: string) => void;
  onResumeRefresh?: () => void;
  resumeTitle?: string;
}

// ===== Helpers =====

function getScoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score >= 70) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getScoreBarColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
}

const ITEMS_PER_PAGE = 6;

// ===== Main Component =====

export function VacanciesTab({
  vacancies,
  onApply,
  onSkip,
  onBlacklist,
  onResumeRefresh,
  resumeTitle,
}: VacanciesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // HH.ru search params
  const [searchText, setSearchText] = useState("");
  const [searchArea, setSearchArea] = useState<string>("");
  const [searchExperience, setSearchExperience] = useState<string>("");
  const [searchEmployment, setSearchEmployment] = useState<string>("");
  const [searchSchedule, setSearchSchedule] = useState<string>("");
  const [searchSalaryFrom, setSearchSalaryFrom] = useState<string>("");
  const [searchSalaryTo, setSearchSalaryTo] = useState<string>("");
  const [searchOrderBy, setSearchOrderBy] = useState<string>("relevance");
  const [onlyWithSalary, setOnlyWithSalary] = useState(false);

  // HH.ru pagination state
  const [hhPage, setHhPage] = useState(0);
  const [hhTotalFound, setHhTotalFound] = useState<number | null>(null);
  const [hhTotalPages, setHhTotalPages] = useState<number | null>(null);

  // Local filter
  const localFilterQuery = useState("");

  const filtered = useMemo(() => {
    return vacancies.filter((v) => {
      const matchesScore = v.matchScore >= scoreRange[0] && v.matchScore <= scoreRange[1];
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      return matchesScore && matchesStatus;
    });
  }, [vacancies, scoreRange, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const suitableCount = filtered.filter(
    (v) => v.matchScore >= 80 && v.status === "new"
  ).length;

  // ===== Search Handler =====

  const handleSearch = useCallback(async (page?: number) => {
    setIsSearching(true);
    setSearchResult(null);

    try {
      const { searchVacancies } = await import("@/lib/api");
      const result = await searchVacancies({
        text: searchText || undefined,
        area: searchArea ? parseInt(searchArea) : undefined,
        experience: searchExperience || undefined,
        employment: searchEmployment || undefined,
        schedule: searchSchedule || undefined,
        salaryFrom: searchSalaryFrom ? parseInt(searchSalaryFrom) : undefined,
        salaryTo: searchSalaryTo ? parseInt(searchSalaryTo) : undefined,
        onlyWithSalary: onlyWithSalary || undefined,
        orderBy: searchOrderBy || undefined,
        page: page ?? 0,
        perPage: 20,
      });

      setHhTotalFound(result.totalFound ?? null);
      setHhTotalPages(result.pages ?? null);
      setHhPage(page ?? 0);

      if (result.totalFound !== undefined) {
        const matchedText = result.matched ? `, ${result.matched} подходят` : "";
        setSearchResult(
          `Найдено ${result.totalFound.toLocaleString("ru-RU")} вакансий${matchedText}`
        );
      }

      onResumeRefresh?.();
    } catch (e: any) {
      setSearchResult(e.message || "Ошибка поиска");
    } finally {
      setIsSearching(false);
    }
  }, [searchText, searchArea, searchExperience, searchEmployment, searchSchedule, searchSalaryFrom, searchSalaryTo, onlyWithSalary, searchOrderBy, onResumeRefresh]);

  // ===== Reset search =====

  const resetSearch = useCallback(() => {
    setSearchText("");
    setSearchArea("");
    setSearchExperience("");
    setSearchEmployment("");
    setSearchSchedule("");
    setSearchSalaryFrom("");
    setSearchSalaryTo("");
    setSearchOrderBy("relevance");
    setOnlyWithSalary(false);
    setHhTotalFound(null);
    setHhTotalPages(null);
    setHhPage(0);
    setSearchResult(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Search bar + smart search button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск вакансий на HH.ru (должность, навыки, компания...)"
              className="pl-8 h-9 text-sm"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 shrink-0"
            disabled={isSearching}
            onClick={() => handleSearch()}
          >
            {isSearching ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isSearching ? "Ищем..." : "Найти"}
          </Button>
        </div>
      </div>

      {/* Advanced search toggle + results summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="w-3 h-3 mr-1" />
            {showAdvanced ? "Скрыть фильтры" : "Расширенный поиск"}
          </Button>
          {resumeTitle && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              <span>На основе: <span className="font-medium text-foreground">{resumeTitle}</span></span>
            </div>
          )}
        </div>
        {hhTotalFound !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {hhTotalFound.toLocaleString("ru-RU")} вакансий на HH.ru
            </span>
            {(searchText || searchArea || searchExperience || searchEmployment || searchSchedule) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={resetSearch}>
                <X className="w-3 h-3 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Advanced search panel */}
      {showAdvanced && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Region */}
              <Select value={searchArea} onValueChange={setSearchArea}>
                <SelectTrigger className="h-9 text-sm">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Регион" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все регионы</SelectItem>
                  {HH_AREAS.map((area) => (
                    <SelectItem key={area.id} value={String(area.id)}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Experience */}
              <Select value={searchExperience} onValueChange={setSearchExperience}>
                <SelectTrigger className="h-9 text-sm">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Опыт работы" />
                </SelectTrigger>
                <SelectContent>
                  {HH_EXPERIENCE.map((exp) => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Employment type */}
              <Select value={searchEmployment} onValueChange={setSearchEmployment}>
                <SelectTrigger className="h-9 text-sm">
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Занятость" />
                </SelectTrigger>
                <SelectContent>
                  {HH_EMPLOYMENT.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Schedule */}
              <Select value={searchSchedule} onValueChange={setSearchSchedule}>
                <SelectTrigger className="h-9 text-sm">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="График" />
                </SelectTrigger>
                <SelectContent>
                  {HH_SCHEDULE.map((sch) => (
                    <SelectItem key={sch.id} value={sch.id}>
                      {sch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Salary from */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Зарплата от"
                  className="h-9 text-sm"
                  value={searchSalaryFrom}
                  onChange={(e) => setSearchSalaryFrom(e.target.value)}
                />
                <span className="text-xs text-muted-foreground shrink-0">₽</span>
              </div>

              {/* Salary to */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Зарплата до"
                  className="h-9 text-sm"
                  value={searchSalaryTo}
                  onChange={(e) => setSearchSalaryTo(e.target.value)}
                />
                <span className="text-xs text-muted-foreground shrink-0">₽</span>
              </div>
            </div>

            {/* Second row: ordering + salary only + search button */}
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={searchOrderBy} onValueChange={setSearchOrderBy}>
                <SelectTrigger className="h-9 text-sm w-48">
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  {HH_ORDER.map((ord) => (
                    <SelectItem key={ord.id} value={ord.id}>
                      {ord.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWithSalary}
                  onChange={(e) => setOnlyWithSalary(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Только с указанием зарплаты
              </label>

              <div className="ml-auto">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9"
                  disabled={isSearching}
                  onClick={() => handleSearch()}
                >
                  {isSearching ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isSearching ? "Ищем..." : "Искать на HH.ru"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search result notification */}
      {searchResult && (
        <div className={`text-sm px-3 py-2 rounded-md ${
          searchResult.includes("Ошибка") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
        }`}>
          {searchResult}
        </div>
      )}

      {/* Local filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Фильтры по списку</span>
            <span className="text-xs text-muted-foreground ml-1">
              ({filtered.length} из {vacancies.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="applied">Отклик отправлен</SelectItem>
                <SelectItem value="skipped">Пропущено</SelectItem>
                <SelectItem value="blacklisted">Чёрный список</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Совпадение: {scoreRange[0]}%-{scoreRange[1]}%</span>
              </div>
              <Slider
                value={scoreRange}
                onValueChange={(v) => {
                  setScoreRange(v);
                  setCurrentPage(1);
                }}
                min={0}
                max={100}
                step={5}
                className="py-1"
              />
            </div>
            <Button
              onClick={() => {
                const suitable = filtered.filter(
                  (v) => v.matchScore >= 80 && v.status === "new"
                );
                suitable.forEach((v) => onApply(v.id));
              }}
              disabled={suitableCount === 0}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Откликнуться на все подходящие ({suitableCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              disabled={isSearching}
              onClick={() => handleSearch()}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSearching ? "animate-spin" : ""}`} />
              Обновить поиск
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HH.ru page navigation (if multiple pages) */}
      {hhTotalPages !== null && hhTotalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Страница HH.ru: {hhPage + 1} из {hhTotalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={hhPage === 0 || isSearching}
              onClick={() => handleSearch(hhPage - 1)}
            >
              Назад
            </Button>
            {Array.from({ length: Math.min(hhTotalPages, 5) }, (_, i) => {
              // Show pages around current page
              const startPage = Math.max(0, Math.min(hhPage - 2, hhTotalPages - 5));
              const pageNum = startPage + i;
              if (pageNum >= hhTotalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === hhPage ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 text-xs p-0 ${
                    pageNum === hhPage ? "bg-blue-600 hover:bg-blue-700" : ""
                  }`}
                  disabled={isSearching}
                  onClick={() => handleSearch(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={hhPage >= hhTotalPages - 1 || isSearching}
              onClick={() => handleSearch(hhPage + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      )}

      {/* Vacancies List */}
      <div className="space-y-3">
        {paginated.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Вакансии не найдены</p>
              <p className="text-xs mt-1">
                {vacancies.length === 0
                  ? "Нажмите «Найти» для поиска вакансий на HH.ru"
                  : "Попробуйте изменить параметры фильтра"}
              </p>
              {vacancies.length === 0 && (
                <Button
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  disabled={isSearching}
                  onClick={() => handleSearch()}
                >
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Искать вакансии на HH.ru
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          paginated.map((vacancy) => {
            const isExpanded = expandedId === vacancy.id;
            return (
              <Card
                key={vacancy.id}
                className="border-0 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : vacancy.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold truncate">
                            {vacancy.title}
                          </h3>
                          <Badge
                            className={`text-xs px-1.5 py-0 border ${getScoreColor(vacancy.matchScore)}`}
                          >
                            {vacancy.matchScore}%
                          </Badge>
                          {vacancy.status !== "new" && (
                            <Badge
                              variant={
                                vacancy.status === "applied"
                                  ? "default"
                                  : vacancy.status === "skipped"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {vacancy.status === "applied"
                                ? "Отклик"
                                : vacancy.status === "skipped"
                                  ? "Пропущено"
                                  : "Блок"}
                            </Badge>
                          )}
                          {/* External link to HH.ru */}
                          {vacancy.url && vacancy.url !== "#" && (
                            <a
                              href={vacancy.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground">
                            {vacancy.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">
                              {vacancy.salary}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {vacancy.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {vacancy.experience}
                          </span>
                          {vacancy.publishedAt && (
                            <span className="text-muted-foreground">
                              {vacancy.publishedAt}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {vacancy.skills.slice(0, 5).map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-xs px-1.5 py-0 font-normal"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {vacancy.skills.length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{vacancy.skills.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {vacancy.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {vacancy.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      {/* Match breakdown */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Детали совпадения
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(
                            [
                              ["Навыки", vacancy.matchBreakdown.skills],
                              ["Опыт", vacancy.matchBreakdown.experience],
                              ["Зарплата", vacancy.matchBreakdown.salary],
                              ["Локация", vacancy.matchBreakdown.location],
                            ] as const
                          ).map(([label, value]) => (
                            <div key={label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium">{value}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getScoreBarColor(value)}`}
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {vacancy.status === "new" && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApply(vacancy.id);
                            }}
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Откликнуться
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSkip(vacancy.id);
                            }}
                          >
                            <SkipForward className="w-3.5 h-3.5 mr-1.5" />
                            Пропустить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBlacklist(vacancy.id);
                            }}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1.5" />
                            В чёрный список
                          </Button>
                          {vacancy.url && vacancy.url !== "#" && (
                            <a
                              href={vacancy.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto"
                            >
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Открыть на HH.ru
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Local pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} из{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Назад
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className={`h-8 w-8 text-xs p-0 ${
                  page === currentPage ? "bg-emerald-600 hover:bg-emerald-700" : ""
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
