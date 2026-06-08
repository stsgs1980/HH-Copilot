import { NextResponse } from "next/server";
import { hhSession } from "@/lib/hh-session";

export async function POST() {
  // Reload cookies to "reconnect"
  hhSession.reloadCookies();
  console.log("[API] Bot reconnect requested");

  return NextResponse.json({ success: true });
}
