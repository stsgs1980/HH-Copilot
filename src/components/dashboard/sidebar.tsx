"use client";

import {
  FileText,
  Briefcase,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Bot,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TabId =
  | "resumes"
  | "vacancies"
  | "negotiations"
  | "dashboard"
  | "settings"
  | "bot-status";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hhConnected: boolean;
  unreadNegotiations: number;
}

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "resumes", label: "Резюме", icon: FileText },
  { id: "vacancies", label: "Вакансии", icon: Briefcase },
  { id: "negotiations", label: "Переговоры", icon: MessageSquare },
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "settings", label: "Настройки", icon: Settings },
  { id: "bot-status", label: "Статус бота", icon: Bot },
];

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  hhConnected,
  unreadNegotiations,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col bg-neutral-900 text-neutral-200 transition-all duration-300 ease-in-out h-full",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-neutral-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold text-sm shrink-0">
          HH
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-white truncate">
              HH Bot
            </h1>
            <p className="text-xs text-neutral-400 truncate">
              Автоотклик
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!collapsed && item.id === "negotiations" && unreadNegotiations > 0 && (
                <Badge className="ml-auto bg-emerald-500 text-white text-xs px-1.5 py-0 border-0">
                  {unreadNegotiations}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Auth section */}
      <div className="px-2 py-2">
        <Separator className="bg-neutral-800 mb-2" />
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg",
            collapsed ? "justify-center" : ""
          )}
        >
          <Shield
            className={cn(
              "w-4.5 h-4.5 shrink-0",
              hhConnected ? "text-emerald-400" : "text-red-400"
            )}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 truncate">
                HH.ru
              </p>
              <p
                className={cn(
                  "text-xs font-medium truncate",
                  hhConnected ? "text-emerald-400" : "text-red-400"
                )}
              >
                {hhConnected ? "Подключено" : "Не подключено"}
              </p>
            </div>
          )}
        </div>

        {hhConnected && !collapsed && (
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-800 hover:text-neutral-400 transition-colors">
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Отключить</span>
          </button>
        )}
      </div>

      {/* Collapse button */}
      <div className="px-2 py-3 border-t border-neutral-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Свернуть</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
