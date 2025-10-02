import { NextRequest, NextResponse } from "next/server";
import Company from "@/models/Company";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 }
      );
    }

    // Find company with this token
    const company = await Company.findOne({ 
      "invites.token": token.toUpperCase() 
    });
    
    if (!company) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 404 }
      );
    }

    // Check if user is already in the company
    const isAlreadyMember = company.users.some((u) => String(u) === String(user.id));
    if (isAlreadyMember) {
      return NextResponse.json(
        { message: "You are already a member of this company" },
        { status: 400 }
      );
    }

    // Add user to company
    company.users.push(user.id as unknown as mongoose.Types.ObjectId);
    
    // Remove the used invite
    company.invites = company.invites.filter(invite => invite.token !== token.toUpperCase());
    await company.save();

    // Add company to user's companies
    const userDoc = await User.findById(user.id);
    if (userDoc) {
      userDoc.companies.push(company._id as mongoose.Types.ObjectId);
      
      // Set default role for the new user (read only)
      const defaultRole = {
        company: company._id,
        read: 1,
        create: 0,
        update: 0,
        delete: 0
      };
      
      // Remove any existing role for this company and add default role
      userDoc.role = userDoc.role?.filter((r: any) => String(r.company) !== String(company._id)) || [];
      userDoc.role.push(defaultRole);
      
      await userDoc.save();
    }

    return NextResponse.json({ 
      message: "Successfully joined company", 
      company: {
        _id: company._id,
        name: company.name,
        description: company.description
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Join company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
