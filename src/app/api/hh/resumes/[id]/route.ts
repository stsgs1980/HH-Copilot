import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const PARSED_FILE = join(process.cwd(), "download", "output", "parsed_resumes.json");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const raw = await readFile(PARSED_FILE, "utf-8");
    const data = JSON.parse(raw);
    const resume = (data.resumes || []).find((r: any) => String(r.resume_id) === id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }
    return NextResponse.json({ resume });
  } catch {
    return NextResponse.json({ error: "Failed to read resume" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  // TODO: Update resume data — for now just acknowledge
  console.log(`[API] Update resume ${id}:`, Object.keys(body).join(", "));
  return NextResponse.json({ resume: body, message: "Update acknowledged" });
}
