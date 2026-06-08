import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Re-parse resumes from HH.ru
  console.log("[API] Resume sync requested");

  return NextResponse.json({
    success: true,
    syncedAt: new Date().toISOString(),
  });
}
