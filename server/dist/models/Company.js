// models/Company.ts
import mongoose, { Schema } from "mongoose";
const CompanySchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
export default mongoose.model("Company", CompanySchema);
