import { NextRequest, NextResponse } from "next/server";
import Company from "@/models/Company";
import User from "@/models/User";
import { requireAuth, canDelete } from "@/lib/auth";
import connectDB from "@/lib/db";
import { sendMail } from "@/lib/email";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { companyId } = params;
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: "Valid email is required" },
        { status: 400 }
      );
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Only owners (delete:1) can invite
    if (!canDelete(user, companyId)) {
      return NextResponse.json(
        { message: "Only company owners can invite users" },
        { status: 403 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // Add to company if not already a member
      const isInCompany = company.users.some((u) => String(u) === String(existingUser._id));
      if (!isInCompany) {
        company.users.push(existingUser._id as mongoose.Types.ObjectId);
        await company.save();
      }

      const hasCompany = existingUser.companies.some((c) => String(c) === String(company._id));
      if (!hasCompany) {
        existingUser.companies.push(company._id as mongoose.Types.ObjectId);
        // Default role: Viewer
        const defaultRole = {
          company: company._id,
          read: 1,
          create: 0,
          update: 0,
          delete: 0,
        };
        existingUser.role = existingUser.role?.filter((r: any) => String(r.company) !== String(companyId)) || [];
        existingUser.role.push(defaultRole);
        await existingUser.save();
      }

      // Send notification email
      try {
        await sendMail({
          to: email,
          subject: `Welcome to ${company.name} on ValTech HRBot`,
          username: existingUser.name,
          message: `You've been added to the company "${company.name}" on ValTech HRBot. You can now access the company's documents and collaborate with your team.`
        });
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({ message: "User added to company and notified" });
    } else {
      // Generate 6-character token for non-existing users
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Add invite to company
      company.invites.push({
        email: email.toLowerCase(),
        token,
        invitedAt: new Date()
      });
      await company.save();

      // Send invite email with token
      try {
        const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const signupUrl = `${appUrl}/register?company=${company._id}&email=${encodeURIComponent(email)}&token=${token}`;
        
        await sendMail({
          to: email,
          subject: `You're invited to join ${company.name} on ValTech HRBot`,
          username: email.split('@')[0], // Use email prefix as username
          message: `You've been invited to join the company "${company.name}" on ValTech HRBot. Use this token to complete your registration: ${token}. Sign up here: ${signupUrl}`
        });
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({ message: "Invitation email sent with token" });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Invite user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
