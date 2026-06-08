import { NextResponse } from "next/server";
import { proxyGet } from "@/lib/fastapi-proxy";

export async function GET() {
  try {
    const data = await proxyGet<{ url: string; state: string }>("/api/auth/hh-url");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API] Error getting HH.ru auth URL:", error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
