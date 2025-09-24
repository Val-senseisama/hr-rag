// models/Company.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  description?: string;
  logo?: string;
  users: mongoose.Types.ObjectId[]; // reverse mapping
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", CompanySchema);
