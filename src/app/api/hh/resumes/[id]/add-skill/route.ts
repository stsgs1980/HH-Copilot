import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const skill = body.skill;

  if (!skill) {
    return NextResponse.json({ error: "Skill is required" }, { status: 400 });
  }

  // TODO: Add skill to resume via HH.ru API
  console.log(`[API] Add skill "${skill}" to resume ${id}`);

  return NextResponse.json({ success: true, skill });
}
