import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Toggle auto-reply in local settings
  console.log(`[API] Toggled auto-reply for negotiation ${id}`);

  return NextResponse.json({ success: true });
}
