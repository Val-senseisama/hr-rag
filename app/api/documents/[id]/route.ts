import { NextRequest, NextResponse } from "next/server";
import Document from "@/models/Document";
import { requireAuth, canUpdate, canDelete } from "@/lib/auth";
export const runtime = 'nodejs';
import connectDB from "@/lib/db";
import { chunkText, embedText, averageVectors } from "@/lib/embeddings";


export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { id } = params;
    const { title, content } = await req.json();

    const existing = await Document.findById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    if (!canUpdate(user, existing.company.toString())) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const update: Record<string, any> = {};
    if (title) update.title = title;
    
    if (typeof content === "string") {
      update.content = content;
      const chunks = chunkText(content.trim(), 2000, 200);
      if (chunks.length <= 1) {
        update.embedding = await embedText(content.trim());
      } else {
        const vectors = await Promise.all(chunks.map(c => embedText(c)));
        update.embedding = averageVectors(vectors);
      }
    }

    const updated = await Document.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json({ 
      message: "Document updated", 
      document: updated 
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Update document error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { id } = params;

    const existing = await Document.findById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    if (!canDelete(user, existing.company.toString())) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // TODO: Delete file if exists
    // if (existing.fileId) {
    //   await deleteFile(existing.fileId as unknown as string);
    // }

    await existing.deleteOne();
    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Delete document error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
