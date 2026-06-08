import fs from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";

// ===== Types =====

export interface HHCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  session?: boolean;
}

export type LoginState =
  | "idle"
  | "logging_in"
  | "captcha"
  | "two_fa"
  | "success"
  | "failed";

export interface LoginStatus {
  state: LoginState;
  error?: string | null;
  screenshot?: string | null;
}

export interface SessionInfo {
  connected: boolean;
  email?: string;
  authMethod?: string;
}

// ===== Paths =====

const DOWNLOAD_DIR = path.join(process.cwd(), "download");
const COOKIES_PATH = path.join(DOWNLOAD_DIR, "cookies_backup.json");
const COOKIES_OFF_PATH = path.join(DOWNLOAD_DIR, "cookies_backup.json.off");
const LOGIN_STATUS_PATH = path.join(DOWNLOAD_DIR, "hh_login_status.json");
const LOGIN_INPUT_PATH = path.join(DOWNLOAD_DIR, "hh_login_input.json");
const LOGIN_SCRIPT_PATH = path.join(DOWNLOAD_DIR, "hh_login.py");
const RESUMES_PATH = path.join(
  DOWNLOAD_DIR,
  "output",
  "parsed_resumes.json"
);

// ===== In-memory State =====

let cookies: HHCookie[] = [];
let loginState: LoginState = "idle";
let loginError: string | null = null;
let loginScreenshot: string | null = null;
let connectedEmail: string | undefined;
let lastVerified: number | undefined;
let loginProcess: ChildProcess | null = null;

// ===== Initialization =====

loadCookies();

function loadCookies(): void {
  try {
    // If there's a disconnect marker, don't load cookies
    if (fs.existsSync(COOKIES_OFF_PATH)) {
      cookies = [];
      console.log("[hh-session] Disconnected (marker file exists)");
      return;
    }
    if (fs.existsSync(COOKIES_PATH)) {
      const raw = fs.readFileSync(COOKIES_PATH, "utf-8");
      cookies = JSON.parse(raw);
      console.log(`[hh-session] Loaded ${cookies.length} cookies from file`);
    }
  } catch (err) {
    console.error("[hh-session] Failed to load cookies:", err);
    cookies = [];
  }
}

// ===== Cookie Helpers =====

function isExpired(cookie: HHCookie): boolean {
  if (!cookie.expirationDate) return false; // session cookies
  return cookie.expirationDate * 1000 < Date.now();
}

function getActiveCookies(): HHCookie[] {
  return cookies.filter((c) => !isExpired(c));
}

function hasAuthCookies(): boolean {
  const active = getActiveCookies();
  return (
    active.some((c) => c.name === "hhtoken") &&
    active.some((c) => c.name === "hhuid")
  );
}

function formatCookieHeader(): string {
  return getActiveCookies()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function getEmailFromResumes(): string | undefined {
  try {
    if (!fs.existsSync(RESUMES_PATH)) return undefined;
    const raw = fs.readFileSync(RESUMES_PATH, "utf-8");
    const data = JSON.parse(raw);
    const resumes = Array.isArray(data) ? data : data.resumes || [];
    for (const r of resumes) {
      if (r.email) return r.email;
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ===== Session Verification =====

async function verifyWithHHru(): Promise<boolean> {
  if (!hasAuthCookies()) return false;

  try {
    const cookieHeader = formatCookieHeader();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://hh.ru/applicant/settings", {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const url = response.url || "";
    const text = await response.text();

    if (response.status === 200) {
      if (url.includes("login") || text.includes('data-qa="account-login"')) {
        return false;
      }
      if (
        text.includes("hhrole") ||
        text.includes("applicant") ||
        text.includes("magritte") ||
        url.includes("applicant")
      ) {
        lastVerified = Date.now();
        return true;
      }
      lastVerified = Date.now();
      return true;
    }

    return false;
  } catch (err) {
    console.error("[hh-session] Verification request failed:", err);
    if (hasAuthCookies()) {
      lastVerified = Date.now();
      return true;
    }
    return false;
  }
}

// ===== Login Script Management =====

function readLoginStatusFromFile(): LoginStatus {
  try {
    if (fs.existsSync(LOGIN_STATUS_PATH)) {
      const raw = fs.readFileSync(LOGIN_STATUS_PATH, "utf-8");
      const status = JSON.parse(raw);

      if (status.state) {
        loginState = status.state;
        loginError = status.error || null;
        loginScreenshot = status.screenshot || null;

        if (loginState === "success") {
          loadCookies();
          if (!connectedEmail) {
            connectedEmail = getEmailFromResumes();
          }
        }
      }
    }
  } catch {
    // File might be partially written — keep current state
  }

  return {
    state: loginState,
    error: loginError,
    screenshot: loginScreenshot,
  };
}

function writeLoginInput(
  action: "solve_captcha" | "verify_2fa",
  value: string
): void {
  const input = {
    action,
    value,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(
    LOGIN_INPUT_PATH,
    JSON.stringify(input, null, 2),
    "utf-8"
  );
}

async function startLoginProcess(
  email: string,
  password: string
): Promise<LoginStatus> {
  if (hasAuthCookies()) {
    connectedEmail = email || getEmailFromResumes();
    loginState = "success";
    loginError = null;
    return { state: "success" };
  }

  if (!fs.existsSync(LOGIN_SCRIPT_PATH)) {
    return {
      state: "failed",
      error:
        "Скрипт авторизации (hh_login.py) не найден. Запустите парсер parse_resume.py для получения cookies.",
    };
  }

  if (loginProcess) {
    loginProcess.kill();
    loginProcess = null;
  }

  loginState = "logging_in";
  loginError = null;
  loginScreenshot = null;
  connectedEmail = email;

  try {
    if (fs.existsSync(LOGIN_STATUS_PATH)) fs.unlinkSync(LOGIN_STATUS_PATH);
    if (fs.existsSync(LOGIN_INPUT_PATH)) fs.unlinkSync(LOGIN_INPUT_PATH);
  } catch {
    // ignore
  }

  if (fs.existsSync(COOKIES_OFF_PATH) && !fs.existsSync(COOKIES_PATH)) {
    try {
      fs.renameSync(COOKIES_OFF_PATH, COOKIES_PATH);
    } catch {
      // ignore
    }
  }

  try {
    loginProcess = spawn("python", [LOGIN_SCRIPT_PATH, "--email", email, "--password", password], {
      cwd: DOWNLOAD_DIR,
      stdio: "pipe",
    });

    loginProcess.on("error", (err) => {
      console.error("[hh-session] Login process error:", err);
      loginState = "failed";
      loginError = `Не удалось запустить Python: ${err.message}`;
      loginProcess = null;
    });

    loginProcess.on("exit", (code) => {
      console.log(`[hh-session] Login process exited with code ${code}`);
      loginProcess = null;
    });

    return { state: "logging_in" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      state: "failed",
      error: `Ошибка запуска: ${msg}`,
    };
  }
}

function killLoginProcess(): void {
  if (loginProcess) {
    loginProcess.kill();
    loginProcess = null;
  }
  loginState = "idle";
  loginError = null;
  loginScreenshot = null;
}

// ===== Public API =====

export const hhSession = {
  get isConnected() {
    return hasAuthCookies();
  },
  get cookieHeader() {
    return formatCookieHeader();
  },
  get activeCookies() {
    return getActiveCookies();
  },

  get email() {
    return connectedEmail || getEmailFromResumes();
  },
  setEmail(email: string) {
    connectedEmail = email;
  },

  get loginStatus(): LoginStatus {
    return {
      state: loginState,
      error: loginError,
      screenshot: loginScreenshot,
    };
  },

  startLogin: startLoginProcess,
  readLoginStatus: readLoginStatusFromFile,
  writeLoginInput,
  killLogin: killLoginProcess,

  reloadCookies: loadCookies,
  saveCookies(newCookies: HHCookie[]) {
    const dir = path.dirname(COOKIES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      COOKIES_PATH,
      JSON.stringify(newCookies, null, 2),
      "utf-8"
    );
    cookies = newCookies;
  },

  clearSession() {
    cookies = [];
    loginState = "idle";
    loginError = null;
    loginScreenshot = null;
    connectedEmail = undefined;
    lastVerified = undefined;
    killLoginProcess();
  },

  disconnect() {
    killLoginProcess();
    cookies = [];
    loginState = "idle";
    loginError = null;
    loginScreenshot = null;
    connectedEmail = undefined;
    lastVerified = undefined;

    try {
      const marker = { disconnected: true, timestamp: Date.now() };
      fs.writeFileSync(
        COOKIES_OFF_PATH,
        JSON.stringify(marker, null, 2),
        "utf-8"
      );
    } catch {
      // ignore FS errors
    }
  },

  restore() {
    try {
      if (fs.existsSync(COOKIES_OFF_PATH)) {
        fs.unlinkSync(COOKIES_OFF_PATH);
      }
    } catch {
      // ignore
    }
    loadCookies();
  },

  verify: verifyWithHHru,
  get lastVerified() {
    return lastVerified;
  },

  get loginScriptExists() {
    return fs.existsSync(LOGIN_SCRIPT_PATH);
  },
  get cookiesExist() {
    return fs.existsSync(COOKIES_PATH);
  },
};
