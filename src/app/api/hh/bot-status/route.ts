import { NextResponse } from "next/server";
import { proxyGet } from "@/lib/fastapi-proxy";

// Bot status — proxy to FastAPI which has real DB data
export async function GET() {
  try {
    const data = await proxyGet("/api/bot-status");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API] Error getting bot status:", error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
