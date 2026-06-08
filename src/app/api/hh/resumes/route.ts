import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const PARSED_FILE = join(process.cwd(), "download", "output", "parsed_resumes.json");

export async function GET() {
  try {
    if (!await fileExists(PARSED_FILE)) {
      return NextResponse.json({ resumes: [] });
    }

    const raw = await readFile(PARSED_FILE, "utf-8");
    const data = JSON.parse(raw);

    // Support v5.0 format: { parse_time, version, total_resumes, resumes: [...] }
    const rawResumes = data.resumes || (Array.isArray(data) ? data : []);

    const resumes = rawResumes.map((r: any, idx: number) => ({
      id: String(r.resume_id || `r${idx + 1}`),
      title: r.title || r.position || r.full_name || "Без названия",
      position: r.position || r.title || "",
      skills: r.key_skills || [],
      salary: formatSalary(r.salary),
      salaryFrom: r.salary?.from || 0,
      salaryTo: r.salary?.to || 0,
      currency: r.salary?.currency || "RUR",
      city: r.area_info?.name || r.city || "",
      experience: formatExperience(r.total_experience_months),
      experienceYears: Math.round((r.total_experience_months || 0) / 12 * 10) / 10,
      education: typeof r.education === "string" ? r.education : (Array.isArray(r.education) && r.education.length > 0 ? formatEducation(r.education) : ""),
      about: r.about || r.summary || "",
      lastSync: new Date().toISOString(),
      isDefault: idx === 0,
      experienceEntries: (r.experience || []).map((e: any, ei: number) => ({
        id: `e${idx}_${ei}`,
        company: e.company || "",
        position: e.position || "",
        startDate: e.start_date || "",
        endDate: e.end_date || null,
        description: e.description || "",
      })),
      educationEntries: normalizeEducationEntries(r.education_entries || r.education, idx),
      skillGaps: r.skill_gaps || [],
      matchingVacancies: 0,
      totalVacancies: 0,
    }));

    return NextResponse.json({ resumes });
  } catch (error: any) {
    console.error("[API] Error reading resumes:", error.message);
    return NextResponse.json({ resumes: [] });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Resume ID required" }, { status: 400 });
    // TODO: Persist changes to parsed_resumes.json
    return NextResponse.json({ resume: { id, ...data } });
  } catch (error: any) {
    console.error("[API] Error updating resume:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "sync") {
      // TODO: Re-parse resumes from HH.ru
      console.log("[API] Resume sync requested");
      return NextResponse.json({
        success: true,
        syncedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[API] Error in resume POST:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===== Helpers =====

async function fileExists(path: string): Promise<boolean> {
  try {
    const { access } = await import("fs/promises");
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function formatSalary(salary: any): string {
  if (!salary) return "Не указана";
  const from = salary.from ? salary.from.toLocaleString("ru-RU") : "";
  const to = salary.to ? salary.to.toLocaleString("ru-RU") : "";
  const currency = salary.currency === "RUR" ? "₽" : salary.currency || "";
  if (!from && !to) return "Не указана";
  return `${from || "..."}${from && to ? " – " : ""}${to || "..."} ${currency}`;
}

function formatExperience(months: number | undefined): string {
  if (!months || months === 0) return "Нет опыта";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} мес.`;
  if (remainingMonths === 0) {
    const suffix = years === 1 ? "год" : years < 5 ? "года" : "лет";
    return `${years} ${suffix}`;
  }
  const suffix = years === 1 ? "год" : years < 5 ? "года" : "лет";
  return `${years} ${suffix} ${remainingMonths} мес.`;
}

function formatEducation(education: any[]): string {
  if (!Array.isArray(education) || education.length === 0) return "";
  // Handle array of objects with {organization, name, year} or {institution, degree, year}
  return education.map((ed: any) => {
    const institution = ed.institution || ed.organization || ed.name || "";
    const degree = ed.degree || "";
    const year = ed.year || "";
    if (institution && degree) return `${institution}, ${degree}${year ? ` (${year})` : ""}`;
    return institution || "";
  }).filter(Boolean).join("; ");
}

function normalizeEducationEntries(entries: any, resumeIdx: number): any[] {
  // Handle null, undefined, string, or non-array
  if (!entries || typeof entries === "string" || !Array.isArray(entries)) return [];
  
  return entries.map((ed: any, edi: number) => ({
    id: `ed${resumeIdx}_${edi}`,
    institution: ed.institution || ed.organization || ed.name || "",
    degree: ed.degree || "",
    year: ed.year || "",
  }));
}
