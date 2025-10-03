import { NextRequest, NextResponse } from "next/server";
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
