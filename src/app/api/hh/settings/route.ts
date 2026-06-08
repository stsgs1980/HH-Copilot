import { NextResponse } from "next/server";

// In-memory settings store
let appSettings = {
  mode: "semi-auto",
  careerDirection: "Python Developer",
  letterTone: "confident",
  dailyLimit: 50,
  searchInterval: 15,
  minMatchScore: 70,
};

export async function GET() {
  return NextResponse.json({ settings: appSettings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    appSettings = { ...appSettings, ...body };
    return NextResponse.json({ success: true, settings: appSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
