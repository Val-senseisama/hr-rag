import { NextRequest, NextResponse } from "next/server";
import Document from "@/models/Document";
import { requireAuth, canRead } from "@/lib/auth";
import connectDB from "@/lib/db";
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { companyId } = params;
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '30')));

    if (!canRead(user, companyId)) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const [items, total] = await Promise.all([
      Document.find({ company: companyId })
        .select("-embedding")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ updatedAt: -1 }),
      Document.countDocuments({ company: companyId })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({ 
      documents: items, 
      meta: { page, limit, total, totalPages } 
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Get documents error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
