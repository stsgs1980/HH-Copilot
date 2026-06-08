"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(searchParams.get("error_description") || error);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMsg("Код авторизации не получен");
      return;
    }

    // Exchange code for token via our backend
    fetch("/api/hh/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state: searchParams.get("state") || "" }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || "Ошибка сервера"); });
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setStatus("success");
          // Close popup after 2 seconds, or redirect main window
          setTimeout(() => {
            if (window.opener) {
              // We're in a popup — tell parent and close
              window.opener.postMessage({ type: "hh-auth-success" }, "*");
              window.close();
            } else {
              // We're in the main window — go to dashboard
              window.location.href = "/";
            }
          }, 2000);
        } else {
          throw new Error(data.error || "Неизвестная ошибка");
        }
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err.message);
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-emerald-600 animate-spin mb-4" />
              <h1 className="text-xl font-semibold mb-2">Подключение к HH.ru</h1>
              <p className="text-muted-foreground">
                Обмениваем авторизационный код на токен доступа...
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-4" />
              <h1 className="text-xl font-semibold mb-2">Подключено!</h1>
              <p className="text-muted-foreground">
                Ваш аккаунт HH.ru успешно подключён. Возвращаемся в дашборд...
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
              <h1 className="text-xl font-semibold mb-2">Ошибка авторизации</h1>
              <p className="text-muted-foreground">{errorMsg}</p>
              <button
                onClick={() => window.location.href = "/"}
                className="mt-4 text-emerald-600 hover:underline text-sm"
              >
                Вернуться в дашборд
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
