import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import User from "@/models/User";
import { issueNewTokens, JwtRole, setTokensOnResponse } from "@/lib/auth";
import connectDB from "@/lib/db";


export async function POST(req: NextRequest) {
  try {
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

    return setTokensOnResponse(response, { accessToken, refreshToken });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
