import { NextResponse } from "next/server";

// Local blacklist tracking
const blacklistStatuses = new Map<string, "blacklisted">();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  blacklistStatuses.set(id, "blacklisted");

  console.log(`[API] Vacancy ${id} added to blacklist`);
  return NextResponse.json({ success: true, status: "blacklisted" });
}
