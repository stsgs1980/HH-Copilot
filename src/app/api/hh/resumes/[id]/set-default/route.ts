import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Set default resume in local config
  console.log(`[API] Set resume ${id} as default`);

  return NextResponse.json({ success: true });
}
