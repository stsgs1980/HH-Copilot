import { NextResponse } from "next/server";

// Negotiations are not yet connected to HH.ru API
// Return empty for now — will be implemented with real HH.ru negotiations

export async function GET() {
  return NextResponse.json({ negotiations: [] });
}
