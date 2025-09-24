// models/User.ts
import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
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
}, { timestamps: true });
export default mongoose.model("User", UserSchema);
