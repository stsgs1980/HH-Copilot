// Database query helper using sql.js (Node.js compatible SQLite)
// Reads from the real SQLite database used by the Bun API service

import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = "/home/z/my-project/mini-services/hh-api/hh-bot.db";

let sqlJsReady: Promise<any> | null = null;
let dbInstance: SqlJsDatabase | null = null;

async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  if (!sqlJsReady) {
    sqlJsReady = initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    }).then((SQL) => {
      const buf = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(buf);
      return SQL;
    });
  }

  await sqlJsReady;
  return dbInstance!;
}

// Save the database back to disk (for write operations)
function saveDb(db: SqlJsDatabase) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper to convert sql.js results to array of objects
function resultsToArray(results: any[]): Record<string, any>[] {
  if (!results || results.length === 0) return [];
  const result = results[0];
  if (!result.values || result.values.length === 0) return [];

  return result.values.map((row: any[]) => {
    const obj: Record<string, any> = {};
    result.columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Parse a resume row from DB
function parseResume(row: any) {
  return {
    ...row,
    skills: JSON.parse(row.skills || "[]"),
    experienceEntries: JSON.parse(row.experienceEntries || "[]"),
    educationEntries: JSON.parse(row.educationEntries || "[]"),
    skillGaps: JSON.parse(row.skillGaps || "[]"),
    isDefault: row.isDefault === 1,
  };
}

// Parse a vacancy row from DB
function parseVacancy(row: any) {
  return {
    ...row,
    skills: JSON.parse(row.skills || "[]"),
    matchBreakdown: JSON.parse(row.matchBreakdown || "{}"),
  };
}

// Parse a negotiation with messages
function parseNegotiation(row: any, messages: any[]) {
  return {
    ...row,
    unread: row.unread || 0,
    autoReply: row.autoReply === 1,
    messages: messages.map((m: any) => ({
      ...m,
      isAutoReply: m.isAutoReply === 1,
    })),
  };
}

// ===== RESUMES =====

export async function dbGetResumes() {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT * FROM resumes ORDER BY isDefault DESC"));
  return rows.map(parseResume);
}

export async function dbGetResume(id: string) {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT * FROM resumes WHERE id = ?", [id]));
  return rows.length > 0 ? parseResume(rows[0]) : null;
}

export async function dbUpdateResume(id: string, data: Record<string, any>) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = [
    "title", "position", "salary", "salaryFrom", "salaryTo", "currency",
    "city", "experience", "experienceYears", "education", "about", "isDefault",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(field === "isDefault" ? (data[field] ? 1 : 0) : data[field]);
    }
  }

  if (data.skills !== undefined) {
    fields.push("skills = ?");
    values.push(JSON.stringify(data.skills));
  }
  if (data.experienceEntries !== undefined) {
    fields.push("experienceEntries = ?");
    values.push(JSON.stringify(data.experienceEntries));
  }

  if (fields.length === 0) return null;

  values.push(id);
  db.run(`UPDATE resumes SET ${fields.join(", ")} WHERE id = ?`, values);

  if (data.isDefault) {
    db.run("UPDATE resumes SET isDefault = 0 WHERE id != ?", [id]);
  }

  saveDb(db);

  // Reload from disk
  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return await dbGetResume(id);
}

export async function dbSyncResumes() {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run("UPDATE resumes SET lastSync = ? WHERE isDefault = 1", [now]);

  const id = `a${Date.now()}`;
  db.run("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, 'sync', ?, ?)", [
    id, "Резюме синхронизированы с HH.ru", now,
  ]);

  saveDb(db);
  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true, syncedAt: now };
}

export async function dbSetDefaultResume(id: string) {
  const db = await getDb();
  db.run("UPDATE resumes SET isDefault = 0");
  db.run("UPDATE resumes SET isDefault = 1 WHERE id = ?", [id]);
  saveDb(db);

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true };
}

export async function dbAddSkill(resumeId: string, skill: string) {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT skills FROM resumes WHERE id = ?", [resumeId]));
  if (rows.length === 0) return null;

  const skills: string[] = JSON.parse(rows[0].skills);
  if (!skills.includes(skill)) {
    skills.push(skill);
    db.run("UPDATE resumes SET skills = ? WHERE id = ?", [JSON.stringify(skills), resumeId]);
    saveDb(db);
  }

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return await dbGetResume(resumeId);
}

export async function dbRemoveSkill(resumeId: string, skill: string) {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT skills FROM resumes WHERE id = ?", [resumeId]));
  if (rows.length === 0) return null;

  let skills: string[] = JSON.parse(rows[0].skills);
  skills = skills.filter((s) => s !== skill);
  db.run("UPDATE resumes SET skills = ? WHERE id = ?", [JSON.stringify(skills), resumeId]);
  saveDb(db);

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return await dbGetResume(resumeId);
}

// ===== VACANCIES =====

export async function dbGetVacancies() {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT * FROM vacancies ORDER BY matchScore DESC"));
  const vacancies = rows.map(parseVacancy);

  const resumeRows = resultsToArray(db.exec("SELECT title FROM resumes WHERE isDefault = 1"));
  const resumeTitle = resumeRows.length > 0 ? resumeRows[0].title : null;

  return { vacancies, resumeTitle };
}

export async function dbApplyToVacancy(id: string, coverLetter?: string) {
  const db = await getDb();
  db.run("UPDATE vacancies SET status = 'applied', coverLetter = ? WHERE id = ?", [coverLetter || null, id]);

  const vacancyRows = resultsToArray(db.exec("SELECT title, company FROM vacancies WHERE id = ?", [id]));
  const vacancy = vacancyRows[0];

  const actId = `a${Date.now()}`;
  const now = new Date().toISOString();
  db.run("INSERT INTO activity_log (id, type, description, timestamp) VALUES (?, 'apply', ?, ?)", [
    actId, `Отклик отправлен: ${vacancy?.title} — ${vacancy?.company}`, now,
  ]);
  db.run("UPDATE bot_status SET appliedToday = appliedToday + 1, lastActivity = ?", [now]);

  saveDb(db);
  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true };
}

export async function dbSkipVacancy(id: string) {
  const db = await getDb();
  db.run("UPDATE vacancies SET status = 'skipped' WHERE id = ?", [id]);
  saveDb(db);

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true };
}

export async function dbBlacklistVacancy(id: string) {
  const db = await getDb();
  db.run("UPDATE vacancies SET status = 'blacklisted' WHERE id = ?", [id]);
  saveDb(db);

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true };
}

// ===== NEGOTIATIONS =====

export async function dbGetNegotiations() {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT * FROM negotiations ORDER BY lastMessageTime DESC"));

  const negotiations = rows.map((row) => {
    const messages = resultsToArray(
      db.exec("SELECT * FROM negotiation_messages WHERE negotiationId = ? ORDER BY timestamp ASC", [row.id])
    );
    return parseNegotiation(row, messages);
  });

  return negotiations;
}

export async function dbSendMessage(negotiationId: string, text: string, isAutoReply: boolean) {
  const db = await getDb();
  const now = new Date().toISOString();
  const msgId = `m${Date.now()}`;

  db.run(
    "INSERT INTO negotiation_messages (id, negotiationId, sender, text, timestamp, isAutoReply) VALUES (?, ?, ?, ?, ?, ?)",
    [msgId, negotiationId, isAutoReply ? "bot" : "me", text, now, isAutoReply ? 1 : 0]
  );
  db.run("UPDATE negotiations SET lastMessage = ?, lastMessageTime = ? WHERE id = ?", [text, now, negotiationId]);

  saveDb(db);
  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true, messageId: msgId };
}

export async function dbToggleAutoReply(negotiationId: string) {
  const db = await getDb();
  db.run("UPDATE negotiations SET autoReply = CASE WHEN autoReply = 1 THEN 0 ELSE 1 END WHERE id = ?", [negotiationId]);
  saveDb(db);

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true };
}

// ===== STATS =====

export async function dbGetStats() {
  const db = await getDb();

  const totalVacanciesRows = resultsToArray(db.exec("SELECT COUNT(*) as cnt FROM vacancies"));
  const totalVacancies = totalVacanciesRows[0]?.cnt || 0;

  const appliedTodayRows = resultsToArray(db.exec("SELECT appliedToday as cnt FROM bot_status WHERE id = 1"));
  const appliedToday = appliedTodayRows[0]?.cnt || 0;

  const interviewRows = resultsToArray(db.exec("SELECT COUNT(*) as cnt FROM negotiations WHERE status = 'waiting'"));
  const interviewInvites = interviewRows[0]?.cnt || 0;

  const dailyLimitRows = resultsToArray(db.exec("SELECT dailyLimit as cnt FROM bot_status WHERE id = 1"));
  const dailyLimit = dailyLimitRows[0]?.cnt || 50;

  const stats = {
    totalVacancies,
    appliedToday,
    interviewInvites,
    dailyLimitRemaining: dailyLimit - appliedToday,
  };

  const chartData = resultsToArray(db.exec("SELECT * FROM chart_data ORDER BY rowid"));
  const activityLog = resultsToArray(db.exec("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 20"));

  return { stats, chartData, activityLog };
}

// ===== BOT STATUS =====

export async function dbGetBotStatus() {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT * FROM bot_status WHERE id = 1"));
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    ...row,
    isOnline: row.isOnline === 1,
    hhConnected: row.hhConnected === 1,
  };
}

export async function dbReconnectBot() {
  const db = await getDb();
  db.run("UPDATE bot_status SET isOnline = 1, errors = 0 WHERE id = 1");
  saveDb(db);

  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  return { success: true };
}

// ===== SETTINGS =====

export async function dbGetSettings() {
  const db = await getDb();
  const rows = resultsToArray(db.exec("SELECT * FROM settings WHERE id = 1"));
  return rows.length > 0 ? rows[0] : null;
}

export async function dbUpdateSettings(data: Record<string, any>) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ["mode", "careerDirection", "letterTone", "dailyLimit", "searchInterval", "minMatchScore"];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (fields.length > 0) {
    values.push(1);
    db.run(`UPDATE settings SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (data.mode) {
    db.run("UPDATE bot_status SET mode = ? WHERE id = 1", [data.mode]);
  }
  if (data.dailyLimit) {
    db.run("UPDATE bot_status SET dailyLimit = ? WHERE id = 1", [data.dailyLimit]);
  }

  saveDb(db);
  const buf = fs.readFileSync(DB_PATH);
  dbInstance = new (dbInstance!.constructor as any)(buf);

  const settingsRows = resultsToArray(db.exec("SELECT * FROM settings WHERE id = 1"));
  return { success: true, settings: settingsRows[0] || null };
}
