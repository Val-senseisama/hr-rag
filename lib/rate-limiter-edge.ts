import { NextRequest, NextResponse } from "next/server";
import { memoryRateLimit } from "./memory-rate-limiter";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function rateLimit(req: NextRequest): Promise<RateLimitResult> {
  // Edge-safe: do not import ioredis
  return memoryRateLimit(req);
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter: result.retryAfter,
      limit: result.limit,
      remaining: result.remaining
    },
    { status: 429 }
  );
}


