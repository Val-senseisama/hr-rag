import { NextRequest, NextResponse } from "next/server";
import Document from "@/models/Document";
import { requireAuth, canCreate } from "@/lib/auth";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { chunkText, embedText, averageVectors } from "@/lib/embeddings";
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { title, content, company, fileBase64, filename, contentType } = await req.json();

    if (!title || !company) {
      return NextResponse.json(
        { message: "title and company are required" },
        { status: 400 }
      );
    }

    if (!canCreate(user, company)) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    let embedding: number[] | undefined = undefined;
    let fileId: mongoose.Types.ObjectId | undefined = undefined;
    let extractedContent: string | undefined = undefined;

    // Check if it's a PDF or DOCX file
    const looksLikePdf = (
      (typeof contentType === 'string' && contentType.toLowerCase().includes('pdf')) ||
      (typeof filename === 'string' && filename.toLowerCase().endsWith('.pdf'))
    );
    const looksLikeDocx = (
      (typeof contentType === 'string' && (
        contentType.toLowerCase().includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
        contentType.toLowerCase().includes('application/msword')
      )) ||
      (typeof filename === 'string' && filename.toLowerCase().endsWith('.docx'))
    );

    // Extract text from PDF
    if (!content && fileBase64 && looksLikePdf) {
      try {
        const { default: pdfParse } = await import('pdf-parse');
        const b64 = String(fileBase64);
        const pure = b64.includes(',') ? b64.split(',').pop() as string : b64;
        const buffer = Buffer.from(pure, 'base64');
        const pdfData: any = await pdfParse(buffer);
        extractedContent = String(pdfData?.text || '').trim();
      } catch (error) {
        console.error("PDF parsing error:", error);
      }
    }

    // Extract text from DOCX
    if (!content && fileBase64 && looksLikeDocx) {
      try {
        const mammoth = await import('mammoth');
        const b64 = String(fileBase64);
        const pure = b64.includes(',') ? b64.split(',').pop() as string : b64;
        const buffer = Buffer.from(pure, 'base64');
        const result: any = await (mammoth as any).extractRawText({ buffer });
        extractedContent = String(result?.value || '').trim();
      } catch (error) {
        console.error("DOCX parsing error:", error);
      }
    }

    // Generate embedding with semantic chunking
    try {
      const textToEmbed =
        (typeof content === "string" && content.trim().length > 0) ? content.trim() :
        (typeof extractedContent === "string" && extractedContent.trim().length > 0) ? extractedContent.trim() :
        String(title || "");
      if (textToEmbed) {
        const chunks = chunkText(textToEmbed, 2000, 200);
        if (chunks.length <= 1) {
          embedding = await embedText(textToEmbed);
        } else {
          const vectors = await Promise.all(chunks.map(c => embedText(c)));
          embedding = averageVectors(vectors);
        }
      }
    } catch (error) {
      console.error("Embedding generation error:", error);
    }

    // TODO: Implement file storage
    // if (fileBase64 && typeof fileBase64 === "string") {
    //   const storedId = await uploadBase64(filename || `${Date.now()}.bin`, fileBase64, contentType);
    //   fileId = storedId as unknown as mongoose.Types.ObjectId;
    // }

    const created = await Document.create({
      title,
      content: (typeof content === 'string' && content.trim().length > 0) ? content : (extractedContent || undefined),
      fileId,
      company: new mongoose.Types.ObjectId(String(company)),
      createdBy: new mongoose.Types.ObjectId(String(user.id)),
      embedding,
    });

    return NextResponse.json({ 
      message: "Document created", 
      document: created 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Create document error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
