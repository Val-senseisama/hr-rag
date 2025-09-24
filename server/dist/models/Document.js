// models/Document.ts
import mongoose, { Schema } from "mongoose";
const DocumentSchema = new Schema({
    title: { type: String, required: true },
    // Either raw text content OR a file stored in GridFS
    content: { type: String },
    fileId: { type: Schema.Types.ObjectId }, // GridFS _id
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    embedding: { type: [Number], default: undefined },
}, { timestamps: true });
export default mongoose.model("Document", DocumentSchema);
