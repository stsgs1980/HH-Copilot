"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Loader2,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  Image,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { BotStatus } from "@/lib/mock-data";
import {
  loginHH,
  getLoginStatus,
  solveCaptcha,
  verify2FA,
  getAuthStatus,
  verifySession,
  disconnectHH,
} from "@/lib/api";

interface BotStatusTabProps {
  botStatus: BotStatus;
  onReconnect: () => void;
  onAuthChange?: () => void;
}

type LoginStep = "idle" | "logging_in" | "captcha" | "two_fa" | "success" | "failed";

export function BotStatusTab({ botStatus, onReconnect, onAuthChange }: BotStatusTabProps) {
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [captchaScreenshot, setCaptchaScreenshot] = useState<string | null>(null);
  const [captchaText, setCaptchaText] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [isConnected, setIsConnected] = useState(botStatus.hhConnected);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);

  // Poll login status while in progress
  useEffect(() => {
    if (loginStep !== "logging_in") return;

    const interval = setInterval(async () => {
      try {
        const status = await getLoginStatus();
        if (status.state === "success") {
          setLoginStep("success");
          setIsConnected(true);
          onAuthChange?.();
        } else if (status.state === "captcha_required") {
          setLoginStep("captcha");
          if (status.screenshot) setCaptchaScreenshot(status.screenshot);
        } else if (status.state === "two_fa_required") {
          setLoginStep("two_fa");
          if (status.screenshot) setCaptchaScreenshot(status.screenshot);
        } else if (status.state === "failed") {
          setLoginStep("failed");
          setLoginError(status.error || "Ошибка входа");
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [loginStep, onAuthChange]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await getAuthStatus();
        setIsConnected(status.connected);
        if (status.email) setConnectedEmail(status.email);
      } catch {
        // Ignore
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;

    setLoginStep("logging_in");
    setLoginError(null);
    setCaptchaScreenshot(null);

    try {
      const result = await loginHH(email, password);

      if (result.state === "success") {
        setLoginStep("success");
        setIsConnected(true);
        setConnectedEmail(email);
        onAuthChange?.();
      } else if (result.state === "captcha_required") {
        setLoginStep("captcha");
        if (result.screenshot) setCaptchaScreenshot(result.screenshot);
      } else if (result.state === "two_fa_required") {
        setLoginStep("two_fa");
        if (result.screenshot) setCaptchaScreenshot(result.screenshot);
      } else if (result.state === "failed") {
        setLoginStep("failed");
        setLoginError(result.error || "Ошибка входа");
      }
      // "in_progress" state — poll via useEffect
    } catch (err: any) {
      setLoginStep("failed");
      setLoginError(err.message || "Ошибка подключения к серверу");
    }
  };

  const handleSolveCaptcha = async () => {
    if (!captchaText) return;
    setLoginStep("logging_in");

    try {
      const result = await solveCaptcha(captchaText);
      if (result.state === "success") {
        setLoginStep("success");
        setIsConnected(true);
        setConnectedEmail(email);
        onAuthChange?.();
      } else if (result.state === "captcha_required") {
        setLoginStep("captcha");
        if (result.screenshot) setCaptchaScreenshot(result.screenshot);
        setCaptchaText("");
        setLoginError("Неверный текст CAPTCHA, попробуйте снова");
      } else if (result.state === "two_fa_required") {
        setLoginStep("two_fa");
      } else if (result.state === "failed") {
        setLoginStep("failed");
        setLoginError(result.error || "Ошибка при вводе CAPTCHA");
      }
    } catch (err: any) {
      setLoginStep("captcha");
      setLoginError(err.message);
    }
  };

  const handleSubmit2FA = async () => {
    if (!twoFACode) return;
    setLoginStep("logging_in");

    try {
      const result = await verify2FA(twoFACode);
      if (result.state === "success") {
        setLoginStep("success");
        setIsConnected(true);
        setConnectedEmail(email);
        onAuthChange?.();
      } else if (result.state === "two_fa_required") {
        setLoginStep("two_fa");
        setTwoFACode("");
        setLoginError("Неверный код, попробуйте снова");
      } else if (result.state === "failed") {
        setLoginStep("failed");
        setLoginError(result.error || "Ошибка при вводе 2FA");
      }
    } catch (err: any) {
      setLoginStep("two_fa");
      setLoginError(err.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectHH();
      setIsConnected(false);
      setConnectedEmail(null);
      setLoginStep("idle");
      setEmail("");
      setPassword("");
      onAuthChange?.();
    } catch {
      // Ignore
    }
  };

  const handleVerifySession = async () => {
    setVerifyingSession(true);
    try {
      const result = await verifySession();
      setIsConnected(result.valid);
      if (!result.valid) {
        setLoginStep("idle");
      }
    } catch {
      setIsConnected(false);
      setLoginStep("idle");
    } finally {
      setVerifyingSession(false);
    }
  };

  const handleReset = () => {
    setLoginStep("idle");
    setLoginError(null);
    setCaptchaScreenshot(null);
    setCaptchaText("");
    setTwoFACode("");
  };

  const limitUsed =
    botStatus.dailyLimit > 0
      ? Math.round((botStatus.appliedToday / botStatus.dailyLimit) * 100)
      : 0;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Main Status */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                botStatus.isOnline
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              <Bot className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {botStatus.isOnline ? "Бот работает" : "Бот остановлен"}
                </h2>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    botStatus.isOnline
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Режим:{" "}
                <span className="font-medium text-foreground">
                  {botStatus.mode === "auto"
                    ? "Автоматический"
                    : botStatus.mode === "semi-auto"
                      ? "Полуавтоматический"
                      : "Ручной"}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={onReconnect}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Перезапустить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium">Аптайм</span>
            </div>
            <p className="text-2xl font-bold">{botStatus.uptime}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Последняя активность:{" "}
              {new Date(botStatus.lastActivity).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium">Дневной лимит</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold">{botStatus.appliedToday}</p>
              <span className="text-sm text-muted-foreground">
                / {botStatus.dailyLimit}
              </span>
            </div>
            <Progress value={limitUsed} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              Использовано {limitUsed}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Ошибки</span>
            </div>
            <p className="text-2xl font-bold">{botStatus.errors}</p>
            <p className="text-xs text-muted-foreground mt-1">За текущую сессию</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium">Режим работы</span>
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${
                botStatus.mode === "auto"
                  ? "bg-emerald-100 text-emerald-700"
                  : botStatus.mode === "semi-auto"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {botStatus.mode === "auto"
                ? "Авто"
                : botStatus.mode === "semi-auto"
                  ? "Полуавто"
                  : "Ручной"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* HH.ru Auth Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Авторизация HH.ru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Connection status badge */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isConnected ? "Подключено к HH.ru" : "Не подключено к HH.ru"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? connectedEmail
                      ? `Вход через ${connectedEmail} (Playwright)`
                      : "Сессия через Playwright активна"
                    : "Введите логин и пароль от HH.ru"}
                </p>
              </div>
              <Badge
                className={
                  isConnected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {isConnected ? "Активен" : "Отсутствует"}
              </Badge>
            </div>

            {/* Connected state — verify/disconnect */}
            {isConnected && loginStep === "idle" && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Метод авторизации</p>
                    <p className="font-medium">Playwright (cookies)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{connectedEmail || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={handleVerifySession}
                    disabled={verifyingSession}
                  >
                    {verifyingSession ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Проверить сессию
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnect}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Отключить
                  </Button>
                </div>
              </>
            )}

            {/* Login form — when not connected */}
            {!isConnected && loginStep === "idle" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email от HH.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Пароль от HH.ru"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleLogin}
                  disabled={!email || !password}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Войти на HH.ru
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Пароль нужен только для входа. Мы сохраняем только cookies, не пароль.
                </p>
              </div>
            )}

            {/* Logging in — spinner */}
            {loginStep === "logging_in" && (
              <div className="text-center py-4 space-y-3">
                <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" />
                <p className="text-sm font-medium">Выполняется вход на HH.ru...</p>
                <p className="text-xs text-muted-foreground">
                  Открывается браузер, вводятся данные
                </p>
              </div>
            )}

            {/* CAPTCHA required */}
            {loginStep === "captcha" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <Image className="w-5 h-5" />
                  <p className="text-sm font-medium">HH.ru запросил CAPTCHA</p>
                </div>

                {captchaScreenshot && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${captchaScreenshot}`}
                      alt="CAPTCHA"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Введите текст с картинки"
                    value={captchaText}
                    onChange={(e) => setCaptchaText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSolveCaptcha()}
                  />
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    onClick={handleSolveCaptcha}
                    disabled={!captchaText}
                  >
                    Отправить
                  </Button>
                </div>
                {loginError && (
                  <p className="text-xs text-red-500">{loginError}</p>
                )}
              </div>
            )}

            {/* 2FA required */}
            {loginStep === "two_fa" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <MessageSquare className="w-5 h-5" />
                  <p className="text-sm font-medium">HH.ru запросил код подтверждения</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Введите код из SMS или email
                </p>

                {captchaScreenshot && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${captchaScreenshot}`}
                      alt="2FA screen"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Код подтверждения"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    inputMode="numeric"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit2FA()}
                  />
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    onClick={handleSubmit2FA}
                    disabled={!twoFACode}
                  >
                    Отправить
                  </Button>
                </div>
                {loginError && (
                  <p className="text-xs text-red-500">{loginError}</p>
                )}
              </div>
            )}

            {/* Login success */}
            {loginStep === "success" && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
                <p className="text-sm font-medium">Вход выполнен успешно!</p>
                <p className="text-xs text-muted-foreground">
                  Cookies сохранены. Теперь система может работать с HH.ru.
                </p>
              </div>
            )}

            {/* Login failed */}
            {loginStep === "failed" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <p className="text-sm font-medium">Ошибка входа</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {loginError || "Не удалось войти. Проверьте данные и попробуйте снова."}
                </p>

                {captchaScreenshot && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${captchaScreenshot}`}
                      alt="Error screenshot"
                      className="w-full"
                    />
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                >
                  Попробовать снова
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
