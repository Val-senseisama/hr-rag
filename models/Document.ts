// models/Document.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDocument extends Document {
  title: string;
  content?: string; // plain text (optional)
  fileId?: mongoose.Types.ObjectId; // GridFS file reference
  company: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  embedding?: number[];
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true },

    // Either raw text content OR a file stored in GridFS
    content: { type: String },
    fileId: { type: Schema.Types.ObjectId }, // GridFS _id

    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    embedding: { type: [Number], default: undefined },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>("Document", DocumentSchema);
