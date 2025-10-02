// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  companies: mongoose.Types.ObjectId[]; // many-to-many
  role?: Record<string, any>[]; // optional (admin, hr, employee, etc.)
  resetCode?: string | null;
  resetCodeExpiresAt?: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true , select: false},
    companies: [{ type: Schema.Types.ObjectId, ref: "Company" }],
    role: [{ type: {
        company: { type: Schema.Types.ObjectId, ref: "Company" },
        read: { type: Number, default: 0 },
        create: { type: Number, default: 0 },
        update: { type: Number, default: 0 },
        delete: { type: Number, default: 0 },
      },
      default: {
        company: null,
        read: 0,
        create: 0,
        update: 0,
        delete: 0,
      },
    }],
    resetCode: { type: String, default: null },
    resetCodeExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
