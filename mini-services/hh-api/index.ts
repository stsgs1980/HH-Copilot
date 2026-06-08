import { Hono } from "hono";
import { cors } from "hono/cors";
import { db, parseResume, parseVacancy, parseNegotiation } from "./db";
import { calculateMatchScore, findSkillGaps } from "./matching";
import type { Resume, Vacancy, AppSettings } from "./types";

const app = new Hono();

// CORS for local dev
app.use("*", cors());

// =============================================
// RESUMES
// =============================================

app.get("/api/resumes", (c) => {
  const rows = db.query("SELECT * FROM resumes ORDER BY isDefault DESC").all();
  const resumes = rows.map(parseResume);
  return c.json({ resumes });
});

app.get("/api/resumes/:id", (c) => {
  const row = db.query("SELECT * FROM resumes WHERE id = ?").get(c.req.param("id"));
  if (!row) return c.json({ error: "Resume not found" }, 404);
  return c.json({ resume: parseResume(row) });
});

app.put("/api/resumes/:id", async (c) => {
  const body = await c.req.json();
  const id = c.req.param("id");

  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = [
    "title", "position", "salary", "salaryFrom", "salaryTo", "currency",
    "city", "experience", "experienceYears", "education", "about", "isDefault",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(field === "isDefault" ? (body[field] ? 1 : 0) : body[field]);
    }
  }

  // JSON fields
  if (body.skills !== undefined) {
    fields.push("skills = ?");
    values.push(JSON.stringify(body.skills));
  }
  if (body.experienceEntries !== undefined) {
    fields.push("experienceEntries = ?");
    values.push(JSON.stringify(body.experienceEntries));
  }
  if (body.educationEntries !== undefined) {
    fields.push("educationEntries = ?");
    values.push(JSON.stringify(body.educationEntries));
  }

  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);

  values.push(id);
  db.prepare(`UPDATE resumes SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  // If setting as default, unset others
  if (body.isDefault) {
    db.prepare("UPDATE resumes SET isDefault = 0 WHERE id != ?").run(id);
  }

  // Recalculate matching scores for all vacancies
  recalculateMatches(id);

  const row = db.query("SELECT * FROM resumes WHERE id = ?").get(id);
  return c.json({ resume: parseResume(row) });
});

app.post("/api/resumes/sync", (c) => {
  // Mock: update lastSync timestamp
  const now = new Date().toISOString();
  db.prepare("UPDATE resumes SET lastSync = ? WHERE isDefault = 1").run(now);

  // Add activity log entry
  const id = `a${Date.now()}`;
  db.prepare("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, 'sync', ?, ?)")
    .run(id, "Резюме синхронизированы с HH.ru", now);

  return c.json({ success: true, syncedAt: now });
});

app.post("/api/resumes/:id/set-default", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE resumes SET isDefault = 0").run();
  db.prepare("UPDATE resumes SET isDefault = 1 WHERE id = ?").run(id);
  recalculateMatches(id);
  return c.json({ success: true });
});

app.post("/api/resumes/:id/add-skill", async (c) => {
  const id = c.req.param("id");
  const { skill } = await c.req.json();
  if (!skill) return c.json({ error: "Skill is required" }, 400);

  const row = db.query("SELECT skills FROM resumes WHERE id = ?").get(id) as any;
  if (!row) return c.json({ error: "Resume not found" }, 404);

  const skills: string[] = JSON.parse(row.skills);
  if (!skills.includes(skill)) {
    skills.push(skill);
    db.prepare("UPDATE resumes SET skills = ? WHERE id = ?").run(JSON.stringify(skills), id);
  }

  recalculateMatches(id);
  const updated = db.query("SELECT * FROM resumes WHERE id = ?").get(id);
  return c.json({ resume: parseResume(updated) });
});

app.post("/api/resumes/:id/remove-skill", async (c) => {
  const id = c.req.param("id");
  const { skill } = await c.req.json();
  if (!skill) return c.json({ error: "Skill is required" }, 400);

  const row = db.query("SELECT skills FROM resumes WHERE id = ?").get(id) as any;
  if (!row) return c.json({ error: "Resume not found" }, 404);

  let skills: string[] = JSON.parse(row.skills);
  skills = skills.filter(s => s !== skill);
  db.prepare("UPDATE resumes SET skills = ? WHERE id = ?").run(JSON.stringify(skills), id);

  recalculateMatches(id);
  const updated = db.query("SELECT * FROM resumes WHERE id = ?").get(id);
  return c.json({ resume: parseResume(updated) });
});

// =============================================
// VACANCIES
// =============================================

app.get("/api/vacancies", (c) => {
  const rows = db.query("SELECT * FROM vacancies ORDER BY matchScore DESC").all();
  const vacancies = rows.map(parseVacancy);

  // Get default resume for context
  const resumeRow = db.query("SELECT * FROM resumes WHERE isDefault = 1").get() as any;
  const resumeTitle = resumeRow ? resumeRow.title : null;

  return c.json({ vacancies, resumeTitle });
});

app.post("/api/vacancies/:id/apply", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  db.prepare("UPDATE vacancies SET status = 'applied', coverLetter = ? WHERE id = ?")
    .run(body.coverLetter || null, id);

  const vacancy = db.query("SELECT * FROM vacancies WHERE id = ?").get(id) as any;

  // Add activity log
  const actId = `a${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, 'apply', ?, ?)")
    .run(actId, `Отклик отправлен: ${vacancy?.title} — ${vacancy?.company}`, now);

  // Update bot status appliedToday
  db.prepare("UPDATE bot_status SET appliedToday = appliedToday + 1, lastActivity = ?").run(now);

  // Update chart data for today
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const existing = db.query("SELECT applications FROM chart_data WHERE day = ?").get(today) as any;
  if (existing) {
    db.prepare("UPDATE chart_data SET applications = applications + 1 WHERE day = ?").run(today);
  } else {
    db.prepare("INSERT INTO chart_data (day, applications, interviews) VALUES (?, 1, 0)").run(today);
  }

  return c.json({ success: true, vacancy: parseVacancy(vacancy) });
});

app.post("/api/vacancies/:id/skip", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE vacancies SET status = 'skipped' WHERE id = ?").run(id);

  const vacancy = db.query("SELECT * FROM vacancies WHERE id = ?").get(id) as any;
  const actId = `a${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, 'skip', ?, ?)")
    .run(actId, `Пропущена вакансия: ${vacancy?.title} — ${vacancy?.company} (совпадение ${vacancy?.matchScore}%)`, now);

  return c.json({ success: true });
});

app.post("/api/vacancies/:id/blacklist", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE vacancies SET status = 'blacklisted' WHERE id = ?").run(id);

  const vacancy = db.query("SELECT * FROM vacancies WHERE id = ?").get(id) as any;
  const actId = `a${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, 'blacklist', ?, ?)")
    .run(actId, `Вакансия добавлена в чёрный список: ${vacancy?.title} — ${vacancy?.company}`, now);

  return c.json({ success: true });
});

// =============================================
// NEGOTIATIONS
// =============================================

app.get("/api/negotiations", (c) => {
  const rows = db.query("SELECT * FROM negotiations ORDER BY lastMessageTime DESC").all();
  const negotiations = rows.map((row: any) => {
    const messages = db.query("SELECT * FROM negotiation_messages WHERE negotiationId = ? ORDER BY timestamp ASC")
      .all(row.id);
    return parseNegotiation(row, messages);
  });
  return c.json({ negotiations });
});

app.post("/api/negotiations/:id/message", async (c) => {
  const negId = c.req.param("id");
  const { text, isAutoReply } = await c.req.json();
  if (!text) return c.json({ error: "Text is required" }, 400);

  const now = new Date().toISOString();
  const msgId = `m${Date.now()}`;

  db.prepare(
    "INSERT INTO negotiation_messages (id, negotiationId, sender, text, timestamp, isAutoReply) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(msgId, negId, isAutoReply ? "bot" : "me", text, now, isAutoReply ? 1 : 0);

  db.prepare("UPDATE negotiations SET lastMessage = ?, lastMessageTime = ? WHERE id = ?")
    .run(text, now, negId);

  const neg = db.query("SELECT * FROM negotiations WHERE id = ?").get(negId) as any;
  const actId = `a${Date.now()}`;
  const actType = isAutoReply ? "message" : "message";
  db.prepare("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, ?, ?, ?)")
    .run(actId, actType, `${isAutoReply ? "Авто-ответ" : "Сообщение"}: ${neg?.vacancyTitle} — ${neg?.company}`, now);

  return c.json({ success: true, messageId: msgId });
});

app.post("/api/negotiations/:id/toggle-auto-reply", (c) => {
  const negId = c.req.param("id");
  db.prepare("UPDATE negotiations SET autoReply = CASE WHEN autoReply = 1 THEN 0 ELSE 1 END WHERE id = ?")
    .run(negId);
  return c.json({ success: true });
});

// =============================================
// STATS / DASHBOARD
// =============================================

app.get("/api/stats", (c) => {
  const totalVacancies = (db.query("SELECT COUNT(*) as cnt FROM vacancies").get() as any).cnt;
  const appliedToday = (db.query("SELECT appliedToday as cnt FROM bot_status WHERE id = 1").get() as any)?.cnt || 0;
  const interviewInvites = (db.query("SELECT COUNT(*) as cnt FROM negotiations WHERE status = 'waiting'").get() as any).cnt;
  const dailyLimit = (db.query("SELECT dailyLimit as cnt FROM bot_status WHERE id = 1").get() as any)?.cnt || 50;

  const stats = {
    totalVacancies,
    appliedToday,
    interviewInvites,
    dailyLimitRemaining: dailyLimit - appliedToday,
  };

  const chartData = db.query("SELECT * FROM chart_data ORDER BY rowid").all();
  const activityLog = db.query("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 20").all();

  return c.json({ stats, chartData, activityLog });
});

// =============================================
// BOT STATUS
// =============================================

app.get("/api/bot-status", (c) => {
  const row = db.query("SELECT * FROM bot_status WHERE id = 1").get() as any;
  if (!row) return c.json({ error: "Bot status not found" }, 404);

  const botStatus = {
    ...row,
    isOnline: row.isOnline === 1,
    hhConnected: row.hhConnected === 1,
  };
  return c.json({ botStatus });
});

app.post("/api/bot-status/reconnect", (c) => {
  db.prepare("UPDATE bot_status SET isOnline = 1, errors = 0 WHERE id = 1").run();
  return c.json({ success: true });
});

// =============================================
// SETTINGS
// =============================================

app.get("/api/settings", (c) => {
  const row = db.query("SELECT * FROM settings WHERE id = 1").get() as any;
  if (!row) return c.json({ error: "Settings not found" }, 404);
  return c.json({ settings: row });
});

app.post("/api/settings", async (c) => {
  const body = await c.req.json();

  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = ["mode", "careerDirection", "letterTone", "dailyLimit", "searchInterval", "minMatchScore"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length > 0) {
    values.push(1);
    db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  // Also update bot status mode/dailyLimit
  if (body.mode) {
    db.prepare("UPDATE bot_status SET mode = ? WHERE id = 1").run(body.mode);
  }
  if (body.dailyLimit) {
    db.prepare("UPDATE bot_status SET dailyLimit = ? WHERE id = 1").run(body.dailyLimit);
  }

  const row = db.query("SELECT * FROM settings WHERE id = 1").get();
  return c.json({ success: true, settings: row });
});

// =============================================
// COVER LETTER GENERATION
// =============================================

app.post("/api/cover-letter/generate", async (c) => {
  const { vacancyId, resumeId } = await c.req.json();

  const vacancyRow = db.query("SELECT * FROM vacancies WHERE id = ?").get(vacancyId) as any;
  const resumeRow = db.query("SELECT * FROM resumes WHERE id = ?").get(resumeId) as any;

  if (!vacancyRow || !resumeRow) {
    return c.json({ error: "Vacancy or resume not found" }, 404);
  }

  const vacancy = parseVacancy(vacancyRow);
  const resume = parseResume(resumeRow);

  // Template-based cover letter generation (offline fallback)
  const matchingSkills = vacancy.skills.filter(s =>
    resume.skills.some(rs => rs.toLowerCase() === s.toLowerCase())
  );
  const missingSkills = vacancy.skills.filter(s =>
    !resume.skills.some(rs => rs.toLowerCase() === s.toLowerCase())
  );

  const tone = ((await db.query("SELECT letterTone FROM settings WHERE id = 1").get()) as any)?.letterTone || "confident";

  const greetings: Record<string, string> = {
    confident: "Здравствуйте!",
    friendly: "Приветствую!",
    formal: "Добрый день!",
  };

  const letter = `${greetings[tone] || greetings.confident}

Меня заинтересовала вакансия «${vacancy.title}» в компании ${vacancy.company}. Мой опыт и навыки хорошо соответствуют вашим требованиям.

Ключевые компетенции, релевантные позиции:
${matchingSkills.map(s => `• ${s} — практический опыт в коммерческих проектах`).join("\n")}

${missingSkills.length > 0 ? `Также имею базовое понимание: ${missingSkills.join(", ")} — готов быстро освоить на практике.` : ""}

${resume.experienceEntries.length > 0 ? `На последнем месте работы (${resume.experienceEntries[0].company}, ${resume.experienceEntries[0].position}) ${resume.experienceEntries[0].description.toLowerCase()}` : ""}

Буду рад обсудить детали на интервью. Спасибо за рассмотрение заявки!

С уважением,
${resume.position}`;

  // Save cover letter to vacancy
  db.prepare("UPDATE vacancies SET coverLetter = ? WHERE id = ?").run(letter, vacancyId);

  return c.json({ coverLetter: letter.trim() });
});

// =============================================
// MATCHING RECALCULATION
// =============================================

function recalculateMatches(resumeId?: string) {
  // Get default resume
  const resumeRow = resumeId
    ? db.query("SELECT * FROM resumes WHERE id = ?").get(resumeId)
    : db.query("SELECT * FROM resumes WHERE isDefault = 1").get();

  if (!resumeRow) return;

  const resume = parseResume(resumeRow);
  const vacancies = db.query("SELECT * FROM vacancies").all();

  for (const vRow of vacancies) {
    const vacancy = parseVacancy(vRow);
    const { totalScore, breakdown } = calculateMatchScore(resume, vacancy);

    db.prepare("UPDATE vacancies SET matchScore = ?, matchBreakdown = ? WHERE id = ?")
      .run(totalScore, JSON.stringify(breakdown), vacancy.id);
  }

  // Update resume skill gaps
  const allVacancies = db.query("SELECT * FROM vacancies").all().map(parseVacancy);
  const gaps = findSkillGaps(resume, allVacancies);
  const matchingCount = allVacancies.filter(v => v.matchScore >= 70).length;

  db.prepare("UPDATE resumes SET skillGaps = ?, matchingVacancies = ?, totalVacancies = ? WHERE id = ?")
    .run(JSON.stringify(gaps), matchingCount, allVacancies.length, resume.id);
}

// Run initial match calculation
try {
  recalculateMatches();
  console.log("[API] Initial match calculation done");
} catch (e) {
  console.error("[API] Match calculation error:", e);
}

// =============================================
// HEALTH CHECK
// =============================================

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const port = 3001;
console.log(`[HH-API] Starting on port ${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});
