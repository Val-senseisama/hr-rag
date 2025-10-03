import { NextRequest, NextResponse } from "next/server";
import redis from "./redis";
import { CONFIG } from "./CONFIG";
import { memoryRateLimit, MemoryRateLimitResult } from "./memory-rate-limiter";

const WINDOW_SIZE_IN_SECONDS = CONFIG.WINDOW_SIZE_IN_SECONDS;
const MAX_REQUESTS = CONFIG.MAX_REQUESTS;

// Rate limit configurations for different endpoint types
const RATE_LIMIT_CONFIGS = {
  // Chat endpoints - more restrictive due to AI processing
  chat: {
    maxRequests: 5,
    windowSeconds: 60,
  },
  // Document operations - moderate limits
  documents: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  // Company operations - moderate limits
  companies: {
    maxRequests: 15,
    windowSeconds: 60,
  },
  // User operations - higher limits
  users: {
    maxRequests: 20,
    windowSeconds: 60,
  },
  // Default for other endpoints
  default: {
    maxRequests: MAX_REQUESTS,
    windowSeconds: WINDOW_SIZE_IN_SECONDS,
  }
};

function getRateLimitConfig(pathname: string) {
  if (!pathname || typeof pathname !== 'string') {
    return RATE_LIMIT_CONFIGS.default;
  }
  
  if (pathname.includes('/chat')) return RATE_LIMIT_CONFIGS.chat;
  if (pathname.includes('/documents')) return RATE_LIMIT_CONFIGS.documents;
  if (pathname.includes('/companies')) return RATE_LIMIT_CONFIGS.companies;
  if (pathname.includes('/users')) return RATE_LIMIT_CONFIGS.users;
  return RATE_LIMIT_CONFIGS.default;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function rateLimit(
  req: NextRequest,
  identifier?: string
): Promise<RateLimitResult> {
  console.log('🔍 Rate limiter called:', {
    pathname: req.nextUrl?.pathname,
    method: req.method,
    identifier,
    redisStatus: redis?.status
  });

  try {
    // Check if Redis is available
    if (!redis || redis.status !== 'ready') {
      console.log('📝 Using memory-based rate limiting (Redis not available)');
      // Redis not available - use memory-based rate limiting
      const memoryResult = memoryRateLimit(req, identifier);
      console.log('📊 Memory rate limit result:', memoryResult);
      return {
        success: memoryResult.success,
        limit: memoryResult.limit,
        remaining: memoryResult.remaining,
        resetTime: memoryResult.resetTime,
        retryAfter: memoryResult.retryAfter
      };
    }

    // Get identifier (user ID or IP)
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    
    let ip = "unknown";
    try {
      if (forwardedFor && typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        const parts = forwardedFor.split(",");
        ip = parts[0]?.trim() || "unknown";
      } else if (realIp && typeof realIp === 'string' && realIp.length > 0) {
        ip = realIp.trim();
      }
    } catch (error) {
      console.warn('Error parsing IP from headers:', error);
      ip = "unknown";
    }
    
    const userId = identifier || req.headers.get("x-user-id");
    const pathname = req.nextUrl?.pathname || '/api/unknown';
    const config = getRateLimitConfig(pathname);
    
    console.log('🔧 Rate limit config:', {
      pathname,
      config,
      ip,
      userId,
      forwardedFor,
      realIp
    });
    
    // Use different keys for different endpoint types
    let endpointType = 'api';
    try {
      if (pathname && typeof pathname === 'string' && pathname.length > 0) {
        const parts = pathname.split('/');
        endpointType = parts[2] || 'api';
      }
    } catch (error) {
      console.warn('Error parsing endpoint type from pathname:', error);
      endpointType = 'api';
    }
    
    const key = userId 
      ? `rate_limit:user:${userId}:${endpointType}` 
      : `rate_limit:ip:${ip}:${endpointType}`;
    
    console.log('🔑 Rate limit key:', key);
    
    // Use pipeline for atomic operations
    console.log('🔄 Executing Redis pipeline...');
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, config.windowSeconds);
    const results = await pipeline.exec();
    
    console.log('📈 Redis pipeline results:', results);
    
    if (!results || results.length < 2) {
      throw new Error("Redis pipeline failed");
    }
    
    const current = results[0][1] as number;
    const remaining = Math.max(0, config.maxRequests - current);
    const resetTime = Date.now() + (config.windowSeconds * 1000);
    
    const isLimited = current > config.maxRequests;
    
    const result = {
      success: !isLimited,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: isLimited ? config.windowSeconds : undefined
    };
    
    console.log('✅ Rate limit result:', result);
    return result;
  } catch (error) {
    console.error('❌ Rate limiter error:', error);
    // Redis error - fall back to memory-based rate limiting
    console.log('🔄 Falling back to memory-based rate limiting');
    const memoryResult = memoryRateLimit(req, identifier);
    console.log('📊 Memory fallback result:', memoryResult);
    return {
      success: memoryResult.success,
      limit: memoryResult.limit,
      remaining: memoryResult.remaining,
      resetTime: memoryResult.resetTime,
      retryAfter: memoryResult.retryAfter
    };
  }
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
