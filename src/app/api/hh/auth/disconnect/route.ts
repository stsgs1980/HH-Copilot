import { NextResponse } from "next/server";
import { proxyPost } from "@/lib/fastapi-proxy";

export async function POST() {
  try {
    const data = await proxyPost<{ success: boolean }>("/api/auth/disconnect");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API] Error disconnecting HH.ru:", error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
