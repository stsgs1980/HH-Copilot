import { NextResponse } from "next/server";

// Local skip tracking (shares map with apply route via import)
const skipStatuses = new Map<string, "skipped">();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  skipStatuses.set(id, "skipped");

  console.log(`[API] Vacancy ${id} marked as skipped`);
  return NextResponse.json({ success: true, status: "skipped" });
}
