import { NextResponse } from "next/server";
import { hhSession } from "@/lib/hh-session";

// In-memory vacancy status tracking
// In production this would be a database
const vacancyStatuses = new Map<string, "applied" | "skipped" | "blacklisted">();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mark as applied locally
  vacancyStatuses.set(id, "applied");

  // TODO: Real HH.ru application via API
  // POST https://api.hh.ru/negotiations
  // Body: { vacancy_id: id, resume_id: "xxx", message: coverLetter }
  // This requires knowing the user's resume hash for application

  console.log(`[API] Vacancy ${id} marked as applied`);

  return NextResponse.json({ success: true, status: "applied" });
}

// Export for other routes to check status
export { vacancyStatuses };
