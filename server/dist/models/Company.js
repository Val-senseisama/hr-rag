// models/Company.ts
import mongoose, { Schema } from "mongoose";
const CompanySchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    invites: [{
            email: { type: String, required: true },
            token: { type: String, required: true },
            invitedAt: { type: Date, default: Date.now }
        }],
}, { timestamps: true });
export default mongoose.model("Company", CompanySchema);
