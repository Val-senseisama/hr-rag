import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import User from "@/models/User";
import { issueNewTokens, JwtRole, setTokensOnResponse } from "@/lib/auth";
import connectDB from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "email and password are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const { accessToken, refreshToken } = issueNewTokens({
      id: user._id as string,
      email: user.email,
      name: user.name,
      role: user.role as JwtRole[]
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      },
      tokens: { 
        access: accessToken, 
        refresh: refreshToken 
      },
    }, { status: 200 });

    return setTokensOnResponse(response, { accessToken, refreshToken });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
