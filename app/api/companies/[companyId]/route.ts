import { NextRequest, NextResponse } from "next/server";
import Company from "@/models/Company";
import User from "@/models/User";
import { requireAuth, canUpdate, canDelete } from "@/lib/auth";
import connectDB from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { companyId } = params;
    const { name, description } = await req.json();

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user has update permission for this company
    if (!canUpdate(user, companyId)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId, 
      updateData, 
      { new: true }
    );

    return NextResponse.json({ 
      message: "Company updated", 
      company: updatedCompany 
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Update company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { companyId } = params;

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user has delete permission for this company
    if (!canDelete(user, companyId)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Remove company from users.companies as well
    await User.updateMany(
      { _id: { $in: company.users } },
      { $pull: { companies: company._id } }
    );

    await company.deleteOne();
    return NextResponse.json({ message: "Company deleted" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Delete company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
