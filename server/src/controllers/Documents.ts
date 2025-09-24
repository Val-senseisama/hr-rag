import asyncHandler from "express-async-handler";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import DocumentModel from "../models/Document.js";
import UserModel from "../models/User.js";
import { embedText } from "../helpers/Embed.js";
import { uploadBase64, deleteFile, openDownloadStream } from "../helpers/GridFS.js";

export function hasCompanyPermission(user: any, companyId: string | mongoose.Types.ObjectId, action: keyof { read: number; create: number; update: number; delete: number }) {
  // roles per company (if user.role is array of company-scoped roles)
  const companyObjectId = new mongoose.Types.ObjectId(String(companyId));

  
  const roles = Array.isArray(user.role) ? user.role : [];

  const entry = roles.find((r: any) => String(r.company) === String(companyObjectId));

  if (!entry) return false;
  const value = entry[action];
  return typeof value === "number" && value > 0;
}

// POST /api/documents (text content or base64 file)
export const createDocument = asyncHandler(async (req: any, res: any) => {
  const { title, content, company, fileBase64, filename, contentType } = req.body || {};
  const authUser = (req as any).user;
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });
  if (!title || !company) return res.status(400).json({ message: "title and company are required" });

  if (!hasCompanyPermission(authUser, company, "create")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  let embedding: number[] | undefined = undefined;
  let fileId: mongoose.Types.ObjectId | undefined = undefined;
  let extractedContent: string | undefined = undefined;

  // If PDF uploaded and no explicit text content, extract text from the PDF for storage and embeddings
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

  if (!content && fileBase64 && looksLikePdf) {
    try {
      const { default: pdfParse } = await import('pdf-parse');
      const b64 = String(fileBase64);
      const pure = b64.includes(',') ? b64.split(',').pop() as string : b64;
      const buffer = Buffer.from(pure, 'base64');
      const pdfData: any = await pdfParse(buffer);
      extractedContent = String(pdfData?.text || '').trim();
    } catch {}
  }

  if (!content && fileBase64 && looksLikeDocx) {
    try {
      const mammoth = await import('mammoth');
      const b64 = String(fileBase64);
      const pure = b64.includes(',') ? b64.split(',').pop() as string : b64;
      const buffer = Buffer.from(pure, 'base64');
      const result: any = await (mammoth as any).extractRawText({ buffer });
      extractedContent = String(result?.value || '').trim();
    } catch {}
  }

  // Prefer explicit content, then extracted PDF text, then title for embeddings
  try {
    const textToEmbed =
      (typeof content === "string" && content.trim().length > 0) ? content.trim() :
      (typeof extractedContent === "string" && extractedContent.trim().length > 0) ? extractedContent.trim() :
      String(title || "");
    if (textToEmbed) {
      // Chunk long text and average embeddings so vectors remain representative
      const makeChunks = (text: string, maxLen = 2000): string[] => {
        const parts: string[] = [];
        let buf = '';
        const paras = text.split(/\n{2,}/);
        for (const p of paras) {
          if ((buf + '\n\n' + p).length > maxLen && buf.length > 0) {
            parts.push(buf);
            buf = p;
          } else {
            buf = buf ? (buf + '\n\n' + p) : p;
          }
          while (buf.length > maxLen) {
            parts.push(buf.slice(0, maxLen));
            buf = buf.slice(maxLen);
          }
        }
        if (buf) parts.push(buf);
        return parts.filter(Boolean);
      };
      const chunks = makeChunks(textToEmbed);
      if (chunks.length <= 1) {
        embedding = await embedText(textToEmbed);
      } else {
        const vectors = await Promise.all(chunks.map(c => embedText(c)));
        const dim = vectors[0]?.length || 0;
        const sum = new Array(dim).fill(0);
        for (const v of vectors) for (let i = 0; i < dim; i++) sum[i] += v[i] || 0;
        embedding = sum.map(x => x / vectors.length);
      }
    }
  } catch {}

  if (fileBase64 && typeof fileBase64 === "string") {
    const storedId = await uploadBase64(filename || `${Date.now()}.bin`, fileBase64, contentType);
    fileId = storedId as unknown as mongoose.Types.ObjectId;
  }

  const created = await DocumentModel.create({
    title,
    content: (typeof content === 'string' && content.trim().length > 0) ? content : (extractedContent || undefined),
    fileId,
    company: new mongoose.Types.ObjectId(String(company)),
    createdBy: new mongoose.Types.ObjectId(String(authUser._id || authUser.id)),
    embedding,
  });

  return res.status(201).json({ message: "Document created", document: created });
});

// GET /api/companies/:companyId/documents
export const listCompanyDocuments = asyncHandler(async (req: any, res: any) => {
  const { companyId } = req.params;
  const page = Math.max(1, parseInt(String((req.query.page as string) || '1')));
  const limit = Math.max(1, Math.min(100, parseInt(String((req.query.limit as string) || '0')))) || (Number(process.env.PAGINATION_LIMIT) || 30);
  const skip = (page - 1) * limit;
  const authUser = (req as any).user;
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });
  if (!hasCompanyPermission(authUser, companyId, "read")) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const [items, total] = await Promise.all([
    DocumentModel.find({ company: companyId }).select("-embedding").skip(skip).limit(limit).sort({ updatedAt: -1 }),
    DocumentModel.countDocuments({ company: companyId })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return res.status(200).json({ documents: items, meta: { page, limit, total, totalPages } });
});

// PATCH /api/documents/:id
export const updateDocument = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { title, content } = req.body || {};
  const authUser = (req as any).user;
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const existing = await DocumentModel.findById(id);
  if (!existing) return res.status(404).json({ message: "Document not found" });
  if (!hasCompanyPermission(authUser, existing.company, "update")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const update: Record<string, any> = {};
  if (title) update.title = title;
  if (typeof content === "string") {
    update.content = content;
    const makeChunks = (text: string, maxLen = 2000): string[] => {
      const parts: string[] = [];
      let buf = '';
      const paras = text.split(/\n{2,}/);
      for (const p of paras) {
        if ((buf + '\n\n' + p).length > maxLen && buf.length > 0) {
          parts.push(buf);
          buf = p;
        } else {
          buf = buf ? (buf + '\n\n' + p) : p;
        }
        while (buf.length > maxLen) {
          parts.push(buf.slice(0, maxLen));
          buf = buf.slice(maxLen);
        }
      }
      if (buf) parts.push(buf);
      return parts.filter(Boolean);
    };
    const chunks = makeChunks(content.trim());
    if (chunks.length <= 1) {
      update.embedding = await embedText(content.trim());
    } else {
      const vectors = await Promise.all(chunks.map(c => embedText(c)));
      const dim = vectors[0]?.length || 0;
      const sum = new Array(dim).fill(0);
      for (const v of vectors) for (let i = 0; i < dim; i++) sum[i] += v[i] || 0;
      update.embedding = sum.map(x => x / vectors.length);
    }
  }

  const updated = await DocumentModel.findByIdAndUpdate(id, update, { new: true });
  return res.status(200).json({ message: "Document updated", document: updated });
});

// DELETE /api/documents/:id
export const deleteDocument = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const authUser = (req as any).user;
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const existing = await DocumentModel.findById(id);
  if (!existing) return res.status(404).json({ message: "Document not found" });
  if (!hasCompanyPermission(authUser, existing.company, "delete")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (existing.fileId) {
    await deleteFile(existing.fileId as unknown as string);
  }
  await existing.deleteOne();
  return res.status(200).json({ message: "Document deleted" });
});

// GET /api/documents/:id/file
export const downloadDocumentFile = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const authUser = (req as any).user;
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const existing = await DocumentModel.findById(id);
  if (!existing || !existing.fileId) return res.status(404).json({ message: "File not found" });
  if (!hasCompanyPermission(authUser, existing.company, "read")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const stream = openDownloadStream(existing.fileId as unknown as string);
  stream.on("error", () => res.status(404).end());
  stream.pipe(res);
});


