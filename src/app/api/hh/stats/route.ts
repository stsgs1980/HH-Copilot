import { NextResponse } from "next/server";
import { hhSession } from "@/lib/hh-session";
import { mockDashboardStats, mockChartData, mockActivityLog } from "@/lib/mock-data";

export async function GET() {
  // Return mock stats for now — real stats will come from actual bot activity
  return NextResponse.json({
    stats: {
      ...mockDashboardStats,
      totalVacancies: 0,
      appliedToday: 0,
      interviewInvites: 0,
      dailyLimitRemaining: 20,
    },
    chartData: mockChartData,
    activityLog: mockActivityLog,
  });
}
