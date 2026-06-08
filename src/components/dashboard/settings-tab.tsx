"use client";

import { useState } from "react";
import {
  Settings,
  Zap,
  Target,
  MessageCircle,
  Gauge,
  Timer,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface AppSettings {
  mode: "auto" | "semi-auto" | "manual";
  careerDirection: string;
  letterTone: string;
  dailyLimit: number;
  searchInterval: number;
  minMatchScore: number;
}

interface SettingsTabProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsTab({ settings, onSettingsChange }: SettingsTabProps) {
  const [saved, setSaved] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Application Mode */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            Режим откликов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.mode}
            onValueChange={(v) =>
              updateSetting("mode", v as AppSettings["mode"])
            }
            className="space-y-3"
          >
            <div className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-colors has-[:checked]:border-emerald-200 has-[:checked]:bg-emerald-50/50">
              <RadioGroupItem value="auto" id="auto" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="auto" className="text-sm font-medium cursor-pointer">
                  Автоматический
                </Label>
                <p className="text-xs text-muted-foreground">
                  Бот автоматически откликается на подходящие вакансии и отвечает на сообщения работодателей
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-colors has-[:checked]:border-emerald-200 has-[:checked]:bg-emerald-50/50">
              <RadioGroupItem value="semi-auto" id="semi-auto" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="semi-auto" className="text-sm font-medium cursor-pointer">
                  Полуавтоматический
                </Label>
                <p className="text-xs text-muted-foreground">
                  Бот автоматически отвечает на сообщения, но отклики требуют вашего подтверждения
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:bg-muted/50 transition-colors has-[:checked]:border-emerald-200 has-[:checked]:bg-emerald-50/50">
              <RadioGroupItem value="manual" id="manual" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="manual" className="text-sm font-medium cursor-pointer">
                  Ручной
                </Label>
                <p className="text-xs text-muted-foreground">
                  Все действия требуют вашего подтверждения. Бот только ищет вакансии
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Career Direction */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Карьерное направление
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Например: Python Developer, Data Engineer, DevOps..."
            value={settings.careerDirection}
            onChange={(e) => updateSetting("careerDirection", e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Влияет на подбор вакансий и формирование сопроводительных писем
          </p>
        </CardContent>
      </Card>

      {/* AI Letter Tone */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Тон сопроводительного письма
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.letterTone}
            onValueChange={(v) => updateSetting("letterTone", v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Формальный — строгий деловой стиль</SelectItem>
              <SelectItem value="friendly">Дружелюбный — мягкий и приветливый</SelectItem>
              <SelectItem value="confident">Уверенный — акцент на достижениях</SelectItem>
              <SelectItem value="creative">Креативный — нестандартный подход</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Numeric Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-600" />
            Параметры поиска
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                Дневной лимит откликов
              </Label>
              <span className="text-sm font-semibold text-emerald-600">
                {settings.dailyLimit}
              </span>
            </div>
            <Slider
              value={[settings.dailyLimit]}
              onValueChange={(v) => updateSetting("dailyLimit", v[0])}
              min={1}
              max={100}
              step={1}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>100</span>
            </div>
          </div>

          <Separator />

          {/* Search Interval */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                Интервал поиска
              </Label>
              <span className="text-sm font-semibold text-emerald-600">
                {settings.searchInterval} мин.
              </span>
            </div>
            <Select
              value={String(settings.searchInterval)}
              onValueChange={(v) =>
                updateSetting("searchInterval", parseInt(v))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Каждые 5 минут</SelectItem>
                <SelectItem value="10">Каждые 10 минут</SelectItem>
                <SelectItem value="15">Каждые 15 минут</SelectItem>
                <SelectItem value="30">Каждые 30 минут</SelectItem>
                <SelectItem value="60">Каждый час</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Min Match Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                Минимальное совпадение
              </Label>
              <span className="text-sm font-semibold text-emerald-600">
                {settings.minMatchScore}%
              </span>
            </div>
            <Slider
              value={[settings.minMatchScore]}
              onValueChange={(v) => updateSetting("minMatchScore", v[0])}
              min={50}
              max={100}
              step={5}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Сохранить настройки
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">
            Настройки сохранены!
          </span>
        )}
      </div>
    </div>
  );
}
