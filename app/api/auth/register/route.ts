import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import User from "@/models/User";
import { issueNewTokens, JwtRole, setTokensOnResponse } from "@/lib/auth";
import connectDB from "@/lib/db";
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const reqId = req.headers.get('x-request-id') || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    console.log(`[auth/register][${reqId}] start`);
    await connectDB();
    
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "name, email and password are required" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 409 }
      );
    }

    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    const user = await User.create({ 
      name, 
      email, 
      password: hashed, 
      companies: [] 
    });

    const { accessToken, refreshToken } = issueNewTokens({
      id: user._id as string,
      email: user.email,
      name: user.name,
      role: user.role as JwtRole[]
    });

    const response = NextResponse.json({
      message: "Registered successfully",
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      },
      tokens: { 
        access: accessToken, 
        refresh: refreshToken 
      },
    }, { status: 201 });
    console.log(`[auth/register][${reqId}] about to set tokens and return 201`);
    const final = setTokensOnResponse(response, { accessToken, refreshToken });
    console.log(`[auth/register][${reqId}] returning response`);
    return final;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
