import bcrypt from "bcrypt";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { setJwt, setRefreshJwt } from "../middleware/CreateContext.js";
import { sendMail } from "../helpers/SendMail.js";
import generateResetCode from "../helpers/GenerateResetCode.js";
// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email and password are required" });
    }
    const exists = await User.findOne({ email });
    if (exists) {
        return res.status(409).json({ message: "Email already in use" });
    }
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);
    const user = await User.create({ name, email, password: hashed, companies: [] });
    const access = await setJwt(user._id);
    const refresh = await setRefreshJwt(user._id);
    // Send welcome email
    await sendMail({
        to: email,
        subject: "Welcome to ValTech HRBot",
        username: name,
        message: "Your account has been created successfully.",
    });
    return res.status(201).json({
        message: "Registered successfully",
        user: { id: user._id, name: user.name, email: user.email },
        tokens: { access: access.data, refresh: refresh.data },
    });
});
// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const access = await setJwt(user._id);
    const refresh = await setRefreshJwt(user._id);
    return res.status(200).json({
        message: "Login successful",
        user: { id: user._id, name: user.name, email: user.email },
        tokens: { access: access.data, refresh: refresh.data },
    });
});
// GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    console.log("User ID from JWT:", userId);
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await User.findById(userId).select('-password');
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
        user: { id: user._id, name: user.name, email: user.email, role: user.role, companies: user.companies },
    });
});
// PATCH /api/users/me
export const updateUser = asyncHandler(async (req, res) => {
    const userId = req.user?.id; // from middleware
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { name, password } = req.body || {};
    const update = {};
    if (name)
        update.name = name;
    if (password) {
        const saltRounds = 10;
        update.password = await bcrypt.hash(password, saltRounds);
    }
    if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: "No updates provided" });
    }
    const updated = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!updated) {
        return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
        message: "Profile updated",
        user: { id: updated._id, name: updated.name, email: updated.email },
    });
});
// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) {
        return res.status(400).json({ message: "email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
        // Don't reveal account existence
        return res.status(200).json({ message: "If the email exists, a reset link was sent" });
    }
    // Generate 6-character uppercase code and save with expiry (15 min)
    const code = generateResetCode();
    user.resetCode = code;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await sendMail({
        to: email,
        subject: "Your ValTech HRBot password reset code",
        username: user.name,
        message: `Use this code to reset your password: ${code}\nThis code expires in 15 minutes.`,
    });
    return res.status(200).json({ message: "If the email exists, a reset link was sent" });
});
// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "email, code and newPassword are required" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.resetCode || !user.resetCodeExpiresAt) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    const now = new Date();
    if (user.resetCode !== String(code).toUpperCase() || user.resetCodeExpiresAt < now) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    const saltRounds = 10;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.resetCode = null;
    user.resetCodeExpiresAt = null;
    await user.save();
    return res.status(200).json({ message: "Password has been reset successfully" });
});
