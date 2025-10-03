import { NextRequest, NextResponse } from "next/server";
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Rate limit test endpoint",
    timestamp: new Date().toISOString(),
    headers: {
      'X-RateLimit-Limit': req.headers.get('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': req.headers.get('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': req.headers.get('X-RateLimit-Reset'),
    }
  });
}
