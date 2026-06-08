"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Bot, Eye, EyeOff, Key, Lock, Mail, Image, MessageSquare, CheckCircle2, XCircle } from "lucide-react";

type LoginStep = "idle" | "checking" | "logging_in" | "captcha" | "two_fa" | "success" | "failed";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [captchaScreenshot, setCaptchaScreenshot] = useState<string | null>(null);
  const [captchaText, setCaptchaText] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const hasCheckedAuth = useRef(false);

  // Check if already connected to HH.ru - only ONCE on mount
  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/hh/auth/status");
        const data = await res.json();
        if (data.connected) {
          router.replace("/");
        } else {
          setIsCheckingAuth(false);
        }
      } catch {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  // Poll login status while in progress
  useEffect(() => {
    if (loginStep !== "logging_in") return;

    const interval = setInterval(async () => {
      try {
        const status = await fetch("/api/hh/auth/login-status").then(r => r.json());
        if (status.state === "success") {
          setLoginStep("success");
          setTimeout(() => router.replace("/"), 1500);
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
  }, [loginStep, router]);

  const handleLogin = async () => {
    if (!email || !password) return;

    setLoginStep("logging_in");
    setLoginError(null);
    setCaptchaScreenshot(null);

    try {
      const result = await fetch("/api/hh/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json());

      if (result.state === "success") {
        setLoginStep("success");
        setTimeout(() => router.replace("/"), 1500);
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
    } catch (err: any) {
      setLoginStep("failed");
      setLoginError(err.message || "Ошибка подключения к серверу");
    }
  };

  const handleSolveCaptcha = async () => {
    if (!captchaText) return;
    setLoginStep("logging_in");

    try {
      const result = await fetch("/api/hh/auth/solve-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: captchaText }),
      }).then(r => r.json());

      if (result.state === "success") {
        setLoginStep("success");
        setTimeout(() => router.replace("/"), 1500);
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
      const result = await fetch("/api/hh/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      }).then(r => r.json());

      if (result.state === "success") {
        setLoginStep("success");
        setTimeout(() => router.replace("/"), 1500);
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

  const handleReset = () => {
    setLoginStep("idle");
    setLoginError(null);
    setCaptchaScreenshot(null);
    setCaptchaText("");
    setTwoFACode("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">HH Bot</CardTitle>
          <CardDescription>
            Войдите через аккаунт HH.ru для работы с дашбордом
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Login form */}
          {(loginStep === "idle" || loginStep === "checking") && (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email от HH.ru</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль от HH.ru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={!email || !password || isCheckingAuth}
              >
                {isCheckingAuth ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Проверка авторизации...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Войти через HH.ru
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Пароль нужен только для входа. Мы сохраняем только cookies, не пароль.
              </p>
            </form>
          )}

          {/* Hidden loading state - only for redirect */}
          {false && loginStep === "checking" && (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          )}

          {/* Logging in */}
          {loginStep === "logging_in" && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 mx-auto text-emerald-600 animate-spin" />
              <p className="font-medium">Выполняется вход на HH.ru...</p>
              <p className="text-sm text-muted-foreground">
                Открывается браузер, вводятся данные
              </p>
            </div>
          )}

          {/* CAPTCHA */}
          {loginStep === "captcha" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Image className="w-5 h-5" />
                <p className="font-medium">HH.ru запросил CAPTCHA</p>
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
                  autoFocus
                />
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
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

          {/* 2FA */}
          {loginStep === "two_fa" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <MessageSquare className="w-5 h-5" />
                <p className="font-medium">Введите код подтверждения</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Код отправлен на ваш email или телефон
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
                  autoFocus
                />
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
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

          {/* Success */}
          {loginStep === "success" && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
              <p className="font-medium">Вход выполнен!</p>
              <p className="text-sm text-muted-foreground">
                Перенаправление в дашборд...
              </p>
            </div>
          )}

          {/* Failed */}
          {loginStep === "failed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <p className="font-medium">Ошибка входа</p>
              </div>
              <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
