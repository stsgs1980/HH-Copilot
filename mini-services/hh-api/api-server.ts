import { Hono } from "hono";
import { cors } from "hono/cors";
import { db, parseResume, parseVacancy, parseNegotiation } from "./db";

const app = new Hono();
app.use("*", cors());

app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

app.get("/api/resumes", (c) => {
  try {
    const rows = db.query("SELECT * FROM resumes ORDER BY isDefault DESC").all();
    const resumes = rows.map(parseResume);
    return c.json({ resumes });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.get("/api/vacancies", (c) => {
  try {
    const rows = db.query("SELECT * FROM vacancies ORDER BY matchScore DESC").all();
    const vacancies = rows.map(parseVacancy);
    const resumeRow = db.query("SELECT * FROM resumes WHERE isDefault = 1").get() as any;
    return c.json({ vacancies, resumeTitle: resumeRow?.title ?? null });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.get("/api/negotiations", (c) => {
  try {
    const rows = db.query("SELECT * FROM negotiations ORDER BY lastMessageTime DESC").all();
    const negotiations = rows.map((row: any) => {
      const messages = db.query("SELECT * FROM negotiation_messages WHERE negotiationId = ? ORDER BY timestamp ASC").all(row.id);
      return parseNegotiation(row, messages);
    });
    return c.json({ negotiations });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.get("/api/stats", (c) => {
  try {
    const totalVacancies = (db.query("SELECT COUNT(*) as cnt FROM vacancies").get() as any).cnt;
    const appliedToday = (db.query("SELECT appliedToday as cnt FROM bot_status WHERE id = 1").get() as any)?.cnt || 0;
    const interviewInvites = (db.query("SELECT COUNT(*) as cnt FROM negotiations WHERE status = 'waiting'").get() as any).cnt;
    const dailyLimit = (db.query("SELECT dailyLimit as cnt FROM bot_status WHERE id = 1").get() as any)?.cnt || 50;
    const stats = { totalVacancies, appliedToday, interviewInvites, dailyLimitRemaining: dailyLimit - appliedToday };
    const chartData = db.query("SELECT * FROM chart_data ORDER BY rowid").all();
    const activityLog = db.query("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 20").all();
    return c.json({ stats, chartData, activityLog });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.get("/api/bot-status", (c) => {
  try {
    const row = db.query("SELECT * FROM bot_status WHERE id = 1").get() as any;
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ botStatus: { ...row, isOnline: row.isOnline === 1, hhConnected: row.hhConnected === 1 } });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.get("/api/settings", (c) => {
  try {
    const row = db.query("SELECT * FROM settings WHERE id = 1").get() as any;
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ settings: row });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.post("/api/resumes/sync", (c) => {
  const now = new Date().toISOString();
  db.prepare("UPDATE resumes SET lastSync = ? WHERE isDefault = 1").run(now);
  return c.json({ success: true, syncedAt: now });
});

app.post("/api/resumes/:id/set-default", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE resumes SET isDefault = 0").run();
  db.prepare("UPDATE resumes SET isDefault = 1 WHERE id = ?").run(id);
  return c.json({ success: true });
});

app.post("/api/resumes/:id/add-skill", async (c) => {
  const id = c.req.param("id");
  const { skill } = await c.req.json();
  if (!skill) return c.json({ error: "Skill required" }, 400);
  const row = db.query("SELECT skills FROM resumes WHERE id = ?").get(id) as any;
  if (!row) return c.json({ error: "Not found" }, 404);
  const skills: string[] = JSON.parse(row.skills);
  if (!skills.includes(skill)) {
    skills.push(skill);
    db.prepare("UPDATE resumes SET skills = ? WHERE id = ?").run(JSON.stringify(skills), id);
  }
  const updated = db.query("SELECT * FROM resumes WHERE id = ?").get(id);
  return c.json({ resume: parseResume(updated) });
});

app.post("/api/resumes/:id/remove-skill", async (c) => {
  const id = c.req.param("id");
  const { skill } = await c.req.json();
  if (!skill) return c.json({ error: "Skill required" }, 400);
  const row = db.query("SELECT skills FROM resumes WHERE id = ?").get(id) as any;
  if (!row) return c.json({ error: "Not found" }, 404);
  let skills: string[] = JSON.parse(row.skills);
  skills = skills.filter(s => s !== skill);
  db.prepare("UPDATE resumes SET skills = ? WHERE id = ?").run(JSON.stringify(skills), id);
  const updated = db.query("SELECT * FROM resumes WHERE id = ?").get(id);
  return c.json({ resume: parseResume(updated) });
});

app.put("/api/resumes/:id", async (c) => {
  const body = await c.req.json();
  const id = c.req.param("id");
  const fields: string[] = [];
  const values: any[] = [];
  const allowed = ["title","position","salary","salaryFrom","salaryTo","currency","city","experience","experienceYears","education","about","isDefault"];
  for (const field of allowed) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(field === "isDefault" ? (body[field] ? 1 : 0) : body[field]);
    }
  }
  if (body.skills !== undefined) { fields.push("skills = ?"); values.push(JSON.stringify(body.skills)); }
  if (body.experienceEntries !== undefined) { fields.push("experienceEntries = ?"); values.push(JSON.stringify(body.experienceEntries)); }
  if (fields.length === 0) return c.json({ error: "No fields" }, 400);
  values.push(id);
  db.prepare(`UPDATE resumes SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (body.isDefault) db.prepare("UPDATE resumes SET isDefault = 0 WHERE id != ?").run(id);
  const row = db.query("SELECT * FROM resumes WHERE id = ?").get(id);
  return c.json({ resume: parseResume(row) });
});

app.post("/api/vacancies/:id/apply", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  db.prepare("UPDATE vacancies SET status = 'applied', coverLetter = ? WHERE id = ?").run(body.coverLetter || null, id);
  const vacancy = db.query("SELECT * FROM vacancies WHERE id = ?").get(id) as any;
  const now = new Date().toISOString();
  db.prepare("UPDATE bot_status SET appliedToday = appliedToday + 1, lastActivity = ?").run(now);
  return c.json({ success: true });
});

app.post("/api/vacancies/:id/skip", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE vacancies SET status = 'skipped' WHERE id = ?").run(id);
  return c.json({ success: true });
});

app.post("/api/vacancies/:id/blacklist", (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE vacancies SET status = 'blacklisted' WHERE id = ?").run(id);
  return c.json({ success: true });
});

app.post("/api/negotiations/:id/message", async (c) => {
  const negId = c.req.param("id");
  const { text, isAutoReply } = await c.req.json();
  if (!text) return c.json({ error: "Text required" }, 400);
  const now = new Date().toISOString();
  const msgId = `m${Date.now()}`;
  db.prepare("INSERT INTO negotiation_messages (id, negotiationId, sender, text, timestamp, isAutoReply) VALUES (?, ?, ?, ?, ?, ?)")
    .run(msgId, negId, isAutoReply ? "bot" : "me", text, now, isAutoReply ? 1 : 0);
  db.prepare("UPDATE negotiations SET lastMessage = ?, lastMessageTime = ? WHERE id = ?").run(text, now, negId);
  return c.json({ success: true, messageId: msgId });
});

app.post("/api/negotiations/:id/toggle-auto-reply", (c) => {
  const negId = c.req.param("id");
  db.prepare("UPDATE negotiations SET autoReply = CASE WHEN autoReply = 1 THEN 0 ELSE 1 END WHERE id = ?").run(negId);
  return c.json({ success: true });
});

app.post("/api/settings", async (c) => {
  const body = await c.req.json();
  const fields: string[] = [];
  const values: any[] = [];
  const allowed = ["mode","careerDirection","letterTone","dailyLimit","searchInterval","minMatchScore"];
  for (const field of allowed) {
    if (body[field] !== undefined) { fields.push(`${field} = ?`); values.push(body[field]); }
  }
  if (fields.length > 0) {
    values.push(1);
    db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
  if (body.mode) db.prepare("UPDATE bot_status SET mode = ? WHERE id = 1").run(body.mode);
  if (body.dailyLimit) db.prepare("UPDATE bot_status SET dailyLimit = ? WHERE id = 1").run(body.dailyLimit);
  const row = db.query("SELECT * FROM settings WHERE id = 1").get();
  return c.json({ success: true, settings: row });
});

app.post("/api/bot-status/reconnect", (c) => {
  db.prepare("UPDATE bot_status SET isOnline = 1, errors = 0 WHERE id = 1").run();
  return c.json({ success: true });
});

const server = Bun.serve({ port: 3001, hostname: "0.0.0.0", fetch: app.fetch });
console.log("[HH-API] Running on http://0.0.0.0:3001");

// Keep alive
setInterval(() => {}, 60000);
