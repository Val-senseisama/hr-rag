// models/Company.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  description?: string;
  logo?: string;
  users: mongoose.Types.ObjectId[]; // reverse mapping
  invites: Array<{
    email: string;
    token: string;
    invitedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    invites: [{
      email: { type: String, required: true },
      token: { type: String, required: true },
      invitedAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", CompanySchema);
