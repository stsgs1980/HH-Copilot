"use client";

import {
  Briefcase,
  Send,
  GraduationCap,
  Gauge,
  Activity,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import type { DashboardStats, ChartData, ActivityLogEntry, BotStatus } from "@/lib/mock-data";
import { activityIcons } from "@/lib/mock-data";

interface DashboardTabProps {
  stats: DashboardStats;
  chartData: ChartData[];
  activityLog: ActivityLogEntry[];
  botStatus: BotStatus;
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  return `${diffDays} дн. назад`;
}

const chartConfig = {
  applications: {
    label: "Отклики",
    color: "#10b981",
  },
  interviews: {
    label: "Интервью",
    color: "#f59e0b",
  },
};

export function DashboardTab({ stats, chartData, activityLog, botStatus }: DashboardTabProps) {
  const limitPercent = Math.round(
    ((botStatus.dailyLimit - stats.dailyLimitRemaining) / botStatus.dailyLimit) * 100
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Вакансий найдено</p>
                <p className="text-3xl font-bold mt-1">{stats.totalVacancies}</p>
              </div>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Откликов сегодня</p>
                <p className="text-3xl font-bold mt-1">{stats.appliedToday}</p>
              </div>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-50 text-amber-600">
                <Send className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Приглашений на интервью</p>
                <p className="text-3xl font-bold mt-1">{stats.interviewInvites}</p>
              </div>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-50 text-purple-600">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Лимит оставшийся</p>
                <p className="text-3xl font-bold mt-1">{stats.dailyLimitRemaining}</p>
                <Progress value={limitPercent} className="mt-2 h-1.5" />
              </div>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-rose-50 text-rose-600">
                <Gauge className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bot Status + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bot Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Статус бота
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  botStatus.isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">
                {botStatus.isOnline ? "Онлайн" : "Оффлайн"}
              </span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {botStatus.mode === "auto"
                  ? "Авто"
                  : botStatus.mode === "semi-auto"
                    ? "Полуавто"
                    : "Ручной"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="block">Аптайм</span>
                <span className="text-foreground font-medium">{botStatus.uptime}</span>
              </div>
              <div>
                <span className="block">Ошибки</span>
                <span className="text-foreground font-medium">{botStatus.errors}</span>
              </div>
              <div>
                <span className="block">HH.ru</span>
                <span className={botStatus.hhConnected ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                  {botStatus.hhConnected ? "Подключён" : "Отключён"}
                </span>
              </div>
              <div>
                <span className="block">Токен до</span>
                <span className="text-foreground font-medium">
                  {new Date(botStatus.tokenExpiry).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активность за 7 дней</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v: string) => v.replace(/мая|июня/, "").trim()}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="applications"
                  fill="var(--color-applications)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="interviews"
                  fill="var(--color-interviews)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Последняя активность
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {activityLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-base shrink-0 mt-0.5">{activityIcons[entry.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{entry.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(entry.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
