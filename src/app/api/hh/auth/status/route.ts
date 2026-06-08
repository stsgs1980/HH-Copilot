import { NextResponse } from "next/server";
import { proxyGet } from "@/lib/fastapi-proxy";

export async function GET() {
  try {
    const data = await proxyGet<{ connected: boolean; tokenExpiry: string | null }>("/api/auth/status");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API] Error getting auth status:", error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
