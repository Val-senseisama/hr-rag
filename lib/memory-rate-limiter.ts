// In-memory rate limiter as fallback when Redis is unavailable
import { NextRequest } from "next/server";

interface MemoryRateLimitEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryRateLimitEntry>();

export interface MemoryRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Rate limit configurations for different endpoint types
const RATE_LIMIT_CONFIGS = {
  chat: { maxRequests: 5, windowSeconds: 60 },
  documents: { maxRequests: 10, windowSeconds: 60 },
  companies: { maxRequests: 15, windowSeconds: 60 },
  users: { maxRequests: 20, windowSeconds: 60 },
  default: { maxRequests: 10, windowSeconds: 60 }
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

export function memoryRateLimit(
  req: NextRequest,
  identifier?: string
): MemoryRateLimitResult {
  console.log('🧠 Memory rate limiter called:', {
    pathname: req.nextUrl?.pathname,
    identifier
  });
  
  const pathname = req.nextUrl?.pathname || '/api/unknown';
  const config = getRateLimitConfig(pathname);
  const now = Date.now();
  
  console.log('🔧 Memory rate limit config:', { pathname, config });
  
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
    console.warn('Error parsing IP from headers in memory limiter:', error);
    ip = "unknown";
  }
  
  const userId = identifier || req.headers.get("x-user-id");
  
  let endpointType = 'api';
  try {
    if (pathname && typeof pathname === 'string' && pathname.length > 0) {
      const parts = pathname.split('/');
      endpointType = parts[2] || 'api';
    }
  } catch (error) {
    console.warn('Error parsing endpoint type from pathname in memory limiter:', error);
    endpointType = 'api';
  }
  
  const key = userId 
    ? `rate_limit:user:${userId}:${endpointType}` 
    : `rate_limit:ip:${ip}:${endpointType}`;
  
  console.log('🔑 Memory rate limit key:', key);
  
  // Clean up expired entries
  for (const [k, v] of memoryStore.entries()) {
    if (v.resetTime < now) {
      memoryStore.delete(k);
    }
  }
  
  // Get or create entry
  let entry = memoryStore.get(key);
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + (config.windowSeconds * 1000)
    };
  }
  
  // Increment counter
  entry.count++;
  memoryStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const isLimited = entry.count > config.maxRequests;
  
  const result = {
    success: !isLimited,
    limit: config.maxRequests,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: isLimited ? config.windowSeconds : undefined
  };
  
  console.log('📊 Memory rate limit result:', result);
  return result;
}
