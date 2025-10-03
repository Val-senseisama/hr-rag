import { NextRequest, NextResponse } from "next/server";
import Company from "@/models/Company";
import User from "@/models/User";
import { requireAuth, isOwner, setTokensOnResponse } from "@/lib/auth";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { message: "name is required" },
        { status: 400 }
      );
    }

    const exists = await Company.findOne({ name });
    if (exists) {
      return NextResponse.json(
        { message: "Company already exists" },
        { status: 409 }
      );
    }

    const company = await Company.create({ 
      name, 
      description,
      users: [user.id] 
    });

    // Set admin role for the creator
    const adminRole = {
      company: company._id,
      read: 1,
      create: 1,
      update: 1,
      delete: 1
    };

    // Add company to user's companies and set admin role
    const userDoc = await User.findById(user.id);
    if (userDoc) {
      userDoc.companies.push(company._id as unknown as mongoose.Types.ObjectId);
      
      // Remove any existing role for this company and add admin role
      userDoc.role = userDoc.role?.filter((r: any) => String(r.company) !== String(company._id)) || [];
      userDoc.role.push(adminRole);
      
      await userDoc.save();
    }

    // Generate random string for force refresh
    const forceRefreshToken = Math.random().toString(36).substring(2, 18);

    const response = NextResponse.json({ 
      message: "Company created", 
      company: {
        _id: company._id,
        name: company.name,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        createdBy: {
          _id: user.id,
          name: user.name
        },
        members: [{
          _id: user.id,
          name: user.name,
          email: user.email,
          role: [adminRole]
        }]
      }
    }, { status: 201 });

    // Set force refresh header
    try {
      console.log('🔄 Setting force refresh header:', {
        forceRefreshToken,
        headersSent: response.headersSent || false
      });
      
      if (response.headersSent) {
        console.warn('⚠️ Response headers already sent, skipping force refresh header');
      } else {
        response.headers.set("x-force-refresh", forceRefreshToken);
        console.log('✅ Force refresh header set successfully');
      }
    } catch (error) {
      console.error('❌ Could not set force refresh header:', error);
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Create company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '30')));

    const userDoc = await User.findById(user.id).populate({ 
      path: "companies", 
      options: { skip: (page - 1) * limit, limit, sort: { updatedAt: -1 } },
      populate: {
        path: "users",
        select: "name email role"
      }
    });
    
    if (!userDoc) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Transform companies to include createdBy and members
    const companies = userDoc.companies.map((company: any) => {
      // Determine creator as the first user in the company's users array
      const first = company.users?.[0];
      const isDoc = first && typeof first === 'object' && first._id;
      const creatorId = isDoc ? String(first._id) : String(first || '');
      const creatorName = isDoc && first.name ? first.name : 'Unknown';

      return {
        _id: company._id,
        name: company.name,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        createdBy: {
          _id: creatorId,
          name: creatorName
        },
        members: (company.users || []).map((member: any) => ({
          _id: String((member && member._id) || member),
          name: member?.name || 'Unknown',
          email: member?.email || '',
          role: (member?.role || []).filter((r: any) => String(r.company) === String(company._id))
        }))
      };
    });

    // Total count for pagination
    const total = await User.aggregate([
      { $match: { _id: user.id } },
      { $project: { count: { $size: "$companies" } } }
    ]);
    const totalCount = total?.[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json({ 
      companies, 
      meta: { page, limit, total: totalCount, totalPages } 
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Get companies error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
