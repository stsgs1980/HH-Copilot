import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const text = body.text;

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // TODO: Send message via HH.ru negotiations API
  // POST https://api.hh.ru/negotiations/{id}/messages
  console.log(`[API] Message to negotiation ${id}: ${text.slice(0, 50)}...`);

  return NextResponse.json({
    success: true,
    messageId: `m-${Date.now()}`,
  });
}
