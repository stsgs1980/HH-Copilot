import { NextResponse } from "next/server";
import { proxyPost } from "@/lib/fastapi-proxy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await proxyPost<{ success: boolean; connected: boolean }>("/api/auth/callback", body);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API] Error in HH.ru OAuth callback:", error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
