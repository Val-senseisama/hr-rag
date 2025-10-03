import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "./CONFIG";

export type JwtRole = {
  company: string;
  read: number;
  create: number;
  update: number;
  delete: number;
};

export type JwtUserPayload = {
  id: string;
  email: string;
  name: string;
  role?: JwtRole[];
};

export function signAccessToken(payload: JwtUserPayload): string {
  if (!CONFIG.JWT_SECRET) throw new Error("JWT_SECRET not set");
  const expiresIn = CONFIG.JWT_EXPIRES_IN || "15m";
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn });
}

export function signRefreshToken(payload: JwtUserPayload): string {
  if (!CONFIG.JWT_SECRET) throw new Error("JWT_SECRET not set");
  const expiresIn = CONFIG.JWT_REFRESH_EXPIRES_IN || "7d";
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn });
}

export function verifyToken<T = any>(token?: string | null): T | null {
  if (!token || !CONFIG.JWT_SECRET) return null;
  try {
    return jwt.verify(token, CONFIG.JWT_SECRET) as T;
  } catch {
    return null;
  }
}

export function getTokensFromRequest(req: NextRequest): {
  accessToken: string | null;
  refreshToken: string | null;
  forceRefresh: string | null;
} {

  const accessFromHeader = req.headers.get("x-access-token") || null;
  const refreshFromHeader = req.headers.get("x-refresh-token") || null;
  const forceRefresh = req.headers.get("x-force-refresh");

  // Also check cookies
  const accessFromCookie = req.cookies.get("x-access-token")?.value || null;
  const refreshFromCookie = req.cookies.get("x-refresh-token")?.value || null;

  return {
    accessToken: accessFromHeader || accessFromCookie || null,
    refreshToken: refreshFromHeader || refreshFromCookie || null,
    forceRefresh: forceRefresh || null,
  };
}

export function setTokensOnResponse(
  res: NextResponse,
  tokens: { accessToken?: string | null; refreshToken?: string | null },
  options?: { clearForceHeader?: boolean }
): NextResponse {
  console.log('🔑 Setting auth tokens on response:', {
    hasAccessToken: !!tokens.accessToken,
    hasRefreshToken: !!tokens.refreshToken,
    clearForceHeader: options?.clearForceHeader,
    responseHeadersSent: res.headersSent || false
  });
  
  // Check if response has already been sent
  if (res.headersSent) {
    console.warn('⚠️ Response headers already sent, skipping token setting');
    return res;
  }
  
  const { accessToken, refreshToken } = tokens;
  
  try {
    if (accessToken) {
      console.log('📝 Setting access token header and cookie');
      res.headers.set("x-access-token", accessToken);
      res.cookies.set("x-access-token", accessToken, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    if (refreshToken) {
      console.log('📝 Setting refresh token header and cookie');
      res.headers.set("x-refresh-token", refreshToken);
      res.cookies.set("x-refresh-token", refreshToken, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    if (options?.clearForceHeader) {
      console.log('📝 Clearing force refresh header');
      res.headers.set("x-force-refresh", "");
    }
    
    console.log('✅ Auth tokens set successfully');
  } catch (error) {
    console.error('❌ Could not set auth headers:', error);
  }

  return res;
}

export function issueNewTokens(
  payload: JwtUserPayload
): { accessToken: string; refreshToken: string } {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

export function decodeUserFromRequest(req: NextRequest): JwtUserPayload | null {
  const { accessToken } = getTokensFromRequest(req);
  return verifyToken<JwtUserPayload>(accessToken);
}

// Auth guard helpers
export function requireAuth(req: NextRequest): JwtUserPayload {
  const user = decodeUserFromRequest(req);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function getOptionalUser(req: NextRequest): JwtUserPayload | null {
  return decodeUserFromRequest(req);
}

// Role-based access control helpers
export function canRead(user: JwtUserPayload, companyId: string): boolean {
  if (!user.role) return false;
  const role = user.role.find(r => r.company === companyId);
  return role ? role.read > 0 : false;
}

export function canCreate(user: JwtUserPayload, companyId: string): boolean {
  if (!user.role) return false;
  const role = user.role.find(r => r.company === companyId);
  return role ? role.create > 0 : false;
}

export function canUpdate(user: JwtUserPayload, companyId: string): boolean {
  if (!user.role) return false;
  const role = user.role.find(r => r.company === companyId);
  return role ? role.update > 0 : false;
}

export function canDelete(user: JwtUserPayload, companyId: string): boolean {
  if (!user.role) return false;
  const role = user.role.find(r => r.company === companyId);
  return role ? role.delete > 0 : false;
}

export function isOwner(user: JwtUserPayload, companyId: string): boolean {
  if (!user.role) return false;
  const role = user.role.find(r => r.company === companyId);
  return role ? role.read === 1 && role.create === 1 && role.update === 1 && role.delete === 1 : false;
}


