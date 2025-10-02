import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import connectDB from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    
    const userDoc = await User.findById(user.id).select('-password');
    if (!userDoc) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: { 
        id: userDoc._id, 
        name: userDoc.name, 
        email: userDoc.email, 
        role: userDoc.role, 
        companies: userDoc.companies 
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Get user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { name, password } = await req.json();

    const update: Record<string, unknown> = {};
    if (name) update.name = name;
    if (password) {
      const bcrypt = require("bcrypt");
      const saltRounds = 10;
      update.password = await bcrypt.hash(password, saltRounds);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { message: "No updates provided" },
        { status: 400 }
      );
    }

    const updated = await User.findByIdAndUpdate(user.id, update, { new: true });
    if (!updated) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Profile updated",
      user: { 
        id: updated._id, 
        name: updated.name, 
        email: updated.email 
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Update user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
